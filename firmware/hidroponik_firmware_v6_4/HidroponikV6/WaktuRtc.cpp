#include "WaktuRtc.h"
#include "Config.h"
#include <Wire.h>
#include <RTClib.h>
#include <time.h>
#include <sys/time.h>

static RTC_DS3231 JamRtc;
static bool     chipAda       = false;
static bool     waktuDiyakini = false;   /* true setelah chip tidak lost-power / sudah diatur */
static bool     cacheValid    = false;
static uint32_t cacheUnix     = 0;
static uint32_t cacheMs       = 0;
static uint32_t bacaTerakhirMs = 0;

void InisialisasiBusI2C(void)
{
  static bool sudah = false;
  if (sudah) {
    return;
  }
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(KECEPATAN_I2C);
  Wire.setTimeOut(100);
  sudah = true;
}

static bool UnixMasukAkal(uint32_t u)
{
  /* 2024-01-01 .. 2099-12-31 */
  return u >= 1704067200UL && u <= 4102444799UL;
}

bool InisialisasiJamRtc(void)
{
  InisialisasiBusI2C();

  Wire.beginTransmission(ALAMAT_RTC);
  chipAda = (Wire.endTransmission() == 0);
  if (!chipAda) {
    return false;
  }
  JamRtc.begin();
  Wire.setClock(KECEPATAN_I2C);   /* jaga-jaga: library bisa menyetel ulang bus */
  waktuDiyakini = !JamRtc.lostPower();
  bacaTerakhirMs = millis() - 2000;  /* paksa baca segera */
  PerbaruiWaktuRtc();
  return true;
}

void PerbaruiWaktuRtc(void)
{
  if (!chipAda) {
#if 1  /* tanpa chip RTC: pakai jam sistem (NTP / detak server) */
    /* tanpa chip RTC: pakai jam sistem (diisi NTP) supaya log & dosing tetap jalan */
    time_t t = time(nullptr);
    if (UnixMasukAkal((uint32_t)t)) {
      cacheUnix  = (uint32_t)t;
      cacheMs    = millis();
      cacheValid = true;
    } else {
      cacheValid = false;
    }
#else
    cacheValid = false;
#endif
    return;
  }
  uint32_t now = millis();
  if ((uint32_t)(now - bacaTerakhirMs) < 1000) {
    return;
  }
  bacaTerakhirMs = now;

  DateTime d = JamRtc.now();
  uint32_t u = d.unixtime();
  if (waktuDiyakini && UnixMasukAkal(u)) {
    cacheUnix  = u;
    cacheMs    = now;
    cacheValid = true;
  } else {
    cacheValid = false;
  }
}

bool JamRtcValid(void)
{
#if 1  /* tanpa chip RTC: pakai jam sistem (NTP / detak server) */
  if (!chipAda) {
    return cacheValid;             /* jam sistem dari NTP */
  }
#endif
  return chipAda && waktuDiyakini && cacheValid;
}

uint32_t UnixSekarang(void)
{
  if (!cacheValid) {
    return 0;
  }
  return cacheUnix + (uint32_t)(millis() - cacheMs) / 1000UL;
}

bool AturWaktuRtcDariUnix(uint32_t unixLokal)
{
  if (!UnixMasukAkal(unixLokal)) {
    return false;
  }
  if (!chipAda) {
#if 1  /* tanpa chip RTC: pakai jam sistem (NTP / detak server) */
    struct timeval tv;
    tv.tv_sec  = (time_t)unixLokal;
    tv.tv_usec = 0;
    settimeofday(&tv, nullptr);
    cacheUnix  = unixLokal;
    cacheMs    = millis();
    cacheValid = true;
    return true;
#else
    return false;
#endif
  }
  JamRtc.adjust(DateTime(unixLokal));
  waktuDiyakini  = true;
  bacaTerakhirMs = millis() - 2000;
  PerbaruiWaktuRtc();
  return cacheValid;
}

bool AturWaktuRtc(uint16_t th, uint8_t bl, uint8_t tg, uint8_t jam, uint8_t mnt, uint8_t dtk)
{
  if (th < 2024 || th > 2099 || bl < 1 || bl > 12 || tg < 1 || tg > 31 ||
      jam > 23 || mnt > 59 || dtk > 59) {
    return false;
  }
  if (!chipAda) {
    return false;
  }
  DateTime d(th, bl, tg, jam, mnt, dtk);
  return AturWaktuRtcDariUnix(d.unixtime());
}

void PecahUnix(uint32_t unixLokal, uint16_t *th, uint8_t *bl, uint8_t *tg,
               uint8_t *jam, uint8_t *mnt, uint8_t *dtk)
{
  DateTime d(unixLokal);
  if (th)  { *th  = d.year(); }
  if (bl)  { *bl  = d.month(); }
  if (tg)  { *tg  = d.day(); }
  if (jam) { *jam = d.hour(); }
  if (mnt) { *mnt = d.minute(); }
  if (dtk) { *dtk = d.second(); }
}
