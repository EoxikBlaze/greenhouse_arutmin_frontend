#include "TampilanLcd.h"
#include "Config.h"
#include "WaktuRtc.h"
#include "Komunikasi.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

static LiquidCrystal_I2C lcd(ALAMAT_LCD, 20, 4);
static char     tampil[4][21];
static bool     lcdAda = false;
static uint32_t tTerakhir = 0, tInit = 0, tGanti = 0;
static uint8_t  layarUtama = 0;

static void KosongkanCache(void)
{
  for (int r = 0; r < 4; r++) {
    memset(tampil[r], ' ', 20);
    tampil[r][20] = 0;
  }
}

static void Baris(int r, const char *teks)
{
  char buf[21];
  size_t n = strlen(teks);
  if (n > 20) {
    n = 20;
  }
  memcpy(buf, teks, n);
  memset(buf + n, ' ', 20 - n);
  buf[20] = 0;
  if (strcmp(buf, tampil[r]) != 0) {
    lcd.setCursor(0, r);
    lcd.print(buf);
    memcpy(tampil[r], buf, sizeof(buf));
  }
}

static void Layar(const char *a, const char *b, const char *c, const char *d)
{
  Baris(0, a);
  Baris(1, b);
  Baris(2, c);
  Baris(3, d);
}

void InisialisasiLcd(void)
{
  Wire.beginTransmission(ALAMAT_LCD);
  lcdAda = (Wire.endTransmission() == 0);
  if (!lcdAda) {
    Serial.println("[!] LCD 0x27 tidak terdeteksi (alat tetap jalan)");
    return;
  }
  lcd.init();
  lcd.backlight();
  lcd.clear();
  KosongkanCache();
  tInit = millis();
}

void TampilkanSplash(void)
{
  if (!lcdAda) {
    return;
  }
  Layar("    GARAP SYSTEM    ", " Vertonik Smart Farm", "  Hidroponik v" FIRMWARE_VERSI, "  Menyiapkan alat...");
  delay(1500);
  Baris(3, " Menyambung WiFi... ");
  delay(800);
}

static void Mmss(char *buf, size_t n, uint32_t dtk)
{
  snprintf(buf, n, "%02lu:%02lu", (unsigned long)(dtk / 60UL), (unsigned long)(dtk % 60UL));
}

/* Baris 4: kegiatan berjalan / kunci / belum siap. false = tidak ada (layar pakai isi sendiri). */
static bool BarisKegiatan(const StatusSistem &s, char *b, size_t n)
{
  char w[12];
  switch (s.kegiatan) {
    case KEG_DOSING_A:  snprintf(b, n, "DOSING A  %5.1f mL", (double)s.kegiatanMl); return true;
    case KEG_JEDA_AB:   Mmss(w, sizeof(w), s.kegiatanSisaDtk); snprintf(b, n, "JEDA A>B  sisa %s", w); return true;
    case KEG_DOSING_B:  snprintf(b, n, "DOSING B  %5.1f mL", (double)s.kegiatanMl); return true;
    case KEG_PH_UP:     snprintf(b, n, "pH UP %4.1f/%4.1f mL", (double)s.kegiatanMl, (double)s.kegiatanMlTotal); return true;
    case KEG_PH_DOWN:   snprintf(b, n, "pH DN %4.1f/%4.1f mL", (double)s.kegiatanMl, (double)s.kegiatanMlTotal); return true;
    case KEG_ISI_AIR:   Mmss(w, sizeof(w), s.kegiatanSisaDtk); snprintf(b, n, "ISI AIR      %s", w); return true;
    case KEG_ENCER:     Mmss(w, sizeof(w), s.kegiatanSisaDtk); snprintf(b, n, "ENCERKAN AIR %s", w); return true;
    case KEG_UJI_POMPA: snprintf(b, n, "UJI POMPA  sisa %lus", (unsigned long)s.kegiatanSisaDtk); return true;
    default: break;
  }
  if (s.level == LEVEL_ERROR)             { snprintf(b, n, "FLOAT ERROR: cek!"); return true; }
  if (s.kunciIsi == KUNCI_ISI_SERING)     { snprintf(b, n, "ISI TERKUNCI: bocor?"); return true; }
  if (s.kunciIsi == KUNCI_ISI_TIMEOUT)    { snprintf(b, n, "ISI TERKUNCI: lama"); return true; }
  if (s.pompaKelamaan)                    { snprintf(b, n, "POMPA KELAMAAN:RESET"); return true; }
  if (s.ecCuriga)                         { snprintf(b, n, "EC TURUN! cek probe"); return true; }
  if (s.nutrisiHabis)                     { snprintf(b, n, "NUTRISI HABIS? RESET"); return true; }
  if (s.sensor.kunci)                     { snprintf(b, n, "SENSOR RUSAK: cek"); return true; }
  if (s.ppmTerlaluRendah)                 { snprintf(b, n, "ppm ~0: cek probe EC"); return true; }
  if (!s.siap)                            { snprintf(b, n, "BELUM SIAP:%s", s.kurang); return true; }
  return false;
}

