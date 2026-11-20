/* ============================================================================
 *  HidroponikV6 — firmware ESP32 hidroponik 1 penampung (PCB perfboard v7)
 *  Rancangan v6 (17 Nov 2026) + kontrak MQTT garap/ firmware tim "gabungan" v0.6.
 *
 *  Pembagian kerja:
 *    core 1 (loop)  : aktuator -> RTC -> sensor -> kontrol -> perintah -> LCD   (semua I2C & relay)
 *    core 0         : komunikasi WiFi/MQTT/HTTP, pengawas macet
 *  Library: ArduinoJson 7, PubSubClient, OneWire, DallasTemperature, Adafruit SHT31,
 *           RTClib, LiquidCrystal_I2C.   Board: "ESP32 Dev Module".
 *  Rahasia (WiFi, API key, IP Pi) ada di rahasia.h — JANGAN dibagikan.
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

static volatile uint32_t detakLoop = 0;
static bool cetakBerkala = true;
static char barisSerial[100];
static uint8_t panjangSerial = 0;

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
 *  SERIAL
 * ------------------------------------------------------------------------- */
static void Bantuan(void)
{
  Serial.println(F("===== Perintah Serial Monitor (115200) ====="));
  Serial.println(F(" status | param | kal | auto on|off | mqtt on|off"));
  Serial.println(F(" set <nama> <nilai>        contoh: set volume_l 100  (lihat 'param')"));
  Serial.println(F(" kal ph|ec 1|2 [acuan]     ukur + simpan titik kalibrasi (probe di larutan)"));
  Serial.println(F(" balik ph|ec               kembalikan kalibrasi sebelumnya"));
  Serial.println(F(" uji a|b|phup|phdown|isi <detik>   jalankan pompa (kalibrasi laju)"));
  Serial.println(F(" semai <ppm> <phmin> <phmax> | target <ppm> [phmin phmax] | panen"));
  Serial.println(F(" pem on|off | stop | buka (buka kunci pompa) | reboot"));
  Serial.println(F(" waktu YYYY-MM-DD HH:MM:SS (lokal) | wifi NAMA|SANDI | wifi hapus"));
  Serial.println(F(" server <ip> | server hapus | cari | scan"));
}

