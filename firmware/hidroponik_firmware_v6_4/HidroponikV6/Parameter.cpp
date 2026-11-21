#include "Parameter.h"
#include <Preferences.h>
#include <stddef.h>
#include <string.h>
#include <math.h>

#define OFS(f) offsetof(ParameterAlat, f)

struct InfoParameter {
  const char *nama;
  size_t      ofs;
  float       minimum;
  float       maksimum;
  float       bawaan;
  bool        wajib;      /* bawaan 0 = belum diisi */
};

static const InfoParameter TABEL[] = {
  { "volume_l",            OFS(volumeL),            5.0f,  5000.0f,    0.0f, true  },
  { "monitoring_menit",    OFS(monitoringMenit),    5.0f,   720.0f,    0.0f, true  },
  { "jeda_ab_dtk",         OFS(jedaAbDtk),         10.0f,   900.0f,    0.0f, true  },
  { "ppm_per_ml_ab",       OFS(ppmPerMlAb),         1.0f,  3000.0f,    0.0f, true  },
  { "laju_a",              OFS(lajuA),              0.05f,   50.0f,    0.0f, true  },
  { "laju_b",              OFS(lajuB),              0.05f,   50.0f,    0.0f, true  },
  { "laju_ph_up",          OFS(lajuPhUp),           0.05f,   50.0f,    0.0f, true  },
  { "laju_ph_down",        OFS(lajuPhDown),         0.05f,   50.0f,    0.0f, true  },
  { "toleransi_bawah_ppm", OFS(toleransiBawahPpm),  10.0f,  500.0f,   50.0f, false },
  { "toleransi_atas_ppm",  OFS(toleransiAtasPpm),   20.0f, 1000.0f,  100.0f, false },
  { "persen_dosis",        OFS(persenDosis),        30.0f,  100.0f,   80.0f, false },
  { "maks_ppm_sekali",     OFS(maksPpmSekali),      20.0f,  400.0f,  150.0f, false },
  { "ppm_min_dosing",      OFS(ppmMinDosing),       0.0f,   500.0f,   20.0f, false },
  { "ph_toleransi",       OFS(phToleransi),        0.0f,     1.0f,    0.2f, false },
  { "ph_jeda_menit",       OFS(phJedaMenit),       15.0f,  1440.0f,  120.0f, false },
  { "ph_ml_per_100l",      OFS(phMlPer100L),        0.1f,    50.0f,    2.0f, false },
  { "ph_ml_maks",          OFS(phMlMaks),           0.5f,    50.0f,   10.0f, false },
  { "maks_ab_hari",        OFS(maksAbHari),         1.0f,    20.0f,    6.0f, false },
  { "maks_ph_hari",        OFS(maksPhHari),         1.0f,    20.0f,    5.0f, false },
  { "maks_encer_hari",     OFS(maksEncerHari),      0.0f,    20.0f,    3.0f, false },
  { "maks_isi_hari",       OFS(maksIsiHari),        1.0f,    50.0f,    6.0f, false },
  { "timeout_isi_menit",   OFS(timeoutIsiMenit),    1.0f,    40.0f,   15.0f, false },
  { "pemeliharaan_maks_menit", OFS(pemeliharaanMaksMenit), 10.0f, 480.0f, 120.0f, false },
  { "telemetri_dtk",       OFS(telemetriDtk),       2.0f,   600.0f,    5.0f, false },
  { "tz_menit",            OFS(tzMenit),         -720.0f,   840.0f,  480.0f, false },
  { "id_meja",             OFS(idMeja),             0.0f, 999999.0f,   0.0f, false },
  { "ec_faktor",           OFS(ecFaktor),           0.2f,     5.0f,    1.0f, false },
};
static const int JUMLAH = sizeof(TABEL) / sizeof(TABEL[0]);

static const uint16_t VERSI_BLOB = 0x6001;
struct BlobParameter {
  uint16_t      versi;
  uint16_t      ukuran;
  ParameterAlat isi;
  uint32_t      cek;
};

