/* ============================================================================
 *  HidroponikV6 — firmware ESP32 hidroponik 1 penampung (PCB perfboard v7)
 *  v6.2: rancangan v6 + kontrak garap/ tim + OTA (lokal & jauh) + konsol jarak jauh
 *        + deteksi botol nutrisi habis + perintah kosongkan.
 *
 *  Pembagian kerja:
 *    core 1 (loop)  : aktuator -> RTC -> sensor -> kontrol -> perintah -> LCD   (semua I2C & relay)
 *    core 0         : komunikasi WiFi/MQTT/HTTP/OTA, pengawas macet
 *  Library: ArduinoJson 7, PubSubClient, OneWire, DallasTemperature, Adafruit SHT31,
 *           RTClib, LiquidCrystal_I2C.   Board: "ESP32 Dev Module",
 *           Partition Scheme: "Default 4MB with spiffs" (2 x 1,2 MB aplikasi = wajib untuk OTA).
 *  Rahasia (WiFi, API key, IP Pi, password OTA) ada di rahasia.h — JANGAN dibagikan.
 * ========================================================================== */
#include <Arduino.h>
#include <string.h>
#include <stdlib.h>
#include "Config.h"
#include "Tipe.h"
#include "Aktuator.h"
#include "WaktuRtc.h"
#include "Sensor.h"
#include "Kontrol.h"
#include "Komunikasi.h"
#include "TampilanLcd.h"
#include "Parameter.h"
#include "Penyimpanan.h"

/* Laporan (dengan teks konsol) lebih besar: beri loop utama tumpukan lebih lega */
SET_LOOP_TASK_STACK_SIZE(16 * 1024);

static volatile uint32_t detakLoop = 0;
static bool cetakBerkala = true;
static char barisSerial[100];
static uint8_t panjangSerial = 0;

/* Ke mana keluaran perintah ditulis: Serial Monitor, atau buffer saat perintah KONSOL dari web */
static Print *keluar = &Serial;

/* Penampung teks untuk konsol jarak jauh */
class CetakBuffer : public Print {
 public:
  CetakBuffer(char *buf, size_t kapasitas) : b(buf), kap(kapasitas), n(0) { b[0] = 0; }
  size_t write(uint8_t c) override
  {
    if (n + 1 < kap) {
      b[n++] = (char)c;
      b[n] = 0;
    }
    return 1;
  }
 private:
  char  *b;
  size_t kap;
  size_t n;
};

/* Loop utama macet > 8 dtk -> semua output OFF lalu restart */
static void TaskPengawas(void *arg)
{
  (void)arg;
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(500));
    if ((uint32_t)(millis() - detakLoop) > PENGAWAS_TIMEOUT_MS) {
      MatikanDaruratRaw();
      Serial.println("[!] PENGAWAS: loop macet - semua pompa mati, restart");
      delay(50);
      ESP.restart();
    }
  }
}

/* ---------------------------------------------------------------------------
 *  PERINTAH (Serial Monitor & konsol jarak jauh)
 * ------------------------------------------------------------------------- */
static void Bantuan(void)
{
  keluar->println(F("===== Perintah Serial Monitor (115200) ====="));
  keluar->println(F(" status | param | kal | auto on|off | mqtt on|off"));
  keluar->println(F(" set <nama> <nilai>        contoh: set volume_l 100  (lihat 'param')"));
  keluar->println(F(" kal ph|ec 1|2 [acuan]     ukur + simpan titik kalibrasi (probe di larutan)"));
  keluar->println(F(" kal ec 0 [mS]             titik air tawar (opsional, sesudah titik 1): probe di air,"));
  keluar->println(F("                           isi nilai alat ukur genggam dalam mS (100 ppm = 0.2); kosong = udara 0"));
  keluar->println(F(" balik ph|ec               kembalikan kalibrasi sebelumnya"));
  keluar->println(F(" uji a|b|phup|phdown|isi <detik>   jalankan pompa (kalibrasi laju)"));
  keluar->println(F(" semai <ppm> <phmin> <phmax> | target <ppm> [phmin phmax] | panen"));
  keluar->println(F(" pem on|off | stop | buka (buka kunci pompa/nutrisi) | reboot"));
  keluar->println(F(" waktu YYYY-MM-DD HH:MM:SS (lokal) | wifi NAMA|SANDI | wifi hapus"));
  keluar->println(F(" server <ip> | server hapus | cari | scan"));
  keluar->println(F(" kosongkan YA              hapus SEMUA data di flash (kalibrasi ikut), lalu restart"));
  keluar->println(F(" OTA lokal: 'pem on' (atau tidak SEMAI), lalu Arduino IDE > Port > aktuator-01 at <IP>"));
}

