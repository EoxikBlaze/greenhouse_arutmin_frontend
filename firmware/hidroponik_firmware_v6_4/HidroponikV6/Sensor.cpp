#include "Sensor.h"
#include "Config.h"
#include "WaktuRtc.h"
#include <Wire.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_SHT31.h>
#include <math.h>
#include <string.h>
#include <stdio.h>

/* ===========================================================================
 *  ADS1115 lewat register: single-shot, +/-4,096 V (0,125 mV/LSB), 128 SPS
 * ========================================================================= */
static bool AdsAda = false;

static bool BacaAdsSekali(uint8_t kanal, float *volt)
{
  if (kanal > 3 || volt == NULL) {
    return false;
  }
  uint16_t cfg = (uint16_t)(0x8000 | ((uint16_t)(4 + kanal) << 12) | 0x0200 | 0x0100 | 0x0080 | 0x0003);
  Wire.beginTransmission(ALAMAT_ADS1115);
  Wire.write((uint8_t)0x01);
  Wire.write((uint8_t)(cfg >> 8));
  Wire.write((uint8_t)(cfg & 0xFF));
  if (Wire.endTransmission() != 0) {
    return false;
  }
  uint32_t t0 = millis();
  delay(8);
  for (;;) {
    Wire.beginTransmission(ALAMAT_ADS1115);
    Wire.write((uint8_t)0x01);
    if (Wire.endTransmission() != 0 || Wire.requestFrom((int)ALAMAT_ADS1115, 2) != 2) {
      return false;
    }
    uint8_t hi = (uint8_t)Wire.read();
    (void)Wire.read();
    if (hi & 0x80) {
      break;
    }
    if ((uint32_t)(millis() - t0) > 40) {
      return false;
    }
    delay(1);
  }
  Wire.beginTransmission(ALAMAT_ADS1115);
  Wire.write((uint8_t)0x00);
  if (Wire.endTransmission() != 0 || Wire.requestFrom((int)ALAMAT_ADS1115, 2) != 2) {
    return false;
  }
  uint8_t h = (uint8_t)Wire.read();
  uint8_t l = (uint8_t)Wire.read();
  *volt = (float)(int16_t)(((uint16_t)h << 8) | l) * 0.000125f;
  return true;
}

static bool BacaAdsRata(uint8_t kanal, int n, float *volt)
{
  float jumlah = 0;
  for (int i = 0; i < n; i++) {
    float v;
    if (!BacaAdsSekali(kanal, &v)) {
      return false;
    }
    jumlah += v;
  }
  *volt = jumlah / (float)n;
  return true;
}

/* ===========================================================================
 *  Jendela median
 * ========================================================================= */
struct Jendela {
  float   v[UKURAN_JENDELA];
  uint8_t n;
  uint8_t idx;
};

static void JendelaKosong(Jendela &j) { j.n = 0; j.idx = 0; }

static void JendelaTambah(Jendela &j, float x)
{
  j.v[j.idx] = x;
  j.idx = (uint8_t)((j.idx + 1) % UKURAN_JENDELA);
  if (j.n < UKURAN_JENDELA) {
    j.n++;
  }
}

static float JendelaMedian(const Jendela &j)
{
  if (j.n == 0) {
    return NAN;
  }
  float t[UKURAN_JENDELA];
  for (uint8_t i = 0; i < j.n; i++) {
    t[i] = j.v[i];
  }
  for (uint8_t i = 1; i < j.n; i++) {
    float k = t[i];
    int m = i - 1;
    while (m >= 0 && t[m] > k) {
      t[m + 1] = t[m];
      m--;
    }
    t[m + 1] = k;
  }
  return (j.n & 1) ? t[j.n / 2] : (t[j.n / 2 - 1] + t[j.n / 2]) / 2.0f;
}

static float JendelaSebaran(const Jendela &j)
{
  if (j.n == 0) {
    return 0;
  }
  float mn = j.v[0], mx = j.v[0];
  for (uint8_t i = 1; i < j.n; i++) {
    if (j.v[i] < mn) { mn = j.v[i]; }
    if (j.v[i] > mx) { mx = j.v[i]; }
  }
  return mx - mn;
}