static uint32_t HitungCek(const ParameterAlat &p)
{
  const uint8_t *b = (const uint8_t *)&p;
  uint32_t h = 2166136261UL;            /* FNV-1a */
  for (size_t i = 0; i < sizeof(p); i++) {
    h ^= b[i];
    h *= 16777619UL;
  }
  return h;
}

static float *Ptr(ParameterAlat &p, int i) { return (float *)((uint8_t *)&p + TABEL[i].ofs); }
static const float *PtrC(const ParameterAlat &p, int i) { return (const float *)((const uint8_t *)&p + TABEL[i].ofs); }

int JumlahParameter(void) { return JUMLAH; }
const char *NamaParameter(int i) { return (i >= 0 && i < JUMLAH) ? TABEL[i].nama : ""; }
bool ParameterWajib(int i) { return (i >= 0 && i < JUMLAH) && TABEL[i].wajib; }

int CariIndeksParameter(const char *nama)
{
  if (nama == NULL) {
    return -1;
  }
  for (int i = 0; i < JUMLAH; i++) {
    if (strcasecmp(nama, TABEL[i].nama) == 0) {
      return i;
    }
  }
  return -1;
}

float AmbilNilaiParameter(const ParameterAlat &p, int i)
{
  return (i >= 0 && i < JUMLAH) ? *PtrC(p, i) : NAN;
}

bool AturNilaiParameter(ParameterAlat &p, int i, float nilai, char *alasan, size_t n)
{
  if (i < 0 || i >= JUMLAH) {
    snprintf(alasan, n, "parameter_tidak_dikenal");
    return false;
  }
  /* nilai wajib boleh dikosongkan lagi dengan 0 */
  bool kosongkan = TABEL[i].wajib && nilai == 0.0f;
  if (!isfinite(nilai) || (!kosongkan && (nilai < TABEL[i].minimum || nilai > TABEL[i].maksimum))) {
    snprintf(alasan, n, "%s_di_luar_rentang_%g_%g", TABEL[i].nama,
             (double)TABEL[i].minimum, (double)TABEL[i].maksimum);
    return false;
  }
  *Ptr(p, i) = nilai;
  return true;
}

void ParameterBawaan(ParameterAlat &p)
{
  memset(&p, 0, sizeof(p));
  for (int i = 0; i < JUMLAH; i++) {
    *Ptr(p, i) = TABEL[i].bawaan;
  }
}

void MuatParameter(ParameterAlat &p)
{
  ParameterBawaan(p);
  Preferences pref;
  if (!pref.begin("v6_param", true)) {
    return;
  }
  BlobParameter b;
  size_t n = pref.getBytesLength("blob");
  bool ok = (n == sizeof(b)) && pref.getBytes("blob", &b, sizeof(b)) == sizeof(b);
  pref.end();
  if (!ok || b.versi != VERSI_BLOB || b.ukuran != sizeof(ParameterAlat) || b.cek != HitungCek(b.isi)) {
    return;   /* rusak / versi lain: pakai bawaan (wajib = kosong, dosing terkunci) */
  }
  /* periksa ulang tiap nilai: yang di luar rentang dikembalikan ke bawaan */
  for (int i = 0; i < JUMLAH; i++) {
    float v = *Ptr(b.isi, i);
    bool kosong = TABEL[i].wajib && v == 0.0f;
    if (isfinite(v) && (kosong || (v >= TABEL[i].minimum && v <= TABEL[i].maksimum))) {
      *Ptr(p, i) = v;
    }
  }
}

bool SimpanParameter(const ParameterAlat &p)
{
  BlobParameter b;
  memset(&b, 0, sizeof(b));
  b.versi = VERSI_BLOB;
  b.ukuran = sizeof(ParameterAlat);
  b.isi = p;
  b.cek = HitungCek(b.isi);
  Preferences pref;
  if (!pref.begin("v6_param", false)) {
    return false;
  }
  bool ok = pref.putBytes("blob", &b, sizeof(b)) == sizeof(b);
  pref.end();
  return ok;
}
