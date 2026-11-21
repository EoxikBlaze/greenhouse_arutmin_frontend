#include "Komunikasi.h"
#include "Config.h"
#include "Aktuator.h"
#include "rahasia.h"
#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <HTTPClient.h>
#include <Update.h>
#include "mbedtls/sha256.h"
#include "Penyimpanan.h"
#include <time.h>
#include <math.h>
#include <string.h>

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif
#ifndef HTTP_PORT
#define HTTP_PORT 80
#endif
#ifndef ID_MEJA
#define ID_MEJA 0
#endif
#ifndef SERVER_IP
#define SERVER_IP ""
#endif
#ifndef API_KEY_AKTUATOR
#define API_KEY_AKTUATOR ""
#endif
#ifndef OTA_PASSWORD
#define OTA_PASSWORD ""             /* kosong / < 8 karakter = OTA lokal MATI */
#endif
static const bool ADA_OTA_LOKAL = (sizeof(OTA_PASSWORD) > 8);
static const uint16_t PORT_OTA = 3232;

#define TOPIK_DASAR "garap/" KODE_PERANGKAT
static const char *T_DATA     = TOPIK_DASAR "/data";
static const char *T_STATUS   = TOPIK_DASAR "/status";
static const char *T_PERINTAH = TOPIK_DASAR "/perintah";
static const char *T_HASIL    = TOPIK_DASAR "/hasil";
static const char *T_ACK      = TOPIK_DASAR "/ack";
static const char *T_SERVER   = "garap/server/status";

/* Daftar WiFi dari rahasia.h (format sama dengan firmware tim) */
struct Jaringan { const char *ssid; const char *pass; };
#ifndef WIFI_JARINGAN
#define WIFI_JARINGAN { { WIFI_SSID, WIFI_PASS } }
#endif
static const Jaringan JARINGAN[] = WIFI_JARINGAN;
static const IPAddress IP_HOTSPOT_PI(10, 42, 0, 1);
static const char *NAMA_MDNS[3] = { "garap", "vertonik", "vertonic" };

static WiFiMulti    wifiMulti;
static WiFiClient   klienWifi;
static PubSubClient mqtt(klienWifi);

static SemaphoreHandle_t mutex = NULL;
static StatusSistem statusBersama;
static bool         statusAda = false;
static QueueHandle_t antrianPerintah = NULL;
static QueueHandle_t antrianLaporan  = NULL;

static volatile bool wifiOk = false, mqttOk = false;
static volatile int  rssiNilai = 0;
static volatile uint32_t tDetak = 0;          /* millis detak online terakhir, 0 = belum */
static volatile bool detakEstop = false;
static volatile bool kunciEstop = false, kunciLihatTrue = false;
static volatile uint32_t tKunci = 0;
static volatile bool mintaTelemetri = false;
static volatile bool mintaCari = false, mintaPindai = false;
static volatile bool cetakMqtt = false;
static volatile int  jumlahTertunda = 0;

/* permintaan dari serial (disalin di bawah mutex) */
static volatile bool mintaWifi = false, mintaServer = false;
static char mintaSsid[33], mintaPass[65], mintaIp[20];

/* info untuk LCD/serial */
static char infoWifi[33] = "", infoIpEsp[16] = "", infoIpServer[16] = "";

static IPAddress serverIp;
static uint8_t   gagalMqtt = 0;
static String    nvsSsid, nvsPass, nvsServer;

struct Tertunda {
  uint64_t id;
  uint32_t tKirim;
  uint16_t panjang;
  char     isi[1400];             /* cukup untuk keluaran KONSOL (buffer MQTT 1536) */
};
static Tertunda tertunda[MAKS_LAPORAN_TERTUNDA];

/* ---- OTA ---- */
static volatile bool    izinOtaLokal = false, izinOtaJauh = false;
static volatile bool    otaJalan = false;
static volatile uint8_t otaPersen = 0;
static volatile uint64_t otaJalankanId = 0;     /* diisi loop utama setelah izin & id dicek */
struct PermintaanOta {
  uint64_t id;
  char     path[128];
  char     sha[65];
};
static PermintaanOta otaSimpan;                 /* hanya disentuh task komunikasi */
static volatile bool otaSimpanAda = false;
static bool mdnsMulai = false;

/* ---- konsol ---- */
static Print *tangkapKonsol = NULL;             /* hanya dipakai di loop utama */

/* ===========================================================================
 *  ANTARMUKA LOOP UTAMA
 * ========================================================================= */
bool WifiTerhubung(void) { return wifiOk; }
bool MqttTerhubung(void) { return mqttOk; }
int  RssiWifi(void)      { return rssiNilai; }
int  JumlahLaporanTertunda(void) { return jumlahTertunda; }
void MintaTelemetriSekarang(void) { mintaTelemetri = true; }
void MintaCariServer(void) { mintaCari = true; }
void MintaPindaiWifi(void) { mintaPindai = true; }
void CetakMqtt(bool aktif) { cetakMqtt = aktif; }
void TetapkanTangkapKonsol(Print *p) { tangkapKonsol = p; }

void TetapkanIzinOta(bool lokal, bool jauh)
{
  izinOtaLokal = lokal;
  izinOtaJauh = jauh;
}

bool OtaBerjalan(void) { return otaJalan; }
uint8_t PersenOta(void) { return otaPersen; }

bool SiapkanOtaJauh(uint64_t id)
{
  /* otaSimpan ditulis task komunikasi SEBELUM perintah masuk antrian, jadi aman dibaca di sini */
  if (!otaSimpanAda || otaSimpan.id != id || !izinOtaJauh || otaJalan) {
    return false;
  }
  otaJalankanId = id;
  return true;
}

bool ServerSegar(void)
{
  uint32_t t = tDetak;
  return t != 0 && mqttOk && (uint32_t)(millis() - t) <= DETAK_SERVER_MAKS_MS;
}

bool EstopDariServer(void)
{
  return kunciEstop || (ServerSegar() && detakEstop);
}

void BagikanStatus(const StatusSistem &s)
{
  if (mutex != NULL && xSemaphoreTake(mutex, 0) == pdTRUE) {
    statusBersama = s;
    statusAda = true;
    xSemaphoreGive(mutex);
  }
}