/* ===========================================================================
 *  Kalibrasi 2 titik — kunci NVS kompatibel dengan sketch uji & v5:
 *   titik1, titik2, acuan1, acuan2, waktu, jumlah (2 = lengkap)
 *   cadangan set lengkap sebelumnya: cv1, cv2, ca1, ca2, cwaktu, cjumlah
 *   baru di v6: "ada" (bit0 = titik1, bit1 = titik2) agar titik tunggal tidak hilang saat reboot
 * ========================================================================= */
struct Kalibrasi {
  const char *ns;
  bool     terisi[3];
  float    v[3];
  float    acuan[3];
  uint32_t waktu;
};

static const float ACUAN_EC_1 = 1.413f, ACUAN_EC_2 = 12.88f;
static const float ACUAN_PH_1 = 4.01f,  ACUAN_PH_2 = 6.86f;

static Kalibrasi KalEc = { "kalibrasi_ec", { false, false, false }, { 0, 0, 0 }, { 0, ACUAN_EC_1, ACUAN_EC_2 }, 0 };
static Kalibrasi KalPh = { "kalibrasi_ph", { false, false, false }, { 0, 0, 0 }, { 0, ACUAN_PH_1, ACUAN_PH_2 }, 0 };
static float faktorEc = 1.0f;

static bool KalLengkap(const Kalibrasi &k) { return k.terisi[1] && k.terisi[2]; }

static void SimpanKal(const Kalibrasi &k)
{
  Preferences p;
  if (!p.begin(k.ns, false)) {
    return;
  }
  p.putFloat("titik1", k.v[1]);
  p.putFloat("titik2", k.v[2]);
  p.putFloat("acuan1", k.acuan[1]);
  p.putFloat("acuan2", k.acuan[2]);
  p.putUInt("waktu", k.waktu);
  p.putInt("jumlah", (k.terisi[1] ? 1 : 0) + (k.terisi[2] ? 1 : 0));
  p.putFloat("titik0", k.v[0]);                 /* v6.3: titik 0 EC (opsional, air tawar / udara) */
  p.putFloat("acuan0", k.acuan[0]);
  p.putUChar("ada", (uint8_t)((k.terisi[1] ? 1 : 0) | (k.terisi[2] ? 2 : 0) | (k.terisi[0] ? 4 : 0)));
  p.end();
}

static void CadangkanKal(const Kalibrasi &k)
{
  if (!KalLengkap(k)) {
    return;
  }
  Preferences p;
  if (!p.begin(k.ns, false)) {
    return;
  }
  p.putFloat("cv1", k.v[1]);
  p.putFloat("cv2", k.v[2]);
  p.putFloat("ca1", k.acuan[1]);
  p.putFloat("ca2", k.acuan[2]);
  p.putUInt("cwaktu", k.waktu);
  p.putInt("cjumlah", 2);
  p.end();
}