static void CetakStatus(void)
{
  StatusSistem s;
  AmbilStatusSistem(&s);
  const SnapshotSensor &x = s.sensor;
  char wifi[33], ipE[16], ipS[16];
  InfoJaringan(wifi, sizeof(wifi), ipE, sizeof(ipE), ipS, sizeof(ipS));
  keluar->println(F("---------------- STATUS ----------------"));
  keluar->printf("Firmware %s  hidup %lu dtk  heap %u\n", NAMA_FIRMWARE, (unsigned long)s.uptimeDtk, (unsigned)ESP.getFreeHeap());
  keluar->printf("Mode %s  siap=%s%s%s  pemeliharaan=%d  kegiatan=%s\n", NamaMode(s.mode), s.siap ? "ya" : "TIDAK",
                 s.siap ? "" : " kurang:", s.kurang, (int)s.pemeliharaan, NamaKegiatan(s.kegiatan));
  keluar->printf("Target %.0f ppm  pH %.1f-%.1f  hari semai %u  otomasi AB=%d pH=%d encer=%d isi=%d\n",
                 (double)s.targetPpm, (double)s.phMin, (double)s.phMax, (unsigned)s.hariSemai,
                 (s.otomasi & OTO_AB) != 0, (s.otomasi & OTO_PH) != 0, (s.otomasi & OTO_ENCER) != 0,
                 (s.otomasi & OTO_ISI) != 0);
  keluar->printf("pH %.2f (%.4f V, kal %u/2)  EC %.3f mS = %.0f ppm (%.4f V, kal %u/2)\n", (double)x.ph,
                 (double)x.phVolt, JumlahTitikKalibrasi(true), (double)x.ecMs, (double)x.ppm, (double)x.ecVolt,
                 JumlahTitikKalibrasi(false));
  if (!x.ecValid) {
    const char *sebab;
    if (!x.adsAda || !isfinite(x.ecVolt))   { sebab = "ADS1115 / kanal A1 tidak terbaca"; }
    else if (!x.ecTerkalibrasi)             { sebab = "EC belum dikalibrasi 2 titik (kal ec 1 / kal ec 2)"; }
    else if (isfinite(EcMentahTerakhir()))  { sebab = "hasil di luar 0-20 mS/cm (kalibrasi salah / probe rusak)"; }
    else                                    { sebab = "menunggu >= 5 bacaan (10 dtk) atau bacaan belum tenang"; }
    keluar->printf("EC TIDAK TAMPIL: %s | tegangan %.4f V, hitungan terakhir %.3f mS\n", sebab, (double)x.ecVolt,
                   (double)EcMentahTerakhir());
  }
  if (!x.suhuAirValid) {
    keluar->println("SUHU AIR TIDAK TERBACA: EC dihitung dengan 25 C, dosing DITAHAN sampai DS18B20 terbaca");
  }
  keluar->printf("Suhu air %.1f C  ruang %.1f C  RH %.0f %%  stabil EC=%d pH=%d  sensorKunci=%d\n",
                 (double)x.suhuAir, (double)x.suhuUdara, (double)x.kelembaban, (int)x.ecStabil, (int)x.phStabil, (int)x.kunci);
  keluar->printf("Air %s (bawah %s, atas %s)  kunci='%s'\n", NamaLevel(s.level), s.floatBawahNaik ? "naik" : "turun",
                 s.floatAtasNaik ? "naik" : "turun", NamaKunci(s));
  keluar->printf("E-STOP fisik=%d (%lu mV) server=%d tungguReset=%d\n", (int)s.estopFisik,
                 (unsigned long)TeganganEstopMv(), (int)s.estopServer, (int)s.tungguReset);
  keluar->printf("Hari ini: AB %u/%.0f  pH %u/%.0f  encer %u/%.0f  isi %u/%.0f  monitoring sisa %lu dtk\n",
                 s.abHari, (double)s.param.maksAbHari, s.phHari, (double)s.param.maksPhHari, s.encerHari,
                 (double)s.param.maksEncerHari, s.isiHari, (double)s.param.maksIsiHari, (unsigned long)s.sisaMonitoringDtk);
  if (s.rtcValid) {
    uint16_t th; uint8_t bl, tg, jm, mn, dt;
    PecahUnix(s.unixLokal, &th, &bl, &tg, &jm, &mn, &dt);
    keluar->printf("Jam %04u-%02u-%02u %02u:%02u:%02u\n", th, bl, tg, jm, mn, dt);
  } else {
    keluar->println("Jam BELUM VALID (menunggu NTP / detak server / perintah 'waktu')");
  }
  keluar->printf("WiFi %s  IP %s  server %s  MQTT %s  detak %s  RSSI %d  laporan tertunda %d\n",
                 s.wifiOk ? wifi : "(putus)", ipE, ipS, s.mqttOk ? "OK" : "PUTUS", s.serverOk ? "OK" : "-", s.rssi,
                 JumlahLaporanTertunda());
  keluar->println(F("----------------------------------------"));
}