bool AmbilPerintah(PerintahWeb *p)
{
  return antrianPerintah != NULL && xQueueReceive(antrianPerintah, p, 0) == pdTRUE;
}

void KirimLaporan(const Laporan &l)
{
  /* tangkapan konsol hanya dari loop utama (core 1); laporan dari task komunikasi cukup ke Serial */
  Print *t = (xPortGetCoreID() == 1) ? tangkapKonsol : NULL;
  Print *tujuan[2] = { &Serial, t };
  for (Print *o : tujuan) {
    if (o == NULL) {
      continue;
    }
    o->printf("[hasil] #%llu %s %s", (unsigned long long)l.id, l.selesai ? "selesai" : "gagal", l.alasan);
    for (int i = 0; i < l.nEkstra && i < MAKS_EKSTRA_LAPORAN; i++) {
      o->printf("  %s=%.4g", l.kunci[i], (double)l.nilai[i]);   /* mis. tegangan=0.8514 acuan=1.413 */
    }
    o->println();
  }
  if (l.id != 0 && antrianLaporan != NULL) {
    xQueueSend(antrianLaporan, &l, pdMS_TO_TICKS(20));
  }
}

void InfoJaringan(char *wifi, size_t nw, char *ipEsp, size_t ne, char *ipServer, size_t ns)
{
  if (mutex != NULL && xSemaphoreTake(mutex, pdMS_TO_TICKS(20)) == pdTRUE) {
    snprintf(wifi, nw, "%s", infoWifi);
    snprintf(ipEsp, ne, "%s", infoIpEsp);
    snprintf(ipServer, ns, "%s", infoIpServer);
    xSemaphoreGive(mutex);
  } else {
    snprintf(wifi, nw, "-");
    snprintf(ipEsp, ne, "-");
    snprintf(ipServer, ns, "-");
  }
}