static void MuatKal(Kalibrasi &k, float acuan1, float acuan2)
{
  k.terisi[0] = k.terisi[1] = k.terisi[2] = false;
  k.v[0] = 0;
  k.acuan[0] = 0;
  k.acuan[1] = acuan1;
  k.acuan[2] = acuan2;
  k.waktu = 0;
  Preferences p;
  if (!p.begin(k.ns, true)) {
    return;
  }
  int   jumlah = p.getInt("jumlah", -1);
  uint8_t ada = p.getUChar("ada", 0);
  float v1 = p.getFloat("titik1", -1.0f);
  float v2 = p.getFloat("titik2", -1.0f);
  float a1 = p.getFloat("acuan1", acuan1);
  float a2 = p.getFloat("acuan2", acuan2);
  uint32_t w = p.getUInt("waktu", 0);
  float v0 = p.getFloat("titik0", -1.0f);
  float a0 = p.getFloat("acuan0", -1.0f);
  p.end();

  if (jumlah == 2) {
    ada = 3;
  }
  bool ok1 = (ada & 1) && isfinite(v1) && v1 >= -0.05f && v1 < 6.0f;
  bool ok2 = (ada & 2) && isfinite(v2) && v2 >= -0.05f && v2 < 6.0f;
  if (ok1 && ok2 && fabsf(v1 - v2) < 0.001f) {
    ok1 = ok2 = false;
  }
  if (!isfinite(a1) || a1 <= 0.0f) { a1 = acuan1; }
  if (!isfinite(a2) || a2 <= 0.0f) { a2 = acuan2; }
  if (a1 == a2) { a1 = acuan1; a2 = acuan2; }
  k.v[1] = v1; k.v[2] = v2;
  k.acuan[1] = a1; k.acuan[2] = a2;
  k.terisi[1] = ok1;
  k.terisi[2] = ok2;
  k.waktu = w;
  /* titik 0 hanya sah bila di bawah titik 1 (tegangan dan acuan) */
  if ((ada & 4) && ok1 && isfinite(v0) && isfinite(a0) && v0 >= -0.05f && v0 < v1 - 0.005f &&
      a0 >= 0.0f && a0 < a1) {
    k.v[0] = v0;
    k.acuan[0] = a0;
    k.terisi[0] = true;
  }
}

static bool KembalikanKal(Kalibrasi &k)
{
  Preferences p;
  if (!p.begin(k.ns, true)) {
    return false;
  }
  int   jumlah = p.getInt("cjumlah", -1);
  float v1 = p.getFloat("cv1", -1.0f);
  float v2 = p.getFloat("cv2", -1.0f);
  float a1 = p.getFloat("ca1", 0.0f);
  float a2 = p.getFloat("ca2", 0.0f);
  uint32_t w = p.getUInt("cwaktu", 0);
  p.end();
  if (jumlah != 2 || v1 < -0.05f || v2 < -0.05f || fabsf(v1 - v2) < 0.001f || a1 <= 0.0f || a2 <= 0.0f) {
    return false;
  }
  k.v[1] = v1; k.v[2] = v2;
  k.acuan[1] = a1; k.acuan[2] = a2;
  k.waktu = w;
  k.terisi[1] = k.terisi[2] = true;
  SimpanKal(k);
  return true;
}

/* ===========================================================================
 *  Keadaan sampler
 * ========================================================================= */
static Jendela JEc, JPh;
static OneWire           JalurSuhu(PIN_SUHU_AIR);
static DallasTemperature SensorSuhu(&JalurSuhu);
static Adafruit_SHT31    SensorUdara;
static bool SuhuAdaPerangkat = false, UdaraAda = false;

static bool     suhuDiminta = false, suhuPernahValid = false;
static uint32_t tSuhuMinta = 0, tSuhuValid = 0;
static float    suhuTerakhir = NAN;

static float    ecTerima = NAN;
static uint8_t  lonjakanBeruntun = 0;
static uint32_t tEcValid = 0, tPhValid = 0;
static bool     ecPernah = false, phPernah = false;
static uint8_t  invalidEc = 0, invalidPh = 0, invalidSuhu = 0;
static uint8_t  validEc = 0, validPh = 0, validSuhu = 0;
static bool     kunciSensor = false;

static float    voltEc = NAN, voltPh = NAN;
static float    ecTerakhirMentah = NAN;   /* hasil hitung terakhir (juga yang ditolak sanity) — untuk diagnosa */
static float    udaraSuhu = NAN, udaraRh = NAN;
static uint32_t tUdaraValid = 0;
static bool     udaraPernahValid = false;
static uint32_t tSiklus = 0, tUdaraBaca = 0;

struct StateFloat {
  int      pin;
  bool     stabil;
  bool     mentah;
  uint32_t tUbah;
};
static StateFloat FBawah = { PIN_FLOAT_BAWAH, false, false, 0 };
static StateFloat FAtas  = { PIN_FLOAT_ATAS,  false, false, 0 };

static bool BacaTerangkat(const StateFloat &f) { return digitalRead(f.pin) == TINGKAT_FLOAT_TERANGKAT; }