static void CetakRingkas(void)
{
  StatusSistem s;
  AmbilStatusSistem(&s);
  const SnapshotSensor &x = s.sensor;
  Serial.printf("[st] %-5s pH %5.2f  %4.0f ppm  air %4.1fC  ruang %4.1fC %3.0f%%  %-6s  %-9s %s%s\n",
                NamaMode(s.mode), (double)x.ph, (double)x.ppm, (double)x.suhuAir, (double)x.suhuUdara,
                (double)x.kelembaban, NamaLevel(s.level), NamaKegiatan(s.kegiatan),
                s.mqttOk ? "ONLINE" : "offline", (s.estopFisik || s.tungguReset) ? " ESTOP" : "");
}

static void CetakParameter(void)
{
  const ParameterAlat &p = ParameterAktif();
  for (int i = 0; i < JumlahParameter(); i++) {
    float v = AmbilNilaiParameter(p, i);
    keluar->printf("  %-24s = %g%s\n", NamaParameter(i), (double)v,
                   (ParameterWajib(i) && v == 0.0f) ? "   <- WAJIB, belum diisi" : "");
  }
}

static void CetakKal(void)
{
  for (int i = 0; i < 2; i++) {
    bool ph = (i == 0);
    float v1, v2, a1, a2;
    InfoKalibrasi(ph, &v1, &v2, &a1, &a2);
    keluar->printf("Kalibrasi %s: titik1 %.4f V = %.3f | titik2 %.4f V = %.3f | %u/2 titik\n", ph ? "pH" : "EC",
                   (double)v1, (double)a1, (double)v2, (double)a2, JumlahTitikKalibrasi(ph));
  }
  const ParameterAlat &p = ParameterAktif();
  keluar->printf("Laju pompa: A %.3f  B %.3f  pH up %.3f  pH down %.3f mL/dtk | faktor EC %.3f\n",
                 (double)p.lajuA, (double)p.lajuB, (double)p.lajuPhUp, (double)p.lajuPhDown, (double)p.ecFaktor);
}

static void Mulai(PerintahWeb &p, TipePerintah t, const char *nama)
{
  memset(&p, 0, sizeof(p));
  p.id = 0;
  p.tipe = t;
  snprintf(p.tipeTeks, sizeof(p.tipeTeks), "%s", nama);
}