void AturWifiTambahan(const char *ssid, const char *pass)
{
  if (mutex != NULL && xSemaphoreTake(mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    snprintf(mintaSsid, sizeof(mintaSsid), "%s", ssid ? ssid : "");
    snprintf(mintaPass, sizeof(mintaPass), "%s", pass ? pass : "");
    mintaWifi = true;
    xSemaphoreGive(mutex);
  }
}

void AturServerTetap(const char *ip)
{
  if (mutex != NULL && xSemaphoreTake(mutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    snprintf(mintaIp, sizeof(mintaIp), "%s", ip ? ip : "");
    mintaServer = true;
    xSemaphoreGive(mutex);
  }
}

/* ===========================================================================
 *  JSON
 * ========================================================================= */
static void AngkaJika(JsonDocument &d, const char *kunci, bool ada, float v, int desimal)
{
  if (!ada || !isfinite(v)) {
    return;            /* sensor gagal: field DIHILANGKAN, jangan kirim angka palsu */
  }
  float k = powf(10.0f, (float)desimal);
  d[kunci] = roundf(v * k) / k;
}

static long IdMeja(const StatusSistem &s)
{
  if (s.param.idMeja >= 1.0f) {
    return (long)s.param.idMeja;
  }
  return (long)ID_MEJA;
}

static size_t BuatData(const StatusSistem &s, char *buf, size_t n)
{
  JsonDocument d;
  const SnapshotSensor &x = s.sensor;
  /* 5 field utama yang disimpan backend (nama sama dengan firmware tim) */
  AngkaJika(d, "waterTemp", x.suhuAirValid, x.suhuAir, 1);
  AngkaJika(d, "airTemp", x.udaraValid, x.suhuUdara, 1);
  AngkaJika(d, "humidity", x.udaraValid, x.kelembaban, 1);
  AngkaJika(d, "ph", x.phValid, x.ph, 2);
  AngkaJika(d, "tds", x.ecValid, x.ppm, 0);                 /* tds = ppm */
  /* tambahan */
  AngkaJika(d, "ec", x.ecValid, x.ecMs, 3);                  /* mS/cm */
  AngkaJika(d, "ph_volt", isfinite(x.phVolt), x.phVolt, 4);  /* dipakai web untuk kalibrasi pH */
  AngkaJika(d, "ec_volt", isfinite(x.ecVolt), x.ecVolt, 4);
  long meja = IdMeja(s);
  if (meja >= 1) {
    d["id_meja"] = meja;
  }
  d["level_air"] = NamaLevel(s.level);
  d["float_bawah_rendah"] = !s.floatBawahNaik;
  d["float_atas_penuh"] = s.floatAtasNaik;
  d["pompa_isi"] = s.bebanNyala[BEBAN_ISI];
  /* v6.4: status tiap relay pompa untuk panel "Status pompa" di web */
  d["pompa_a"] = s.bebanNyala[BEBAN_POMPA_A];
  d["pompa_b"] = s.bebanNyala[BEBAN_POMPA_B];
  d["pompa_ph_up"] = s.bebanNyala[BEBAN_PH_UP];
  d["pompa_ph_down"] = s.bebanNyala[BEBAN_PH_DOWN];
  d["estop"] = s.estopFisik || s.estopServer || s.tungguReset;
  d["mode"] = NamaMode(s.mode);
  d["siap"] = s.siap;
  if (!s.siap) {
    d["kurang"] = s.kurang;
  }
  d["pemeliharaan"] = s.pemeliharaan;
  d["kegiatan"] = NamaKegiatan(s.kegiatan);
  d["kunci"] = NamaKunci(s);
  d["ppm_terlalu_rendah"] = s.ppmTerlaluRendah;
  d["nutrisi_habis"] = s.nutrisiHabis;           /* v6.2: kenaikan ppm < 30% harapan 2x berturut */
  d["ota_berjalan"] = s.otaBerjalan;             /* v6.2: program sedang diperbarui */
  if (s.otaBerjalan) {
    d["ota_persen"] = s.otaPersen;
  }
  if (s.targetPpm > 0) {
    d["target_ppm"] = roundf(s.targetPpm);
  }
  if (s.phMax > 0) {
    d["ph_min"] = s.phMin;
    d["ph_max"] = s.phMax;
  }
  if (s.hariSemai > 0) {
    d["hari_semai"] = s.hariSemai;
  }
  d["dosing_ab_hari"] = s.abHari;
  d["dosing_ph_hari"] = s.phHari;
  d["encer_hari"] = s.encerHari;
  d["isi_hari"] = s.isiHari;
  d["otomasi_ab"] = (s.otomasi & OTO_AB) != 0;
  d["otomasi_ph"] = (s.otomasi & OTO_PH) != 0;
  d["otomasi_encer"] = (s.otomasi & OTO_ENCER) != 0;
  d["otomasi_isi"] = (s.otomasi & OTO_ISI) != 0;
  d["rssi"] = s.rssi;
  d["firmware"] = NAMA_FIRMWARE;
  d["uptime"] = s.uptimeDtk;
  size_t len = serializeJson(d, buf, n);
  return (len > 0 && len < n) ? len : 0;
}

static size_t BuatStatus(const StatusSistem *s, char *buf, size_t n)
{
  JsonDocument d;
  d["online"] = true;
  d["firmware"] = NAMA_FIRMWARE;
  d["rssi"] = (int)rssiNilai;
  d["uptime"] = millis() / 1000UL;
  if (s != NULL) {
    d["estop"] = s->estopFisik || s->estopServer || s->tungguReset;
    d["float_bawah_rendah"] = !s->floatBawahNaik;
    d["float_atas_penuh"] = s->floatAtasNaik;
  } else {
    d["estop"] = EstopAktif();
  }
  size_t len = serializeJson(d, buf, n);
  return (len > 0 && len < n) ? len : 0;
}

static size_t BuatLaporan(const Laporan &l, char *buf, size_t n)
{
  JsonDocument d;
  d["id"] = (double)l.id;
  d["status"] = l.selesai ? "selesai" : "gagal";
  JsonObject h = d["hasil"].to<JsonObject>();
  h["alasan"] = l.alasan;
  for (int i = 0; i < l.nEkstra && i < MAKS_EKSTRA_LAPORAN; i++) {
    if (isfinite(l.nilai[i])) {
      h[l.kunci[i]] = l.nilai[i];
    } else {
      h[l.kunci[i]] = nullptr;
    }
  }
  h["firmware"] = NAMA_FIRMWARE;
  if (l.keluaran[0]) {
    h["keluaran"] = l.keluaran;                  /* teks hasil perintah KONSOL */
  }
  size_t len = serializeJson(d, buf, n);
  return (len > 0 && len < n) ? len : 0;
}

static TipePerintah TipeDariTeks(const char *t)
{
  static const struct { const char *nama; TipePerintah tipe; } PETA[] = {
    { "STOP", P_STOP }, { "STOP_DARURAT", P_STOP_DARURAT }, { "ISI_AIR", P_ISI_AIR },
    { "UJI_POMPA", P_UJI_POMPA }, { "DOSIS", P_DOSIS }, { "KALIBRASI", P_KALIBRASI },
    { "BALIK_KALIBRASI", P_BALIK_KALIBRASI }, { "KAL_SENSOR", P_KAL_SENSOR },
    { "KONFIGURASI", P_KONFIGURASI }, { "SEMAI", P_SEMAI }, { "TARGET", P_TARGET },
    { "PANEN", P_PANEN }, { "PEMELIHARAAN", P_PEMELIHARAAN }, { "BUKA_KUNCI", P_BUKA_KUNCI }, { "OTOMASI", P_OTOMASI },
    { "STATUS", P_STATUS }, { "OTA", P_OTA }, { "KONSOL", P_KONSOL },
  };
  for (size_t i = 0; i < sizeof(PETA) / sizeof(PETA[0]); i++) {
    if (strcmp(t, PETA[i].nama) == 0) {
      return PETA[i].tipe;
    }
  }
  return P_TIDAK_DIKENAL;
}

/* Mengembalikan false bila tidak punya id yang sah (tidak bisa dilaporkan) */
static bool UraiPerintah(const char *json, size_t panjang, PerintahWeb *p)
{
  memset(p, 0, sizeof(*p));
  JsonDocument d;
  if (deserializeJson(d, json, panjang) != DeserializationError::Ok || !d.is<JsonObject>()) {
    return false;
  }
  JsonVariantConst vid = d["id"];
  double idAngka = 0;
  if (vid.is<double>() || vid.is<long>()) {
    idAngka = vid.as<double>();
  } else if (vid.is<const char *>()) {
    idAngka = atof(vid.as<const char *>());
  }
  if (!(idAngka >= 1.0 && idAngka <= 9.0e15 && floor(idAngka) == idAngka)) {
    return false;
  }
  p->id = (uint64_t)idAngka;
  const char *tipe = d["tipe"] | "";
  snprintf(p->tipeTeks, sizeof(p->tipeTeks), "%s", tipe);
  p->tipe = TipeDariTeks(p->tipeTeks);
  JsonVariantConst vexp = d["exp"];
  if (vexp.is<double>() || vexp.is<long>()) {
    double e = vexp.as<double>();
    if (e > 1.6e9 && e < 4.2e9) {
      p->adaExp = true;
      p->exp = (uint32_t)e;
    }
  }
  JsonObjectConst par = d["parameter"].as<JsonObjectConst>();
  if (!par.isNull()) {
    for (JsonPairConst kv : par) {
      const char *k = kv.key().c_str();
      JsonVariantConst v = kv.value();
      if (v.is<bool>()) {
        if (p->nAngka < MAKS_ANGKA_PERINTAH) {
          snprintf(p->kunciAngka[p->nAngka], sizeof(p->kunciAngka[0]), "%s", k);
          p->angka[p->nAngka++] = v.as<bool>() ? 1.0f : 0.0f;
        }
      } else if (v.is<double>() || v.is<long>()) {
        if (p->nAngka < MAKS_ANGKA_PERINTAH) {
          snprintf(p->kunciAngka[p->nAngka], sizeof(p->kunciAngka[0]), "%s", k);
          p->angka[p->nAngka++] = v.as<float>();
        }
      } else if (v.is<const char *>()) {
        const char *s = v.as<const char *>();
        char *akhir = NULL;
        double angka = strtod(s, &akhir);
        if (akhir != s && akhir != NULL && *akhir == 0 && p->nAngka < MAKS_ANGKA_PERINTAH) {
          /* angka yang dikirim sebagai teks ("12.5") tetap diterima sebagai angka */
          snprintf(p->kunciAngka[p->nAngka], sizeof(p->kunciAngka[0]), "%s", k);
          p->angka[p->nAngka++] = (float)angka;
        }
        if (p->nTeks < MAKS_TEKS_PERINTAH) {
          snprintf(p->kunciTeks[p->nTeks], sizeof(p->kunciTeks[0]), "%s", k);
          snprintf(p->teks[p->nTeks], sizeof(p->teks[0]), "%s", s);
          p->nTeks++;
        }
      }
    }
  }
  return true;
}

/* ===========================================================================
 *  TASK JARINGAN
 * ========================================================================= */
static bool Publikasi(const char *topik, const char *isi, size_t panjang, bool retain)
{
  bool ok = mqtt.publish(topik, (const uint8_t *)isi, panjang, retain);
  if (cetakMqtt) {
    Serial.printf("[mqtt>] %s%s %.*s\n", topik, retain ? " (retain)" : "", (int)(panjang > 240 ? 240 : panjang), isi);
  }
  return ok;
}

static void KirimSinkronJam(uint32_t epochUtc)
{
  PerintahWeb p;
  memset(&p, 0, sizeof(p));
  p.id = 0;
  p.tipe = P_SINKRON_JAM;
  p.adaExp = true;
  p.exp = epochUtc;
  xQueueSend(antrianPerintah, &p, 0);
}

static void TerimaDetak(const char *muatan, size_t panjang)
{
  JsonDocument d;
  if (deserializeJson(d, muatan, panjang) != DeserializationError::Ok) {
    return;
  }
  if (!d["online"].is<bool>()) {
    return;
  }
  if (!d["online"].as<bool>()) {
    tDetak = 0;                    /* LWT server: server mati */
    return;
  }
  uint32_t now = millis();
  tDetak = now ? now : 1;
  bool es = d["estop"] | false;
  detakEstop = es;
  if (kunciEstop) {
    if (es) {
      kunciLihatTrue = true;
    } else if (kunciLihatTrue || (uint32_t)(now - tKunci) > 15000UL) {
      kunciEstop = false;          /* admin sudah membuka E-STOP di web */
    }
  }
  JsonVariantConst ts = d["ts"];
  if (ts.is<double>() || ts.is<long>()) {
    double e = ts.as<double>();
    static uint32_t tSinkron = 0;
    if (e > 1.7e9 && e < 4.2e9 && (tSinkron == 0 || (uint32_t)(now - tSinkron) > 3600000UL)) {
      tSinkron = now ? now : 1;
      KirimSinkronJam((uint32_t)e);
    }
  }
}

static void HapusTertunda(uint64_t id)
{
  for (int i = 0; i < MAKS_LAPORAN_TERTUNDA; i++) {
    if (tertunda[i].id == id) {
      tertunda[i].id = 0;
      if (jumlahTertunda > 0) { jumlahTertunda = jumlahTertunda - 1; }
    }
  }
}

/* OTA jauh: simpan path & sha256 (terlalu panjang untuk PerintahWeb). Divalidasi ketat:
   path hanya berkas di server Pi (huruf, angka, / _ . -, tanpa ".."), sha256 = 64 heksadesimal. */
static void SimpanPermintaanOta(const char *json, size_t panjang, uint64_t id)
{
  otaSimpanAda = false;
  JsonDocument d;
  if (deserializeJson(d, json, panjang) != DeserializationError::Ok) {
    return;
  }
  const char *path = d["parameter"]["path"] | "";
  const char *sha = d["parameter"]["sha256"] | "";
  size_t np = strlen(path);
  if (np < 2 || np >= sizeof(otaSimpan.path) || path[0] != '/' || strstr(path, "..") != NULL ||
      strlen(sha) != 64) {
    return;
  }
  for (size_t i = 0; i < np; i++) {
    char c = path[i];
    if (!(isalnum((unsigned char)c) || c == '/' || c == '_' || c == '.' || c == '-')) {
      return;
    }
  }
  for (size_t i = 0; i < 64; i++) {
    if (!isxdigit((unsigned char)sha[i])) {
      return;
    }
    otaSimpan.sha[i] = (char)tolower((unsigned char)sha[i]);
  }
  otaSimpan.sha[64] = 0;
  snprintf(otaSimpan.path, sizeof(otaSimpan.path), "%s", path);
  otaSimpan.id = id;
  otaSimpanAda = true;
}

static void SaatPesan(char *topik, uint8_t *isi, unsigned int panjang)
{
  if (cetakMqtt) {
    Serial.printf("[mqtt<] %s %.*s\n", topik, (int)(panjang > 240 ? 240 : panjang), (const char *)isi);
  }
  if (panjang == 0 || panjang > 1400) {
    return;
  }
  if (strcmp(topik, T_SERVER) == 0) {
    TerimaDetak((const char *)isi, panjang);
  } else if (strcmp(topik, T_ACK) == 0) {
    JsonDocument d;
    if (deserializeJson(d, (const char *)isi, panjang) == DeserializationError::Ok) {
      double id = d["id"] | 0.0;
      if (id >= 1.0) {
        HapusTertunda((uint64_t)id);
      }
    }
  } else if (strcmp(topik, T_PERINTAH) == 0) {
    PerintahWeb p;
    if (!UraiPerintah((const char *)isi, panjang, &p)) {
      return;
    }
    if (p.tipe == P_STOP_DARURAT) {
      /* seketika, tanpa menunggu loop utama */
      kunciEstop = true;
      kunciLihatTrue = false;
      tKunci = millis();
      TetapkanEstopServer(true);
      MatikanDaruratRaw();
    }
    if (p.tipe == P_OTA && !otaJalan) {
      SimpanPermintaanOta((const char *)isi, panjang, p.id);
    }
    if (xQueueSend(antrianPerintah, &p, pdMS_TO_TICKS(50)) != pdTRUE) {
      Serial.println("[!] antrian perintah penuh, perintah dibuang (server akan mengirim ulang)");
    }
  }
}

static void MuatJaringanNvs(void)
{
  Preferences p;
  if (p.begin("garap_net", true)) {       /* namespace sama dengan firmware tim */
    nvsSsid = p.getString("ssid", "");
    nvsPass = p.getString("pass", "");
    nvsServer = p.getString("srv", "");
    p.end();
  }
}

static bool CekPort(const IPAddress &ip, uint16_t port, uint16_t timeoutMs)
{
  if ((uint32_t)ip == 0) {
    return false;
  }
  WiFiClient c;
  bool ok = c.connect(ip, port, timeoutMs);
  c.stop();
  return ok;
}

static IPAddress ProbeSubnet(void)
{
  IPAddress kand[24];
  int n = 0;
  IPAddress lokal = WiFi.localIP(), gw = WiFi.gatewayIP();
  auto tambah = [&](const IPAddress &a) {
    if ((uint32_t)a == 0 || a == lokal || a == gw) {
      return;
    }
    for (int i = 0; i < n; i++) {
      if (kand[i] == a) {
        return;
      }
    }
    if (n < 24) {
      kand[n++] = a;
    }
  };
  IPAddress ipDef;
  bool adaDef = ipDef.fromString(SERVER_IP);
  if (adaDef && ipDef[0] == lokal[0] && ipDef[1] == lokal[1] && ipDef[2] == lokal[2]) {
    tambah(ipDef);
  }
  if (lokal[0] == 172 && lokal[1] == 20 && lokal[2] == 10) {
    for (uint8_t h = 2; h <= 14; h++) { tambah(IPAddress(172, 20, 10, h)); }
  } else if ((lokal[0] == 192 && lokal[1] == 168) || lokal[0] == 10) {
    const uint8_t tetap[] = { 50, 100, 101, 172, 200 };
    for (uint8_t h : tetap) { tambah(IPAddress(lokal[0], lokal[1], lokal[2], h)); }
    for (uint8_t h = 2; h <= 15; h++) { tambah(IPAddress(lokal[0], lokal[1], lokal[2], h)); }
  }
  for (int i = 0; i < n; i++) {
    if (CekPort(kand[i], MQTT_PORT, 150)) { return kand[i]; }
  }
  /* v6.3: perangkat yang hanya membuka port 80 (laptop, printer, router) TIDAK dianggap Pi,
     agar API key tidak terkirim ke perangkat asing. SERVER_IP dipakai hanya bila satu subnet. */
  bool satuSubnet = adaDef && ipDef[0] == lokal[0] && ipDef[1] == lokal[1] && ipDef[2] == lokal[2];
  return satuSubnet ? ipDef : IPAddress();
}

/* Urutan: hotspot Pi (gateway 10.42.0.1) -> IP tetap dari serial -> mDNS garap.local ->
   SERVER_IP rahasia.h bila port terbuka -> probe subnet -> SERVER_IP */
/* mDNS: nama alat "aktuator-01.local"; juga mengiklankan port OTA agar Arduino IDE menampilkan
   "aktuator-01 at <IP>" di menu Port (hanya bila OTA_PASSWORD diisi). */
static void PastikanMdns(void)
{
  if (mdnsMulai) {
    return;
  }
  mdnsMulai = MDNS.begin(KODE_PERANGKAT);
  if (mdnsMulai && ADA_OTA_LOKAL) {
    MDNS.enableArduino(PORT_OTA, true);
  }
}

static void CariServer(void)
{
  IPAddress ip;
  if (WiFi.gatewayIP() == IP_HOTSPOT_PI) {
    ip = IP_HOTSPOT_PI;
  } else if (nvsServer.length() > 0 && ip.fromString(nvsServer)) {
    /* IP Pi yang disimpan lewat serial */
  } else {
    PastikanMdns();
    for (int i = 0; i < 3 && (uint32_t)ip == 0 && mdnsMulai; i++) {
      ip = MDNS.queryHost(NAMA_MDNS[i], 1200);
    }
    if ((uint32_t)ip == 0) {
      ip = ProbeSubnet();
    }
  }
  serverIp = ip;
  mqtt.setServer(serverIp, MQTT_PORT);
  if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    snprintf(infoIpServer, sizeof(infoIpServer), "%s", (uint32_t)ip ? ip.toString().c_str() : "-");
    xSemaphoreGive(mutex);
  }
  Serial.printf("[i] Server Pi: %s\n", (uint32_t)ip ? ip.toString().c_str() : "(belum ditemukan)");
}

static void TerapkanPermintaanSerial(void)
{
  if (mintaWifi) {
    char s[33], pw[65];
    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) != pdTRUE) {
      return;
    }
    snprintf(s, sizeof(s), "%s", mintaSsid);
    snprintf(pw, sizeof(pw), "%s", mintaPass);
    mintaWifi = false;
    xSemaphoreGive(mutex);
    Preferences p;
    if (p.begin("garap_net", false)) {
      if (s[0]) { p.putString("ssid", s); p.putString("pass", pw); }
      else      { p.remove("ssid"); p.remove("pass"); }
      p.end();
    }
    nvsSsid = s;
    nvsPass = pw;
    if (s[0]) {
      wifiMulti.addAP(nvsSsid.c_str(), nvsPass.c_str());
      WiFi.disconnect(false);
      Serial.printf("[i] WiFi tambahan disimpan: %s (sandi disamarkan) - menyambung ulang\n", s);
    } else {
      Serial.println("[i] WiFi tambahan dihapus (berlaku penuh setelah restart)");
    }
  }
  if (mintaServer) {
    char ip[20];
    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) != pdTRUE) {
      return;
    }
    snprintf(ip, sizeof(ip), "%s", mintaIp);
    mintaServer = false;
    xSemaphoreGive(mutex);
    Preferences p;
    if (p.begin("garap_net", false)) {
      if (ip[0]) { p.putString("srv", ip); } else { p.remove("srv"); }
      p.end();
    }
    nvsServer = ip;
    if (mqtt.connected()) {
      mqtt.disconnect();
    }
    serverIp = IPAddress();
    gagalMqtt = 0;
    mintaCari = true;
  }
  if (mintaPindai) {
    mintaPindai = false;
    Serial.println("[i] Memindai WiFi 2,4 GHz...");
    int n = WiFi.scanNetworks();
    for (int i = 0; i < n; i++) {
      Serial.printf("  [%d] %-26s %d dBm\n", i + 1, WiFi.SSID(i).c_str(), (int)WiFi.RSSI(i));
    }
    WiFi.scanDelete();
  }
}