static void MulaiFloat(StateFloat &f)
{
  pinMode(f.pin, INPUT_PULLUP);
  f.mentah = f.stabil = BacaTerangkat(f);
  f.tUbah = millis();
}

static void PerbaruiFloatSatu(StateFloat &f, uint32_t now)
{
  bool m = BacaTerangkat(f);
  if (m != f.mentah) {
    f.mentah = m;
    f.tUbah = now;
  }
  if (f.mentah != f.stabil && (uint32_t)(now - f.tUbah) >= DEBOUNCE_FLOAT_MS) {
    f.stabil = f.mentah;
  }
}

bool FloatBawahNaik(void) { return PAKSA_FLOAT_BAWAH_NAIK || FBawah.stabil; }
bool FloatAtasNaik(void)  { return FAtas.stabil; }

void TetapkanFaktorEc(float f)
{
  if (isfinite(f) && f >= 0.2f && f <= 5.0f) {
    faktorEc = f;
  }
}

/* ===========================================================================
 *  Inisialisasi
 * ========================================================================= */
static bool CariSuhuAir(void)
{
  DeviceAddress alamat;
  return SensorSuhu.getAddress(alamat, 0);
}

bool InisialisasiSensor(void)
{
  InisialisasiBusI2C();
  Wire.beginTransmission(ALAMAT_ADS1115);
  AdsAda = (Wire.endTransmission() == 0);

  MuatKal(KalEc, ACUAN_EC_1, ACUAN_EC_2);
  MuatKal(KalPh, ACUAN_PH_1, ACUAN_PH_2);

  SensorSuhu.begin();
  SensorSuhu.setResolution(12);
  SensorSuhu.setWaitForConversion(false);
  SuhuAdaPerangkat = CariSuhuAir();
  if (SuhuAdaPerangkat) {
    SensorSuhu.requestTemperatures();
    suhuDiminta = true;
    tSuhuMinta = millis();
  }
  UdaraAda = SensorUdara.begin(ALAMAT_SHT31);

  MulaiFloat(FBawah);
  MulaiFloat(FAtas);

  ResetJendelaSensor();
  tSiklus = millis() - INTERVAL_SIKLUS_SENSOR_MS;
  tUdaraBaca = millis() - 5000;
  return AdsAda;
}

void ResetJendelaSensor(void)
{
  JendelaKosong(JEc);
  JendelaKosong(JPh);
  ecTerima = NAN;
  lonjakanBeruntun = 0;
  invalidEc = invalidPh = invalidSuhu = 0;
  validEc = validPh = validSuhu = 0;
  ecPernah = phPernah = false;
  kunciSensor = false;
}

/* ===========================================================================
 *  Konversi
 * ========================================================================= */
static bool HitungEc(float vModul, float suhu, float *ecMs)
{
  float denom = KalEc.v[2] - KalEc.v[1];
  if (fabsf(denom) < 0.001f) {
    return false;
  }
  float ecMentah = KalEc.acuan[1] + (vModul - KalEc.v[1]) * (KalEc.acuan[2] - KalEc.acuan[1]) / denom;
  if (vModul < KalEc.v[1]) {
    /* v6.3: di bawah titik 1 (1413 uS) garis 1413-12880 meleset ke negatif (air tawar 100 ppm
       terbaca 0). Pakai garis titik 0 -> titik 1. Titik 0 = 'kal ec 0' (bila ada), bawaan 0 V = 0 mS. */
    float v0 = KalEc.terisi[0] ? KalEc.v[0] : 0.0f;
    float a0 = KalEc.terisi[0] ? KalEc.acuan[0] : 0.0f;
    if (KalEc.v[1] - v0 > 0.005f) {
      ecMentah = a0 + (vModul - v0) * (KalEc.acuan[1] - a0) / (KalEc.v[1] - v0);
    }
  }
  float faktor = 1.0f + KOEF_SUHU_EC * (suhu - 25.0f);
  if (faktor < 0.3f) {
    return false;
  }
  float ec = ecMentah / faktor * faktorEc;
  if (ec < 0.0f) {
    /* Air biasa / sangat tawar berada di bawah titik kalibrasi terendah (1413 uS) sehingga garis
       kalibrasi menghasilkan angka negatif. Tegangan ADS tetap terbaca normal, jadi ini BUKAN sensor
       rusak: tampilkan 0. (Probe di udara juga 0 — ditangani pengaman ppm_min_dosing di Kontrol.) */
    ec = 0.0f;
  }
  *ecMs = ec;
  return true;
}