static void CetakStatus(void)
{
  StatusSistem s;
  AmbilStatusSistem(&s);
  const SnapshotSensor &x = s.sensor;
  char wifi[33], ipE[16], ipS[16];
  InfoJaringan(wifi, sizeof(wifi), ipE, sizeof(ipE), ipS, sizeof(ipS));
  Serial.println(F("---------------- STATUS ----------------"));
  Serial.printf("Firmware %s  hidup %lu dtk  heap %u\n", NAMA_FIRMWARE, (unsigned long)s.uptimeDtk, (unsigned)ESP.getFreeHeap());
  Serial.printf("Mode %s  siap=%s%s%s  pemeliharaan=%d  kegiatan=%s\n", NamaMode(s.mode), s.siap ? "ya" : "TIDAK",
                s.siap ? "" : " kurang:", s.kurang, (int)s.pemeliharaan, NamaKegiatan(s.kegiatan));
  Serial.printf("Target %.0f ppm  pH %.1f-%.1f  hari semai %u\n", (double)s.targetPpm, (double)s.phMin,
                (double)s.phMax, (unsigned)s.hariSemai);
  Serial.printf("pH %.2f (%.4f V, kal %u/2)  EC %.3f mS = %.0f ppm (%.4f V, kal %u/2)\n", (double)x.ph,
                (double)x.phVolt, JumlahTitikKalibrasi(true), (double)x.ecMs, (double)x.ppm, (double)x.ecVolt,
                JumlahTitikKalibrasi(false));
  Serial.printf("Suhu air %.1f C  ruang %.1f C  RH %.0f %%  stabil EC=%d pH=%d  sensorKunci=%d\n",
                (double)x.suhuAir, (double)x.suhuUdara, (double)x.kelembaban, (int)x.ecStabil, (int)x.phStabil, (int)x.kunci);
  Serial.printf("Air %s (bawah %s, atas %s)  kunci='%s'\n", NamaLevel(s.level), s.floatBawahNaik ? "naik" : "turun",
                s.floatAtasNaik ? "naik" : "turun", NamaKunci(s));
  Serial.printf("E-STOP fisik=%d (%lu mV) server=%d tungguReset=%d\n", (int)s.estopFisik,
                (unsigned long)TeganganEstopMv(), (int)s.estopServer, (int)s.tungguReset);
  Serial.printf("Hari ini: AB %u/%.0f  pH %u/%.0f  encer %u/%.0f  isi %u/%.0f  monitoring sisa %lu dtk\n",
                s.abHari, (double)s.param.maksAbHari, s.phHari, (double)s.param.maksPhHari, s.encerHari,
                (double)s.param.maksEncerHari, s.isiHari, (double)s.param.maksIsiHari, (unsigned long)s.sisaMonitoringDtk);
  if (s.rtcValid) {
    uint16_t th; uint8_t bl, tg, jm, mn, dt;
    PecahUnix(s.unixLokal, &th, &bl, &tg, &jm, &mn, &dt);
    Serial.printf("Jam %04u-%02u-%02u %02u:%02u:%02u\n", th, bl, tg, jm, mn, dt);
  } else {
    Serial.println("Jam BELUM VALID (menunggu NTP / detak server / perintah 'waktu')");
  }
  Serial.printf("WiFi %s  IP %s  server %s  MQTT %s  detak %s  RSSI %d  laporan tertunda %d\n",
                s.wifiOk ? wifi : "(putus)", ipE, ipS, s.mqttOk ? "OK" : "PUTUS", s.serverOk ? "OK" : "-", s.rssi,
                JumlahLaporanTertunda());
  Serial.println(F("----------------------------------------"));
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
    Serial.printf("  %-24s = %g%s\n", NamaParameter(i), (double)v,
                  (ParameterWajib(i) && v == 0.0f) ? "   <- WAJIB, belum diisi" : "");
  }
}

static void CetakKal(void)
{
  for (int i = 0; i < 2; i++) {
    bool ph = (i == 0);
    float v1, v2, a1, a2;
    InfoKalibrasi(ph, &v1, &v2, &a1, &a2);
    Serial.printf("Kalibrasi %s: titik1 %.4f V = %.3f | titik2 %.4f V = %.3f | %u/2 titik\n", ph ? "pH" : "EC",
                  (double)v1, (double)a1, (double)v2, (double)a2, JumlahTitikKalibrasi(ph));
  }
  const ParameterAlat &p = ParameterAktif();
  Serial.printf("Laju pompa: A %.3f  B %.3f  pH up %.3f  pH down %.3f mL/dtk | faktor EC %.3f\n",
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
      Serial.println("Format: wifi NAMA_WIFI|SANDI (sandi kosong atau 8-63 karakter)");
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
    Serial.printf("%s: %s\n", ok ? "OK" : "DITOLAK", pesan);
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
      Serial.println("OK: jam diatur (waktu lokal)");
    } else {
      Serial.println("DITOLAK: format 'waktu 2026-11-17 14:30:00' atau RTC tidak merespons");
    }
  } else if (!strcasecmp(kata[0], "server") && n >= 2) {
    if (!strcasecmp(kata[1], "hapus")) {
      AturServerTetap("");
    } else {
      IPAddress uji;
      if (uji.fromString(kata[1]) && (uint32_t)uji != 0) {
        AturServerTetap(kata[1]);
      } else {
        Serial.println("Format: server 192.168.1.50  (atau: server hapus)");
      }
    }
  } else if (!strcasecmp(kata[0], "cari")) {
    MintaCariServer();
  } else if (!strcasecmp(kata[0], "scan")) {
    MintaPindaiWifi();
  } else if (!strcasecmp(kata[0], "reboot")) {
    MatikanSemuaBeban();
    Serial.println("Restart...");
    delay(200);
    ESP.restart();
  } else {
    Serial.println("Perintah tidak dikenal. Ketik 'help'.");
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
    TerapkanPerintah(p);
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