static void Angka(char *b, size_t n, bool ada, float v, const char *fmt, const char *kosong)
{
  if (ada && isfinite(v)) {
    snprintf(b, n, fmt, (double)v);
  } else {
    snprintf(b, n, "%s", kosong);
  }
}

static void LayarUtama1(const StatusSistem &s, const char *b4)
{
  const SnapshotSensor &x = s.sensor;
  char ph[8], ppm[8], ec[8], air[8], rg[8], rh[6], r[4][40];
  Angka(ph, sizeof(ph), x.phValid, x.ph, "%.2f", "--.--");
  Angka(ppm, sizeof(ppm), x.ecValid, x.ppm, "%.0f", "----");
  Angka(ec, sizeof(ec), x.ecValid, x.ecMs, "%.2f", "-.--");
  Angka(air, sizeof(air), x.suhuAirValid, x.suhuAir, "%.1f", "--.-");
  Angka(rg, sizeof(rg), x.udaraValid, x.suhuUdara, "%.1f", "--.-");
  Angka(rh, sizeof(rh), x.udaraValid, x.kelembaban, "%.0f", "--");
  snprintf(r[0], sizeof(r[0]), "pH %-5s  %5s ppm", ph, ppm);
  snprintf(r[1], sizeof(r[1]), "EC %-4smS Air %sC", ec, air);
  snprintf(r[2], sizeof(r[2]), "Rg %sC   RH %s%%", rg, rh);
  if (b4) {
    snprintf(r[3], sizeof(r[3]), "%s", b4);
  } else {
    char hari[8] = "";
    if (s.mode == MODE_SEMAI && s.hariSemai > 0) {
      snprintf(hari, sizeof(hari), "H%u", (unsigned)s.hariSemai);
    }
    snprintf(r[3], sizeof(r[3]), "%-5s %-5s %s", NamaMode(s.mode), hari, s.mqttOk ? "  ONLINE" : " OFFLINE");
  }
  Layar(r[0], r[1], r[2], r[3]);
}

static void LayarUtama2(const StatusSistem &s, const char *b4)
{
  char r[4][40];
  if (s.targetPpm > 0) {
    snprintf(r[0], sizeof(r[0]), "Target %5.0f ppm", (double)s.targetPpm);
  } else {
    snprintf(r[0], sizeof(r[0]), "Target  belum ada");
  }
  if (s.phMax > 0) {
    snprintf(r[1], sizeof(r[1]), "pH jaga %.1f - %.1f", (double)s.phMin, (double)s.phMax);
  } else {
    snprintf(r[1], sizeof(r[1]), "pH jaga belum ada");
  }
  snprintf(r[2], sizeof(r[2]), "Air:%-6s AB%u pH%u", NamaLevel(s.level), (unsigned)s.abHari, (unsigned)s.phHari);
  if (b4) {
    snprintf(r[3], sizeof(r[3]), "%s", b4);
  } else if (s.mode != MODE_SEMAI) {
    snprintf(r[3], sizeof(r[3]), "Dosing OFF (%s)", NamaMode(s.mode));
  } else if (s.batasAbPenuh || s.batasPhPenuh) {
    snprintf(r[3], sizeof(r[3]), "Batas harian penuh");
  } else if (s.encerTertunda) {
    snprintf(r[3], sizeof(r[3]), "ppm tinggi,tunggu air");
  } else if (s.sisaMonitoringDtk > 0) {
    snprintf(r[3], sizeof(r[3]), "Cek lagi  %3lu mnt", (unsigned long)((s.sisaMonitoringDtk + 59UL) / 60UL));
  } else if (s.dosingTerakhirUnix > 0) {
    uint8_t jam = 0, mnt = 0;
    PecahUnix(s.dosingTerakhirUnix, NULL, NULL, NULL, &jam, &mnt, NULL);
    snprintf(r[3], sizeof(r[3]), "Dosing akhir %02u:%02u", jam, mnt);
  } else {
    snprintf(r[3], sizeof(r[3]), "Memantau...");
  }
  Layar(r[0], r[1], r[2], r[3]);
}