static bool HitungPh(float v, float *ph)
{
  float denom = KalPh.v[2] - KalPh.v[1];
  if (fabsf(denom) < 0.001f) {
    return false;
  }
  *ph = KalPh.acuan[1] + (v - KalPh.v[1]) * (KalPh.acuan[2] - KalPh.acuan[1]) / denom;
  return true;
}

/* ===========================================================================
 *  Siklus pembacaan (tiap 2 dtk)
 * ========================================================================= */
static bool SuhuSegar(uint32_t now)
{
  return suhuPernahValid && (uint32_t)(now - tSuhuValid) <= UMUR_MAKS_DATA_MS;
}

static void SiklusSuhuAir(uint32_t now)
{
  bool ok = false;
  float t = NAN;
  if (!SuhuAdaPerangkat) {
    SuhuAdaPerangkat = CariSuhuAir();
  }
  if (SuhuAdaPerangkat) {
    if (suhuDiminta && (uint32_t)(now - tSuhuMinta) >= 800) {
      t = SensorSuhu.getTempCByIndex(0);
      ok = (t != DEVICE_DISCONNECTED_C) && isfinite(t) && t >= SANITY_SUHU_MIN && t <= SANITY_SUHU_MAX;
    }
    SensorSuhu.requestTemperatures();
    suhuDiminta = true;
    tSuhuMinta = now;
  }
  if (ok) {
    suhuTerakhir = t;
    suhuPernahValid = true;
    tSuhuValid = now;
    invalidSuhu = 0;
    if (validSuhu < 250) { validSuhu++; }
  } else {
    validSuhu = 0;
    if (invalidSuhu < 250) { invalidSuhu++; }
  }
}

static void SiklusEc(uint32_t now)
{
  float v = 0, ec = 0;
  bool ok = AdsAda && BacaAdsRata(KANAL_ADS_EC, 8, &v);
  if (ok) {
    v *= FAKTOR_PEMBAGI_EC;
    voltEc = v;                   /* tegangan tetap dikirim walau belum dikalibrasi */
  } else {
    voltEc = NAN;
    ecTerakhirMentah = NAN;
  }
  if (!KalLengkap(KalEc)) {
    validEc = 0;
    return;
  }
  if (ok) {
    /* Suhu air belum terbaca: tetap hitung dengan 25 C (seperti sketch uji) agar EC tampil.
       Dosing tetap terkunci karena Kontrol mewajibkan suhuAirValid. */
    float suhu = SuhuSegar(now) ? suhuTerakhir : 25.0f;
    ok = HitungEc(v, suhu, &ec) && isfinite(ec) && ec >= SANITY_EC_MIN_MS && ec <= SANITY_EC_MAX_MS;
    ecTerakhirMentah = ec;
  }
  if (!ok) {
    if (invalidEc < 2) {          /* 1-2 sampel buruk ditoleransi agar tampilan tidak berkedip */
      invalidEc++;
      return;
    }
    validEc = 0;
    if (invalidEc < 250) { invalidEc++; }
    return;
  }
  if (isfinite(ecTerima) && fabsf(ec - ecTerima) > LONJAKAN_EC_MS && lonjakanBeruntun < LONJAKAN_MAKS_DIABAIKAN) {
    lonjakanBeruntun++;           /* lonjakan mendadak: tunggu bertahan dulu */
    return;
  }
  lonjakanBeruntun = 0;
  ecTerima = ec;
  JendelaTambah(JEc, ec);
  ecPernah = true;
  tEcValid = now;
  invalidEc = 0;
  if (validEc < 250) { validEc++; }
}