static void TambahAngka(PerintahWeb &p, const char *k, float v)
{
  if (p.nAngka < MAKS_ANGKA_PERINTAH) {
    snprintf(p.kunciAngka[p.nAngka], sizeof(p.kunciAngka[0]), "%s", k);
    p.angka[p.nAngka++] = v;
  }
}

static void TambahTeks(PerintahWeb &p, const char *k, const char *v)
{
  if (p.nTeks < MAKS_TEKS_PERINTAH) {
    snprintf(p.kunciTeks[p.nTeks], sizeof(p.kunciTeks[0]), "%s", k);
    snprintf(p.teks[p.nTeks], sizeof(p.teks[0]), "%s", v);
    p.nTeks++;
  }
}

static void ProsesBaris(char *b)
{
  while (*b == ' ') { b++; }
  if (*b == 0) {
    return;
  }
  /* wifi NAMA|SANDI: nama boleh berisi spasi, jadi diurai sebelum strtok */
  if (strncasecmp(b, "wifi ", 5) == 0) {
    char *arg = b + 5;
    if (strcasecmp(arg, "hapus") == 0) {
      AturWifiTambahan("", "");
      return;
    }
    char *sep = strchr(arg, '|');
    size_t lp = sep ? strlen(sep + 1) : 0;
    if (sep == NULL || sep == arg || (sep - arg) > 32 || (lp > 0 && (lp < 8 || lp > 63))) {
      keluar->println("Format: wifi NAMA_WIFI|SANDI (sandi kosong atau 8-63 karakter)");
      return;
    }
    *sep = 0;
    AturWifiTambahan(arg, sep + 1);
    return;
  }

  char *kata[6];
  int n = 0;
  for (char *t = strtok(b, " \t"); t != NULL && n < 6; t = strtok(NULL, " \t")) {
    kata[n++] = t;
  }
  if (n == 0) {
    return;
  }
  PerintahWeb p;
  char pesan[64];

  if (!strcasecmp(kata[0], "help") || !strcmp(kata[0], "?")) {
    Bantuan();
  } else if (!strcasecmp(kata[0], "status")) {
    CetakStatus();
  } else if (!strcasecmp(kata[0], "param")) {
    CetakParameter();
  } else if (!strcasecmp(kata[0], "kal") && n == 1) {
    CetakKal();
  } else if (!strcasecmp(kata[0], "auto") && n >= 2) {
    cetakBerkala = !strcasecmp(kata[1], "on");
  } else if (!strcasecmp(kata[0], "mqtt") && n >= 2) {
    CetakMqtt(!strcasecmp(kata[1], "on"));
  } else if (!strcasecmp(kata[0], "set") && n >= 3) {
    bool ok = AturParameterSerial(kata[1], (float)atof(kata[2]), pesan, sizeof(pesan));
    keluar->printf("%s: %s\n", ok ? "OK" : "DITOLAK", pesan);
  } else if (!strcasecmp(kata[0], "kal") && n >= 3) {
    Mulai(p, P_KAL_SENSOR, "KAL_SENSOR");
    TambahTeks(p, "sensor", kata[1]);
    TambahAngka(p, "titik", (float)atoi(kata[2]));
    TambahTeks(p, "aksi", "UKUR");
    TerapkanPerintah(p);
    StatusSistem s;
    AmbilStatusSistem(&s);
    if (s.kalTunggu) {
      Mulai(p, P_KAL_SENSOR, "KAL_SENSOR");
      TambahTeks(p, "sensor", kata[1]);
      TambahAngka(p, "titik", (float)atoi(kata[2]));
      TambahTeks(p, "aksi", "SIMPAN");
      if (n >= 4) {
        TambahAngka(p, "acuan", (float)atof(kata[3]));
      }
      TerapkanPerintah(p);
    }
  } else if (!strcasecmp(kata[0], "balik") && n >= 2) {
    Mulai(p, P_BALIK_KALIBRASI, "BALIK_KALIBRASI");
    TambahTeks(p, "sensor", kata[1]);
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "uji") && n >= 3) {
    Mulai(p, P_UJI_POMPA, "UJI_POMPA");
    TambahTeks(p, "pompa", kata[1]);
    TambahAngka(p, "detik", (float)atof(kata[2]));
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "semai") && n >= 4) {
    Mulai(p, P_SEMAI, "SEMAI");
    TambahAngka(p, "target_ppm", (float)atof(kata[1]));
    TambahAngka(p, "ph_min", (float)atof(kata[2]));
    TambahAngka(p, "ph_max", (float)atof(kata[3]));
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "target") && n >= 2) {
    Mulai(p, P_TARGET, "TARGET");
    TambahAngka(p, "target_ppm", (float)atof(kata[1]));
    if (n >= 4) {
      TambahAngka(p, "ph_min", (float)atof(kata[2]));
      TambahAngka(p, "ph_max", (float)atof(kata[3]));
    }
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "panen")) {
    Mulai(p, P_PANEN, "PANEN");
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "pem") && n >= 2) {
    Mulai(p, P_PEMELIHARAAN, "PEMELIHARAAN");
    TambahTeks(p, "aksi", !strcasecmp(kata[1], "on") ? "MULAI" : "SELESAI");
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "stop")) {
    Mulai(p, P_STOP, "STOP");
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "buka")) {
    Mulai(p, P_BUKA_KUNCI, "BUKA_KUNCI");
    TerapkanPerintah(p);
  } else if (!strcasecmp(kata[0], "waktu") && n >= 3) {
    int th, bl, tg, jm, mn, dt;
    if (sscanf(kata[1], "%d-%d-%d", &th, &bl, &tg) == 3 && sscanf(kata[2], "%d:%d:%d", &jm, &mn, &dt) == 3 &&
        AturWaktuRtc((uint16_t)th, (uint8_t)bl, (uint8_t)tg, (uint8_t)jm, (uint8_t)mn, (uint8_t)dt)) {
      keluar->println("OK: jam diatur (waktu lokal)");
    } else {
      keluar->println("DITOLAK: format 'waktu 2026-11-17 14:30:00' atau RTC tidak merespons");
    }
  } else if (!strcasecmp(kata[0], "server") && n >= 2) {
    if (!strcasecmp(kata[1], "hapus")) {
      AturServerTetap("");
    } else {
      IPAddress uji;
      if (uji.fromString(kata[1]) && (uint32_t)uji != 0) {
        AturServerTetap(kata[1]);
      } else {
        keluar->println("Format: server 192.168.1.50  (atau: server hapus)");
      }
    }
  } else if (!strcasecmp(kata[0], "cari")) {
    MintaCariServer();
  } else if (!strcasecmp(kata[0], "scan")) {
    MintaPindaiWifi();
  } else if (!strcasecmp(kata[0], "kosongkan")) {
    if (n >= 2 && !strcmp(kata[1], "YA")) {
      MatikanSemuaBeban();
      KosongkanSemuaFlash();
      keluar->println("SEMUA data flash dihapus (parameter, kalibrasi, mode, WiFi tambahan). Restart...");
      delay(300);
      ESP.restart();
    } else {
      keluar->println("Hati-hati: kalibrasi ikut terhapus. Ketik persis: kosongkan YA");
    }
  } else if (!strcasecmp(kata[0], "reboot")) {
    MatikanSemuaBeban();
    keluar->println("Restart...");
    delay(200);
    ESP.restart();
  } else {
    keluar->println("Perintah tidak dikenal. Ketik 'help'.");
  }
}