static void LayarPemeliharaan(const StatusSistem &s, const char *b4)
{
  char r[4][40], ph[8], ec[8];
  Angka(ph, sizeof(ph), true, s.sensor.phVolt, "%.3f", "-.---");
  Angka(ec, sizeof(ec), true, s.sensor.ecVolt, "%.3f", "-.---");
  snprintf(r[0], sizeof(r[0]), "== PEMELIHARAAN ==");
  snprintf(r[1], sizeof(r[1]), "pH %sV EC %sV", ph, ec);
  snprintf(r[2], sizeof(r[2]), "%s", (s.kegiatan != KEG_DIAM && b4) ? b4 : s.langkahPemeliharaan);
  snprintf(r[3], sizeof(r[3]), "Sisa waktu %3lu mnt", (unsigned long)((s.sisaPemeliharaanDtk + 59UL) / 60UL));
  Layar(r[0], r[1], r[2], r[3]);
}

static void LayarInfo(const StatusSistem &s)
{
  char wifi[33], ipE[16], ipS[16], r[4][40];
  InfoJaringan(wifi, sizeof(wifi), ipE, sizeof(ipE), ipS, sizeof(ipS));
  snprintf(r[0], sizeof(r[0]), "WIFI:%s", s.wifiOk ? wifi : "(putus)");
  snprintf(r[1], sizeof(r[1]), "ESP :%s", s.wifiOk ? ipE : "-");
  snprintf(r[2], sizeof(r[2]), "SRV :%s", ipS);
  snprintf(r[3], sizeof(r[3]), "MQTT:%s %s", s.mqttOk ? "OK" : "PUTUS", s.serverOk ? "detak OK" : "");
  Layar(r[0], r[1], r[2], r[3]);
}

void PerbaruiLcd(const StatusSistem &s)
{
  uint32_t now = millis();
  if (!lcdAda || (uint32_t)(now - tTerakhir) < INTERVAL_LCD_MS) {
    return;
  }
  tTerakhir = now;
  if ((uint32_t)(now - tInit) > 10UL * 60000UL) {
    lcd.init();                 /* pulihkan LCD bila sempat kacau karena derau */
    lcd.backlight();
    KosongkanCache();
    tInit = now;
  }

  if (s.otaBerjalan) {
    char r[24];
    snprintf(r, sizeof(r), "Proses   %3u %%", (unsigned)s.otaPersen);
    Layar("== UPDATE PROGRAM ==", "Semua pompa MATI", "JANGAN cabut listrik", r);
    return;
  }
  if (s.estopFisik) {
    Layar("!!! E-STOP AKTIF !!!", "Semua pompa MATI", "Lepas tombol E-STOP", "lalu tekan RESET");
    return;
  }
  if (s.tungguReset) {
    Layar("E-STOP sudah lepas", "Tekan RESET untuk", "melanjutkan", "");
    return;
  }
  if (s.estopServer) {
    Layar("E-STOP DARI SERVER", "Semua pompa MATI", "Buka lewat web", "(admin)");
    return;
  }
  if (s.layarSementara == 2) {
    Layar("     RESET OK", "Alat kembali normal", "Dosing menunggu", "1 waktu monitoring");
    return;
  }
  if (s.layarSementara == 3) {
    Layar("  KUNCI DIBUKA", "Pompa boleh jalan", "lagi. Pastikan", "tidak ada bocor!");
    return;
  }
  if (s.layarSementara == 1) {
    LayarInfo(s);
    return;
  }

  char b4buf[40];
  const char *b4 = BarisKegiatan(s, b4buf, sizeof(b4buf)) ? b4buf : NULL;
  if (s.pemeliharaan) {
    LayarPemeliharaan(s, b4);
    return;
  }
  if ((uint32_t)(now - tGanti) >= GANTI_LAYAR_MS) {
    tGanti = now;
    layarUtama ^= 1;
  }
  if (layarUtama == 0) {
    LayarUtama1(s, b4);
  } else {
    LayarUtama2(s, b4);
  }
}