static void SiklusPh(uint32_t now)
{
  float v = 0, ph = 0;
  bool ok = AdsAda && BacaAdsRata(KANAL_ADS_PH, 4, &v);
  voltPh = ok ? v : NAN;          /* selalu dibaca: dibutuhkan web untuk kalibrasi */
  if (!KalLengkap(KalPh)) {
    return;
  }
  if (ok) {
    ok = HitungPh(v, &ph) && isfinite(ph) && ph >= SANITY_PH_MIN && ph <= SANITY_PH_MAX;
  }
  if (!ok) {
    if (invalidPh < 2) {
      invalidPh++;
      return;
    }
    validPh = 0;
    if (invalidPh < 250) { invalidPh++; }
    return;
  }
  JendelaTambah(JPh, ph);
  phPernah = true;
  tPhValid = now;
  invalidPh = 0;
  if (validPh < 250) { validPh++; }
}

static void SiklusUdara(uint32_t now)
{
  if (!UdaraAda) {
    UdaraAda = SensorUdara.begin(ALAMAT_SHT31);
    if (!UdaraAda) {
      return;
    }
  }
  float t = SensorUdara.readTemperature();
  float h = SensorUdara.readHumidity();
  if (isfinite(t) && isfinite(h) && t >= SANITY_UDARA_SUHU_MIN && t <= SANITY_UDARA_SUHU_MAX &&
      h >= 0.0f && h <= 100.0f) {
    udaraSuhu = t;
    udaraRh = h;
    tUdaraValid = now;
    udaraPernahValid = true;
  }
}

static void EvaluasiKunci(void)
{
  bool buruk = (invalidSuhu >= BATAS_INVALID_BERTURUT) ||
               (KalLengkap(KalEc) && invalidEc >= BATAS_INVALID_BERTURUT) ||
               (KalLengkap(KalPh) && invalidPh >= BATAS_INVALID_BERTURUT);
  if (buruk) {
    kunciSensor = true;
    return;
  }
  if (kunciSensor && validSuhu >= SYARAT_VALID_PULIH &&
      (!KalLengkap(KalEc) || validEc >= SYARAT_VALID_PULIH) &&
      (!KalLengkap(KalPh) || validPh >= SYARAT_VALID_PULIH)) {
    kunciSensor = false;
  }
}

void PerbaruiSensor(void)
{
  uint32_t now = millis();
  PerbaruiFloatSatu(FBawah, now);
  PerbaruiFloatSatu(FAtas, now);

  if ((uint32_t)(now - tUdaraBaca) >= 5000) {
    tUdaraBaca = now;
    SiklusUdara(now);
  }
  if ((uint32_t)(now - tSiklus) < INTERVAL_SIKLUS_SENSOR_MS) {
    return;
  }
  tSiklus = now;
  SiklusSuhuAir(now);
  SiklusEc(now);
  SiklusPh(now);
  EvaluasiKunci();
}

void AmbilSnapshotSensor(SnapshotSensor *s)
{
  if (s == NULL) {
    return;
  }
  uint32_t now = millis();
  memset(s, 0, sizeof(*s));
  s->adsAda = AdsAda;
  s->ecTerkalibrasi = KalLengkap(KalEc);
  s->phTerkalibrasi = KalLengkap(KalPh);

  bool ecSegar = ecPernah && (uint32_t)(now - tEcValid) <= UMUR_MAKS_DATA_MS;
  s->ecValid  = s->ecTerkalibrasi && ecSegar && JEc.n >= SAMPEL_MINIMAL_VALID;
  s->ecStabil = s->ecValid && JEc.n >= UKURAN_JENDELA && JendelaSebaran(JEc) <= AMBANG_STABIL_EC_MS;
  s->ecMs = s->ecValid ? JendelaMedian(JEc) : NAN;
  s->ppm  = s->ecValid ? s->ecMs * PPM_PER_MS : NAN;

  bool phSegar = phPernah && (uint32_t)(now - tPhValid) <= UMUR_MAKS_DATA_MS;
  s->phValid  = s->phTerkalibrasi && phSegar && JPh.n >= SAMPEL_MINIMAL_VALID;
  s->phStabil = s->phValid && JPh.n >= UKURAN_JENDELA && JendelaSebaran(JPh) <= AMBANG_STABIL_PH;
  s->ph = s->phValid ? JendelaMedian(JPh) : NAN;

  s->suhuAirValid = SuhuSegar(now);
  s->suhuAir = s->suhuAirValid ? suhuTerakhir : NAN;
  s->udaraValid = udaraPernahValid && (uint32_t)(now - tUdaraValid) <= 3 * UMUR_MAKS_DATA_MS;
  s->suhuUdara = s->udaraValid ? udaraSuhu : NAN;
  s->kelembaban = s->udaraValid ? udaraRh : NAN;
  s->kunci = kunciSensor;
  s->ecVolt = voltEc;
  s->phVolt = voltPh;
}