static void KelolaWifi(uint32_t now)
{
  static bool siap = false;
  static uint32_t tCoba = 0;
  if (!siap) {
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.setAutoReconnect(true);
    if (nvsSsid.length() > 0) {
      wifiMulti.addAP(nvsSsid.c_str(), nvsPass.c_str());
    }
    for (const Jaringan &j : JARINGAN) {
      if (j.ssid != NULL && j.ssid[0]) {
        wifiMulti.addAP(j.ssid, j.pass);
      }
    }
    siap = true;
  }
  bool ok = (WiFi.status() == WL_CONNECTED);
  if (ok && !wifiOk) {
    wifiOk = true;
    serverIp = IPAddress();          /* jaringan mungkin berganti -> cari server lagi */
    gagalMqtt = 0;
    configTime(0, 0, "pool.ntp.org", "time.google.com");
    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      snprintf(infoWifi, sizeof(infoWifi), "%s", WiFi.SSID().c_str());
      snprintf(infoIpEsp, sizeof(infoIpEsp), "%s", WiFi.localIP().toString().c_str());
      xSemaphoreGive(mutex);
    }
    Serial.printf("[i] WiFi tersambung: %s  IP %s  GW %s\n", WiFi.SSID().c_str(),
                  WiFi.localIP().toString().c_str(), WiFi.gatewayIP().toString().c_str());
    PastikanMdns();
  } else if (!ok && wifiOk) {
    wifiOk = false;
    mqttOk = false;
    tDetak = 0;
    mqtt.disconnect();
    if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      snprintf(infoWifi, sizeof(infoWifi), "(putus)");
      snprintf(infoIpEsp, sizeof(infoIpEsp), "-");
      xSemaphoreGive(mutex);
    }
    Serial.println("[!] WiFi terputus - alat tetap bekerja mandiri");
  }
  if (ok) {
    static uint32_t tRssi = 0;
    if ((uint32_t)(now - tRssi) > 5000) {
      tRssi = now;
      rssiNilai = WiFi.RSSI();
    }
    return;
  }
  if (tCoba == 0 || (uint32_t)(now - tCoba) >= 5000) {
    wifiMulti.run(8000);             /* pindai lalu sambung ke jaringan terkuat yang dikenal */
    tCoba = millis();
  }
}