static void BacaSerial(void)
{
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r' || c == '\n') {
      if (panjangSerial > 0) {
        barisSerial[panjangSerial] = 0;
        panjangSerial = 0;
        ProsesBaris(barisSerial);
      }
    } else if (panjangSerial < sizeof(barisSerial) - 1) {
      barisSerial[panjangSerial++] = c;
    }
  }
}

/* ---------------------------------------------------------------------------
 *  KONSOL JARAK JAUH — perintah web {"tipe":"KONSOL","parameter":{"baris":"status"}}
 *  Keluaran dikirim di hasil.keluaran (topik hasil yang sudah ada; ACL broker tidak berubah).
 *  Perintah yang bisa memutus jaringan / menghapus data hanya boleh lewat kabel USB.
 * ------------------------------------------------------------------------- */
static bool DiblokirJarakJauh(const char *baris)
{
  static const char *const LARANG[] = { "wifi", "server", "cari", "scan", "kosongkan", "auto", "mqtt" };
  while (*baris == ' ') { baris++; }
  for (const char *k : LARANG) {
    size_t n = strlen(k);
    if (strncasecmp(baris, k, n) == 0 && (baris[n] == 0 || baris[n] == ' ')) {
      return true;
    }
  }
  return false;
}

static void JalankanKonsolWeb(const PerintahWeb &p)
{
  if (p.id == 0 || IdSudahDiterima(p.id)) {
    return;
  }
  CatatIdDiterima(p.id);
  const char *baris = "";
  for (int i = 0; i < p.nTeks; i++) {
    if (!strcasecmp(p.kunciTeks[i], "baris")) {
      baris = p.teks[i];
    }
  }
  static Laporan l;                      /* static: jangan bebani tumpukan loop */
  memset(&l, 0, sizeof(l));
  l.id = p.id;
  if (!baris[0]) {
    snprintf(l.alasan, sizeof(l.alasan), "baris_kosong");
  } else if (DiblokirJarakJauh(baris)) {
    snprintf(l.alasan, sizeof(l.alasan), "hanya_lewat_kabel_usb");
  } else {
    char salin[sizeof(p.teks[0])];
    snprintf(salin, sizeof(salin), "%s", baris);
    Serial.printf("[konsol web #%llu] %s\n", (unsigned long long)p.id, salin);
    CetakBuffer buf(l.keluaran, sizeof(l.keluaran));
    keluar = &buf;
    TetapkanTangkapKonsol(&buf);
    ProsesBaris(salin);
    TetapkanTangkapKonsol(NULL);
    keluar = &Serial;
    l.selesai = true;
    snprintf(l.alasan, sizeof(l.alasan), "konsol_ok");
  }
  KirimLaporan(l);
}