float EcMentahTerakhir(void) { return ecTerakhirMentah; }

/* ===========================================================================
 *  Kalibrasi
 * ========================================================================= */
uint8_t JumlahTitikKalibrasi(bool ph)
{
  const Kalibrasi &k = ph ? KalPh : KalEc;
  return (uint8_t)((k.terisi[1] ? 1 : 0) + (k.terisi[2] ? 1 : 0));
}

void InfoKalibrasi(bool ph, float *v1, float *v2, float *a1, float *a2)
{
  const Kalibrasi &k = ph ? KalPh : KalEc;
  if (v1) { *v1 = k.terisi[1] ? k.v[1] : NAN; }
  if (v2) { *v2 = k.terisi[2] ? k.v[2] : NAN; }
  if (a1) { *a1 = k.acuan[1]; }
  if (a2) { *a2 = k.acuan[2]; }
}

float AcuanBawaan(bool ph, uint8_t titik)
{
  if (ph) {
    return (titik == 1) ? ACUAN_PH_1 : ACUAN_PH_2;
  }
  if (titik == 0) {
    return 0.0f;                    /* titik 0 EC bawaan: probe di udara / air suling = 0 mS */
  }
  /* larutan baku bernilai nominal pada 25 C; nilai sebenarnya = nominal x (1 + 0,02 (T-25)) */
  float suhu = SuhuSegar(millis()) ? suhuTerakhir : 25.0f;
  float nominal = (titik == 1) ? ACUAN_EC_1 : ACUAN_EC_2;
  return nominal * (1.0f + KOEF_SUHU_EC * (suhu - 25.0f));
}

bool UkurKalibrasi(bool ph, uint8_t titik, float *volt, char *pesan, size_t n)
{
  if (titik > 2 || (titik == 0 && ph)) {
    snprintf(pesan, n, "titik_harus_1_atau_2");
    return false;
  }
  const int JUMLAH = 16;
  uint8_t kanal = ph ? KANAL_ADS_PH : KANAL_ADS_EC;
  float pembagi = ph ? 1.0f : FAKTOR_PEMBAGI_EC;
  float batas = ph ? 0.03f : 0.04f;
  float jumlah = 0, mn = 1e9f, mx = -1e9f;
  for (int i = 0; i < JUMLAH; i++) {
    float v;
    if (!AdsAda || !BacaAdsRata(kanal, 2, &v)) {
      snprintf(pesan, n, "ads1115_tidak_terbaca");
      return false;
    }
    v *= pembagi;
    jumlah += v;
    if (v < mn) { mn = v; }
    if (v > mx) { mx = v; }
    delay(25);
  }
  float rata = jumlah / (float)JUMLAH;
  *volt = rata;
  if ((mx - mn) > batas) {
    snprintf(pesan, n, "belum_tenang_sebaran_%.3fV", (double)(mx - mn));
    return false;
  }
  float vMin = (titik == 0) ? 0.0f : 0.05f;      /* titik 0 (udara / air tawar) boleh mendekati 0 V */
  if (ph ? (rata < vMin || rata > 3.3f) : (rata < vMin || rata > 5.0f)) {
    snprintf(pesan, n, "tegangan_%.3fV_di_luar_rentang", (double)rata);
    return false;
  }
  snprintf(pesan, n, "ok");
  return true;
}