static void KelolaNtp(uint32_t now)
{
  static uint32_t tCek = 0;
  static bool sudah = false;
  if (!wifiOk) {
    return;
  }
  uint32_t jeda = sudah ? 6UL * 3600000UL : 15000UL;
  if (tCek != 0 && (uint32_t)(now - tCek) < jeda) {
    return;
  }
  tCek = now ? now : 1;
  time_t t = time(nullptr);
  if (t > 1700000000 && t < 4200000000LL) {
    KirimSinkronJam((uint32_t)t);
    sudah = true;
  }
}

static bool SalinStatus(StatusSistem *s)
{
  bool ada = false;
  if (xSemaphoreTake(mutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    if (statusAda) {
      *s = statusBersama;
      ada = true;
    }
    xSemaphoreGive(mutex);
  }
  return ada;
}

static void TerimaLaporanBaru(void)
{
  Laporan l;
  while (xQueueReceive(antrianLaporan, &l, 0) == pdTRUE) {
    int slot = -1;
    for (int i = 0; i < MAKS_LAPORAN_TERTUNDA; i++) {
      if (tertunda[i].id == l.id) { slot = i; break; }
    }
    if (slot < 0) {
      for (int i = 0; i < MAKS_LAPORAN_TERTUNDA; i++) {
        if (tertunda[i].id == 0) { slot = i; break; }
      }
    }
    if (slot < 0) {
      slot = 0;
      for (int i = 1; i < MAKS_LAPORAN_TERTUNDA; i++) {
        if ((int32_t)(tertunda[i].tKirim - tertunda[slot].tKirim) < 0) { slot = i; }
      }
      Serial.printf("[!] antrian laporan penuh, #%llu dibuang\n", (unsigned long long)tertunda[slot].id);
      tertunda[slot].id = 0;
      if (jumlahTertunda > 0) { jumlahTertunda = jumlahTertunda - 1; }
    }
    size_t len = BuatLaporan(l, tertunda[slot].isi, sizeof(tertunda[slot].isi));
    if (len == 0) {
      continue;
    }
    if (tertunda[slot].id == 0) {
      jumlahTertunda = jumlahTertunda + 1;
    }
    tertunda[slot].id = l.id;
    tertunda[slot].panjang = (uint16_t)len;
    tertunda[slot].tKirim = 0;
  }
}

static void KirimUlangLaporan(uint32_t now)
{
  for (int i = 0; i < MAKS_LAPORAN_TERTUNDA; i++) {
    if (tertunda[i].id == 0) {
      continue;
    }
    if (tertunda[i].tKirim == 0 || (uint32_t)(now - tertunda[i].tKirim) >= ULANG_HASIL_MS) {
      if (Publikasi(T_HASIL, tertunda[i].isi, tertunda[i].panjang, false)) {
        tertunda[i].tKirim = now ? now : 1;
      }
    }
  }
}

static bool KirimHttp(const char *path, const char *body, size_t len)
{
  if (!wifiOk || (uint32_t)serverIp == 0) {
    return false;
  }
  WiFiClient c;
  if (!c.connect(serverIp, HTTP_PORT, 1500)) {
    return false;
  }
  c.printf("POST %s HTTP/1.1\r\nHost: %s\r\nContent-Type: application/json\r\nX-API-KEY: %s\r\n"
           "Connection: close\r\nContent-Length: %u\r\n\r\n",
           path, serverIp.toString().c_str(), API_KEY_AKTUATOR, (unsigned)len);
  c.write((const uint8_t *)body, len);
  uint32_t t0 = millis();
  while (c.connected() && !c.available() && (uint32_t)(millis() - t0) < 2000) {
    vTaskDelay(pdMS_TO_TICKS(10));
  }
  String baris = c.available() ? c.readStringUntil('\n') : "";
  c.stop();
  return baris.indexOf(" 200") > 0 || baris.indexOf(" 201") > 0;
}

static void KelolaMqtt(uint32_t now)
{
  static uint32_t tCoba = 0, tStatus = 0, tData = 0, tHttp = 0, tCetak = 0;
  static bool estopTerakhir = false;
  static StatusSistem s;
  static char buf[1400];

  TerimaLaporanBaru();
  if (!wifiOk) {
    mqttOk = false;
    tDetak = 0;
    return;
  }
  if (mintaCari) {
    mintaCari = false;
    serverIp = IPAddress();
  }
  bool ada = SalinStatus(&s);

  if (!mqtt.connected()) {
    mqttOk = false;
    tDetak = 0;
    if (tCoba == 0 || (uint32_t)(now - tCoba) >= 5000) {
      tCoba = now ? now : 1;
      if ((uint32_t)serverIp == 0 || gagalMqtt >= 3) {
        CariServer();
        gagalMqtt = 0;
      }
      if ((uint32_t)serverIp != 0 &&
          mqtt.connect(KODE_PERANGKAT, KODE_PERANGKAT, API_KEY_AKTUATOR, T_STATUS, 1, true, "{\"online\":false}")) {
        mqtt.subscribe(T_PERINTAH, 1);
        mqtt.subscribe(T_ACK, 1);
        mqtt.subscribe(T_SERVER, 1);
        mqttOk = true;
        gagalMqtt = 0;
        size_t len = BuatStatus(ada ? &s : NULL, buf, sizeof(buf));
        if (len) {
          Publikasi(T_STATUS, buf, len, true);
        }
        tStatus = millis();
        Serial.printf("[i] MQTT tersambung ke %s sebagai %s\n", serverIp.toString().c_str(), KODE_PERANGKAT);
      } else {
        gagalMqtt++;
        if (tCetak == 0 || (uint32_t)(now - tCetak) > 30000UL) {
          tCetak = now ? now : 1;
          int st = mqtt.state();
          Serial.printf("[!] MQTT gagal (kode %d)%s\n", st,
                        st == 5 ? " - API key ditolak broker" :
                        st == -2 ? " - port 1883 tak terjangkau, data lewat HTTP" : "");
        }
      }
    }
    /* cadangan HTTP: data & heartbeat (perintah tetap hanya lewat MQTT) */
    if (ada && (uint32_t)serverIp != 0 && (tHttp == 0 || (uint32_t)(now - tHttp) >= 15000UL)) {
      tHttp = now ? now : 1;
      size_t len = BuatData(s, buf, sizeof(buf));
      if (len) {
        KirimHttp("/api/device/v1/sensor", buf, len);
      }
      len = BuatStatus(&s, buf, sizeof(buf));
      if (len) {
        KirimHttp("/api/device/v1/heartbeat/aktuator", buf, len);
      }
    }
    return;
  }

  mqttOk = true;
  mqtt.loop();
  KirimUlangLaporan(now);

  bool estopSekarang = ada && (s.estopFisik || s.estopServer || s.tungguReset);
  if (ada && (tStatus == 0 || (uint32_t)(now - tStatus) >= INTERVAL_STATUS_MS || estopSekarang != estopTerakhir)) {
    size_t len = BuatStatus(&s, buf, sizeof(buf));
    if (len && Publikasi(T_STATUS, buf, len, true)) {
      tStatus = now ? now : 1;
      estopTerakhir = estopSekarang;
      if (estopSekarang) {
        mintaTelemetri = true;       /* E-STOP dikirim seketika */
      }
    }
  }
  uint32_t periode = (uint32_t)((ada ? s.param.telemetriDtk : 5.0f) * 1000.0f);
  if (periode < 2000) {
    periode = 2000;
  }
  if (ada && (mintaTelemetri || tData == 0 || (uint32_t)(now - tData) >= periode)) {
    tData = now ? now : 1;
    mintaTelemetri = false;
    size_t len = BuatData(s, buf, sizeof(buf));
    if (len) {
      Publikasi(T_DATA, buf, len, false);
    } else {
      Serial.println("[!] data JSON terlalu besar");
    }
  }
}

/* ===========================================================================
 *  OTA LOKAL — Arduino IDE (Tools > Port > "aktuator-01 at <IP>"), password OTA_PASSWORD.
 *  Hanya aktif (port dibuka) selama izin lokal ada; selama unggah semua pompa OFF.
 * ========================================================================= */
static void KelolaOtaLokal(void)
{
  static bool aktif = false, disiapkan = false;
  if (!ADA_OTA_LOKAL) {
    return;
  }
  bool boleh = wifiOk && izinOtaLokal && !(otaJalan && otaJalankanId != 0);
  if (boleh && !aktif) {
    if (!disiapkan) {
      ArduinoOTA.setHostname(KODE_PERANGKAT);
      ArduinoOTA.setPort(PORT_OTA);
      ArduinoOTA.setPassword(OTA_PASSWORD);
      ArduinoOTA.setMdnsEnabled(false);          /* mDNS sudah dijalankan PastikanMdns() */
      ArduinoOTA.onStart([]() {
        otaJalan = true;
        otaPersen = 0;
        MatikanDaruratRaw();                     /* pompa OFF seketika; loop utama ikut mengunci */
        Serial.println("[OTA] lokal: mulai menerima program baru - JANGAN cabut listrik");
      });
      ArduinoOTA.onProgress([](unsigned int sudah, unsigned int total) {
        otaPersen = total ? (uint8_t)((uint64_t)sudah * 100 / total) : 0;
      });
      ArduinoOTA.onEnd([]() {
        MatikanDaruratRaw();
        Serial.println("[OTA] lokal: selesai, restart dengan program baru");
      });
      ArduinoOTA.onError([](ota_error_t e) {
        otaJalan = false;
        Serial.printf("[OTA] lokal GAGAL (kode %d) - program lama tetap dipakai\n", (int)e);
      });
      disiapkan = true;
    }
    ArduinoOTA.begin();
    aktif = true;
    Serial.printf("[OTA] lokal SIAP: Arduino IDE > Port > %s at %s\n", KODE_PERANGKAT,
                  WiFi.localIP().toString().c_str());
  } else if (!boleh && aktif) {
    ArduinoOTA.end();
    aktif = false;
    Serial.println(wifiOk ? "[OTA] lokal ditutup (alat sedang SEMAI / bekerja; masuk pemeliharaan untuk unggah)"
                          : "[OTA] lokal ditutup (WiFi putus)");
  }
  if (aktif) {
    ArduinoOTA.handle();
  }
}

/* ===========================================================================
 *  OTA JAUH — perintah web OTA {path, sha256}: unduh http://<IP Pi>:<HTTP_PORT><path>
 *  dengan header X-API-KEY, tulis ke partisi cadangan sambil menghitung SHA-256.
 *  Cocok -> aktifkan & restart; tidak cocok / putus -> batal, program lama tetap.
 * ========================================================================= */
static void LaporOta(uint64_t id, bool ok, const char *alasan)
{
  Laporan l;
  memset(&l, 0, sizeof(l));
  l.id = id;
  l.selesai = ok;
  snprintf(l.alasan, sizeof(l.alasan), "%s", alasan);
  KirimLaporan(l);
}

static void JalankanOtaJauh(void)
{
  uint64_t id = otaJalankanId;
  if (id == 0) {
    return;
  }
  otaJalankanId = 0;
  if (!otaSimpanAda || otaSimpan.id != id) {
    LaporOta(id, false, "ota_parameter_hilang");
    return;
  }
  otaSimpanAda = false;
  if (!wifiOk || (uint32_t)serverIp == 0) {
    LaporOta(id, false, "ota_server_tidak_ada");
    return;
  }
  otaJalan = true;
  otaPersen = 0;
  MatikanDaruratRaw();
  char url[200];
  snprintf(url, sizeof(url), "http://%s:%u%s", serverIp.toString().c_str(), (unsigned)HTTP_PORT, otaSimpan.path);
  Serial.printf("[OTA] jauh: unduh %s\n", url);

  HTTPClient http;
  http.setTimeout(15000);
  const char *alasan = NULL;
  if (!http.begin(url)) {
    alasan = "ota_url_salah";
  } else {
    http.addHeader("X-API-KEY", API_KEY_AKTUATOR);
    int kode = http.GET();
    int total = http.getSize();
    if (kode != HTTP_CODE_OK) {
      alasan = "ota_http_gagal";
      Serial.printf("[OTA] HTTP %d\n", kode);
    } else if (total <= 0) {
      alasan = "ota_ukuran_tidak_diketahui";
    } else if (!Update.begin((size_t)total)) {
      alasan = "ota_terlalu_besar";
    } else {
      mbedtls_sha256_context ctx;
      mbedtls_sha256_init(&ctx);
      mbedtls_sha256_starts(&ctx, 0);
      WiFiClient *aliran = http.getStreamPtr();
      static uint8_t blok[1024];
      int sudah = 0;
      uint32_t tAkhir = millis();
      while (sudah < total) {
        size_t ada = aliran->available();
        if (ada == 0) {
          if (!http.connected() || (uint32_t)(millis() - tAkhir) > 15000) {
            break;                               /* putus / macet */
          }
          vTaskDelay(pdMS_TO_TICKS(5));
          continue;
        }
        int n = aliran->readBytes(blok, ada > sizeof(blok) ? sizeof(blok) : ada);
        if (n <= 0) {
          continue;
        }
        if (Update.write(blok, (size_t)n) != (size_t)n) {
          break;
        }
        mbedtls_sha256_update(&ctx, blok, (size_t)n);
        sudah += n;
        tAkhir = millis();
        otaPersen = (uint8_t)((uint64_t)sudah * 100 / (uint64_t)total);
        vTaskDelay(1);                           /* beri waktu task lain / watchdog */
      }
      uint8_t hasil[32];
      mbedtls_sha256_finish(&ctx, hasil);
      mbedtls_sha256_free(&ctx);
      char hex[65];
      for (int i = 0; i < 32; i++) {
        snprintf(hex + i * 2, 3, "%02x", hasil[i]);
      }
      if (sudah != total) {
        Update.abort();
        alasan = "ota_unduh_terputus";
      } else if (strcmp(hex, otaSimpan.sha) != 0) {
        Update.abort();
        alasan = "ota_sha256_tidak_cocok";
      } else if (!Update.end(true)) {
        alasan = "ota_gagal_dipasang";
      }
    }
    http.end();
  }
  if (alasan != NULL) {
    otaJalan = false;
    Serial.printf("[OTA] jauh GAGAL: %s - program lama tetap dipakai\n", alasan);
    LaporOta(id, false, alasan);
    return;
  }
  SimpanOtaId(id);                               /* dilaporkan "ota_berhasil" setelah restart */
  Serial.println("[OTA] jauh: berhasil, restart dengan program baru");
  MatikanDaruratRaw();
  delay(300);
  ESP.restart();
}

static void TaskKomunikasi(void *arg)
{
  (void)arg;
  for (;;) {
    uint32_t now = millis();
    TerapkanPermintaanSerial();
    KelolaWifi(now);
    KelolaNtp(now);
    KelolaMqtt(now);
    KelolaOtaLokal();
    JalankanOtaJauh();
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

void InisialisasiKomunikasi(void)
{
  mutex = xSemaphoreCreateMutex();
  antrianPerintah = xQueueCreate(6, sizeof(PerintahWeb));
  antrianLaporan = xQueueCreate(8, sizeof(Laporan));
  memset(tertunda, 0, sizeof(tertunda));
  MuatJaringanNvs();
  mqtt.setBufferSize(1536);
  mqtt.setKeepAlive(15);
  mqtt.setSocketTimeout(5);
  mqtt.setCallback(SaatPesan);
  if (sizeof(API_KEY_AKTUATOR) <= 1) {
    Serial.println("[!] API_KEY_AKTUATOR kosong di rahasia.h - broker Pi akan menolak");
  }
  Serial.printf("[i] %d WiFi dikenal%s | kontrak garap/%s | OTA lokal %s\n",
                (int)(sizeof(JARINGAN) / sizeof(JARINGAN[0])), nvsSsid.length() ? " + 1 dari serial" : "",
                KODE_PERANGKAT, ADA_OTA_LOKAL ? "aktif (saat pemeliharaan / tidak SEMAI)" : "MATI (OTA_PASSWORD kosong)");
  if (PAKSA_FLOAT_BAWAH_NAIK) {
    Serial.println("[!] FLOAT BAWAH DIPAKSA NAIK (Config.h) - isi air otomatis saat RENDAH tidak jalan, cek air manual");
  }
  xTaskCreatePinnedToCore(TaskKomunikasi, "komunikasi", 16384, NULL, 1, NULL, 0);
}