/* ---------------------------------------------------------------------------
 *  SETUP / LOOP
 * ------------------------------------------------------------------------- */
void setup()
{
  InisialisasiAktuator();             /* PALING AWAL: semua relay OFF */
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("=== Hidroponik " NAMA_FIRMWARE " ===");
#if !BACA_ESTOP
  Serial.println("[!!!] BACA_ESTOP = 0: E-STOP TIDAK DIBACA. Hanya untuk uji meja tanpa pompa!");
#endif
  InisialisasiBusI2C();
  bool rtcAda = InisialisasiJamRtc();
  InisialisasiLcd();
  TampilkanSplash();
  bool adsAda = InisialisasiSensor();
  Serial.printf("[i] RTC %s | ADS1115 %s\n", rtcAda ? "ok" : "TIDAK ADA", adsAda ? "ok" : "TIDAK ADA");
  InisialisasiKomunikasi();
  InisialisasiKontrol();
  Bantuan();
  detakLoop = millis();
  xTaskCreatePinnedToCore(TaskPengawas, "pengawas", 3072, NULL, 3, NULL, 0);
}

void loop()
{
  static uint32_t tStatus = 0, tRingkas = 0;
  detakLoop = millis();

  PerbaruiAktuator();
  PerbaruiWaktuRtc();
  PerbaruiSensor();
  PerbaruiKontrol();

  PerintahWeb p;
  while (AmbilPerintah(&p)) {
    if (p.tipe == P_KONSOL) {
      JalankanKonsolWeb(p);
    } else {
      TerapkanPerintah(p);
    }
    detakLoop = millis();
  }
  BacaSerial();

  uint32_t now = millis();
  if ((uint32_t)(now - tStatus) >= 500) {
    tStatus = now;
    StatusSistem s;
    AmbilStatusSistem(&s);
    BagikanStatus(s);
    PerbaruiLcd(s);
  }
  if (cetakBerkala && (uint32_t)(now - tRingkas) >= 5000) {
    tRingkas = now;
    CetakRingkas();
  }
  delay(2);
}