static bool CekTitik(const Kalibrasi &k, bool ph, uint8_t titik, float v, char *pesan, size_t n)
{
  if (titik == 0) {
    if (!k.terisi[1]) {
      snprintf(pesan, n, "kalibrasi_titik_1_dulu");
      return false;
    }
    if (v > k.v[1] - 0.005f) {
      snprintf(pesan, n, "titik0_harus_di_bawah_titik1_1413uS");
      return false;
    }
    return true;
  }
  uint8_t lain = (titik == 1) ? 2 : 1;
  if (!k.terisi[lain]) {
    return true;
  }
  float d = v - k.v[lain];
  if (fabsf(d) < (ph ? 0.05f : 0.02f)) {
    snprintf(pesan, n, "tegangan_sama_dengan_titik_lain");
    return false;
  }
  if (!ph) {
    bool urutBenar = (titik == 2) ? (v > k.v[1]) : (k.v[2] > v);
    if (!urutBenar) {
      snprintf(pesan, n, "urutan_terbalik_titik1_1413uS_titik2_12880uS");
      return false;
    }
  }
  return true;
}

bool SimpanTitikKalibrasi(bool ph, uint8_t titik, float volt, float acuan, char *pesan, size_t n)
{
  Kalibrasi &k = ph ? KalPh : KalEc;
  if (titik > 2 || (titik == 0 && ph) || !isfinite(volt) || !isfinite(acuan) || acuan < 0.0f ||
      (titik > 0 && acuan <= 0.0f) || (titik == 0 && acuan >= k.acuan[1])) {
    snprintf(pesan, n, "nilai_kalibrasi_tidak_sah");
    return false;
  }
  if (!CekTitik(k, ph, titik, volt, pesan, n)) {
    return false;
  }
  CadangkanKal(k);
  Kalibrasi baru = k;
  baru.v[titik] = volt;
  baru.acuan[titik] = acuan;
  baru.terisi[titik] = true;
  if (titik == 1 && !ph) {
    baru.terisi[0] = false;         /* titik 1 baru -> titik 0 lama tidak berlaku, ulangi 'kal ec 0' */
  }
  baru.waktu = UnixSekarang();
  k = baru;
  SimpanKal(k);
  ResetJendelaSensor();
  snprintf(pesan, n, KalLengkap(k) ? "tersimpan_kalibrasi_lengkap" : "tersimpan_tunggu_titik_lain");
  return true;
}

bool SimpanDuaTitikKalibrasi(bool ph, float v1, float a1, float v2, float a2, char *pesan, size_t n)
{
  if (!isfinite(v1) || !isfinite(v2) || !isfinite(a1) || !isfinite(a2) || a1 <= 0 || a2 <= 0 ||
      fabsf(a1 - a2) < 0.1f || fabsf(v1 - v2) < (ph ? 0.05f : 0.02f) ||
      v1 < 0.0f || v2 < 0.0f || v1 > 5.0f || v2 > 5.0f) {
    snprintf(pesan, n, ph ? "kalibrasi_ph_tak_sah" : "kalibrasi_ec_tak_sah");
    return false;
  }
  Kalibrasi &k = ph ? KalPh : KalEc;
  CadangkanKal(k);
  k.v[1] = v1; k.acuan[1] = a1; k.terisi[1] = true;
  k.v[2] = v2; k.acuan[2] = a2; k.terisi[2] = true;
  k.terisi[0] = false;
  k.waktu = UnixSekarang();
  SimpanKal(k);
  ResetJendelaSensor();
  snprintf(pesan, n, "tersimpan_kalibrasi_lengkap");
  return true;
}

bool KembalikanKalibrasi(bool ph)
{
  bool ok = KembalikanKal(ph ? KalPh : KalEc);
  if (ok) {
    ResetJendelaSensor();
  }
  return ok;
}
