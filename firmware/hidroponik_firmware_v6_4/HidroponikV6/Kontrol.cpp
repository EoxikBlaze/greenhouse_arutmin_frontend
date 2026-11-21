#include "Kontrol.h"
#include "Config.h"
#include "Aktuator.h"
#include "Sensor.h"
#include "WaktuRtc.h"
#include "Komunikasi.h"
#include "Penyimpanan.h"
#include <math.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

/* ===========================================================================
 *  KEADAAN
 * ========================================================================= */
static ParameterAlat P;
static DataSiklus    siklus;
static DataHarian    harian;
static SnapshotSensor sen;

static Kegiatan  keg = KEG_DIAM;
static Beban     bebanKeg = BEBAN_POMPA_A;
static uint64_t  idKeg = 0;               /* id perintah web (0 = otomatis / serial) */
static uint32_t  tKeg = 0, durasiKegMs = 0;
static uint32_t  durasiBMs = 0;           /* durasi pompa B (dosing AB) */
static float     mlRencana = 0;           /* mL total kegiatan */
static float     mlSelesai = 0;           /* mL fase sebelumnya (A pada AB) */
static float     lajuKeg = 0;             /* mL/dtk beban aktif */
static uint32_t  tMulaiKeg = 0;           /* awal seluruh kegiatan */
static const char *alasanKegSelesai = "ok";

static uint32_t  tTindakan = 0;           /* millis akhir tindakan terakhir (jeda monitoring) */
static uint32_t  tPhMs = 0;               /* millis dosing pH terakhir (cadangan bila RTC tak valid) */
static uint32_t  tRendahSejak = 0, tErrorSejak = 0;
static bool      estopLatch = false;      /* E-STOP fisik pernah ditekan, belum di-RESET */
static bool      pompaKelamaan = false;
static bool      pemeliharaan = false;
static uint8_t   otomasi = OTO_SEMUA;     /* izin otomasi per aktuator (bertahan di flash) */
static uint32_t  tPemeliharaan = 0;
static char      langkahPem[21] = "";
static bool      encerTertunda = false;
static uint8_t   layarSementara = 0;
static uint32_t  tLayarSampai = 0;
static uint32_t  tHariMs = 0;             /* cadangan pergantian hari tanpa RTC */
static LevelAir  level = LEVEL_SEDANG;

/* Pengaman EC: ppm turun mendadak tanpa ada isi air/encer = curiga probe terangkat / kabel lepas */
static float     ppmAcuan = NAN;
static uint32_t  tAcuan = 0;
static bool      ecCuriga = false;
static bool      ppmTerlaluRendah = false;
static bool      ppmPernahNaik = false;   /* ppm pernah >= ppm_min_dosing + 30 sejak SEMAI / ganti air (flash) */

/* Deteksi botol nutrisi habis / selang lepas: setelah dosing AB, ppm harus naik minimal 30% dari
   perkiraan. Dua kali berturut-turut tidak naik -> dosing AB dikunci sampai RESET / BUKA_KUNCI. */
static bool      kunciNutrisi = false;
static uint8_t   gagalAb = 0;
struct CekDosingAb {
  bool  aktif;
  float ppmSebelum;
  float harap;                            /* perkiraan kenaikan ppm dari rumus uji lab */
};
static CekDosingAb cekAb = { false, 0, 0 };
static const uint32_t JENDELA_ACUAN_EC_MS = 10UL * 60000UL;

struct KalUkur {
  bool     ada;
  bool     ph;
  uint8_t  titik;
  float    volt;
  uint32_t t;
};
static KalUkur kalUkur = { false, false, 0, 0, 0 };

/* ===========================================================================
 *  UTIL
 * ========================================================================= */
static bool Lewat(uint32_t sejak, uint32_t ms) { return (uint32_t)(millis() - sejak) >= ms; }

static uint32_t MonitoringMs(void) { return (uint32_t)(P.monitoringMenit * 60000.0f); }

static uint32_t UnixUtc(void)
{
  uint32_t lokal = UnixSekarang();
  return lokal ? (uint32_t)((int64_t)lokal - (int64_t)P.tzMenit * 60) : 0;
}

static void IsiLaporan(Laporan *l, uint64_t id, bool selesai, const char *alasan)
{
  memset(l, 0, sizeof(*l));
  l->id = id;
  l->selesai = selesai;
  snprintf(l->alasan, sizeof(l->alasan), "%s", alasan ? alasan : "");
}

static void TambahEkstra(Laporan *l, const char *kunci, float nilai)
{
  if (l->nEkstra < MAKS_EKSTRA_LAPORAN) {
    snprintf(l->kunci[l->nEkstra], sizeof(l->kunci[0]), "%s", kunci);
    l->nilai[l->nEkstra++] = nilai;
  }
}

static void Lapor(uint64_t id, bool selesai, const char *alasan)
{
  Laporan l;
  IsiLaporan(&l, id, selesai, alasan);
  KirimLaporan(l);
}

static bool AngkaP(const PerintahWeb &p, const char *kunci, float *v)
{
  for (int i = 0; i < p.nAngka; i++) {
    if (strcasecmp(p.kunciAngka[i], kunci) == 0) {
      *v = p.angka[i];
      return isfinite(*v);
    }
  }
  return false;
}

static const char *TeksP(const PerintahWeb &p, const char *kunci)
{
  for (int i = 0; i < p.nTeks; i++) {
    if (strcasecmp(p.kunciTeks[i], kunci) == 0) {
      return p.teks[i];
    }
  }
  return "";
}

/* ===========================================================================
 *  KESIAPAN & LEVEL
 * ========================================================================= */
/* SIAP = kesiapan ALAT: sensor terbaca, probe terkalibrasi, uji lab, laju 4 pompa.
 * Semua melekat pada alat dan tidak bergantung penampung/meja tempat alat dipasang. */
static const char *ApaYangKurangAlat(void)
{
  if (!sen.adsAda)               return "ADS1115";
  if (!sen.phTerkalibrasi)       return "kal pH";
  if (!sen.ecTerkalibrasi)       return "kal EC";
  if (P.ppmPerMlAb <= 0)         return "uji lab";
  if (P.lajuA <= 0)              return "laju A";
  if (P.lajuB <= 0)              return "laju B";
  if (P.lajuPhUp <= 0)           return "laju pH up";
  if (P.lajuPhDown <= 0)         return "laju pH dn";
  return NULL;
}

/* Syarat SEMAI dan keputusan otomatis: alat siap + data penampung dari Master Meja
 * (volume, waktu monitoring, jeda A-B). Web mengirimnya lewat KONFIGURASI saat Mulai Semai. */
static const char *ApaYangKurangSemai(void)
{
  const char *alat = ApaYangKurangAlat();
  if (alat != NULL)              return alat;
  if (P.volumeL <= 0)            return "volume";
  if (P.monitoringMenit <= 0)    return "monitoring";
  if (P.jedaAbDtk <= 0)          return "jeda AB";
  return NULL;
}

/* Yang ditampilkan di LCD, lampu, dan dilaporkan ke web: saat SIAP cukup alat; saat SEMAI semua syarat
 * (dosing butuh volume, monitoring, jeda A-B — bila dikosongkan lagi lewat KONFIGURASI tetap terlihat). */
static const char *ApaYangKurangTampil(void)
{
  return (siklus.mode == MODE_SEMAI) ? ApaYangKurangSemai() : ApaYangKurangAlat();
}

static void HitungLevel(uint32_t now)
{
  bool bawah = FloatBawahNaik(), atas = FloatAtasNaik();
  if (!bawah && atas) {
    if (tErrorSejak == 0) { tErrorSejak = now ? now : 1; }
    if ((uint32_t)(now - tErrorSejak) >= 5000) { level = LEVEL_ERROR; }   /* bertahan 5 dtk = rusak, bukan riak */
    return;
  }
  tErrorSejak = 0;
  if (bawah && atas)        { level = LEVEL_PENUH; }
  else if (bawah)           { level = LEVEL_SEDANG; }
  else                      { level = LEVEL_RENDAH; }
}

static bool AdaKunci(void)
{
  return level == LEVEL_ERROR || harian.kunciIsi != KUNCI_TIDAK || pompaKelamaan || sen.kunci || ecCuriga;
}

static void LupakanAcuanEc(void)
{
  ppmAcuan = NAN;
  tAcuan = 0;
}

/* Turun > 40% DAN > 150 ppm dalam 10 menit, tanpa isi air / encer / pemeliharaan = tidak wajar.
   (tanaman hanya menyerap sedikit per jam; air baru selalu lewat pompa isi yang tercatat) */
static void CekEcCuriga(uint32_t now)
{
  if (!sen.ecValid || !sen.ecStabil || keg != KEG_DIAM || pemeliharaan) {
    return;
  }
  float ppm = sen.ppm;
  if (ecCuriga) {
    if (isfinite(ppmAcuan) && ppm >= ppmAcuan * 0.8f) {
      ecCuriga = false;                  /* probe kembali terendam: pulih sendiri */
      LupakanAcuanEc();
      Serial.println("[i] EC kembali wajar: kunci EC curiga dibuka");
    }
    return;
  }
  if (tAcuan == 0 || !isfinite(ppmAcuan)) {
    ppmAcuan = ppm;
    tAcuan = now ? now : 1;
    return;
  }
  if (ppmAcuan > 200.0f && ppm < ppmAcuan * 0.6f && (ppmAcuan - ppm) > 150.0f) {
    ecCuriga = true;
    Serial.printf("[!] ppm turun mendadak %.0f -> %.0f tanpa isi air: dosing DITAHAN (cek probe EC, lalu RESET)\n",
                  (double)ppmAcuan, (double)ppm);
    MintaTelemetriSekarang();
    return;
  }
  if ((uint32_t)(now - tAcuan) >= JENDELA_ACUAN_EC_MS) {
    ppmAcuan = ppm;                      /* perubahan pelan (wajar) mengikuti acuan baru */
    tAcuan = now ? now : 1;
  }
}

/* ===========================================================================
 *  HITUNGAN HARIAN
 * ========================================================================= */
static void SimpanHarianSekarang(void) { SimpanHarian(harian); }

static void ResetHitunganHari(uint32_t hariBaru)
{
  harian.hari = hariBaru;
  harian.ab = harian.ph = harian.encer = harian.isi = 0;   /* kunci isi TIDAK ikut dibuka */
  encerTertunda = false;
  SimpanHarianSekarang();
  Serial.println("[i] Hari baru: hitungan dosing/isi harian kembali 0");
}

static void CekGantiHari(uint32_t now)
{
  if (JamRtcValid()) {
    uint32_t hari = UnixSekarang() / 86400UL;
    if (harian.hari == 0) {
      harian.hari = hari;
      SimpanHarianSekarang();
    } else if (hari != harian.hari) {
      ResetHitunganHari(hari);
    }
    tHariMs = now;
  } else if ((uint32_t)(now - tHariMs) >= 86400000UL) {
    tHariMs = now;          /* tanpa jam: anggap 24 jam berjalan = hari baru */
    ResetHitunganHari(harian.hari);
  }
}

/* ===========================================================================
 *  KEGIATAN (pompa)
 * ========================================================================= */
static float LajuBeban(Beban b)
{
  switch (b) {
    case BEBAN_POMPA_A: return P.lajuA;
    case BEBAN_POMPA_B: return P.lajuB;
    case BEBAN_PH_UP:   return P.lajuPhUp;
    case BEBAN_PH_DOWN: return P.lajuPhDown;
    default:            return 0;
  }
}

static float MlBerjalan(void)
{
  if (!BebanMenyala(bebanKeg) || lajuKeg <= 0) {
    return mlSelesai;
  }
  return mlSelesai + lajuKeg * (float)(millis() - tKeg) / 1000.0f;
}

static bool NyalakanUntukKegiatan(Beban b, uint32_t durasiMs, const char **alasan)
{
  if (!NyalakanBeban(b, alasan)) {
    return false;
  }
  bebanKeg = b;
  lajuKeg = LajuBeban(b);
  tKeg = millis();
  durasiKegMs = durasiMs;
  return true;
}

/* Mulai kegiatan baru. Jurnal ditulis SEBELUM pompa menyala. */
static bool MulaiKegiatan(Kegiatan k, Beban b, uint32_t durasiMs, float mlTotal, uint64_t id, const char **alasan)
{
  DataJurnal j;
  memset(&j, 0, sizeof(j));
  j.idPerintah = id;
  j.kegiatan = (uint8_t)k;
  SimpanJurnal(j);
  if (!NyalakanUntukKegiatan(b, durasiMs, alasan)) {
    HapusJurnal();
    return false;
  }
  keg = k;
  idKeg = id;
  mlRencana = mlTotal;
  mlSelesai = 0;
  tMulaiKeg = millis();
  alasanKegSelesai = "ok";
  return true;
}

static bool KegiatanDosing(Kegiatan k)
{
  return k == KEG_DOSING_A || k == KEG_JEDA_AB || k == KEG_DOSING_B || k == KEG_PH_UP || k == KEG_PH_DOWN;
}

/* Akhiri kegiatan berjalan: semua beban OFF, laporan bila dari web. */
static void AkhiriKegiatan(bool selesai, const char *alasan)
{
  if (keg == KEG_DIAM) {
    return;
  }
  float ml = MlBerjalan();
  MatikanSemuaBeban();
  Kegiatan lama = keg;
  uint32_t durasi = millis() - tMulaiKeg;
  keg = KEG_DIAM;
  HapusJurnal();
  if (!selesai && (lama == KEG_DOSING_A || lama == KEG_JEDA_AB || lama == KEG_DOSING_B)) {
    cekAb.aktif = false;                   /* dosing AB terpotong: kenaikan ppm tidak bisa dinilai */
  }
  tTindakan = millis();                    /* tindakan berikutnya menunggu waktu monitoring */
  LupakanAcuanEc();                        /* ppm wajar berubah setelah dosing / isi air */
  if (KegiatanDosing(lama)) {
    harian.dosingTerakhirUnix = UnixSekarang();
    SimpanHarianSekarang();
  }
  Serial.printf("[i] %s %s: %s (%.1f mL, %lu dtk)\n", NamaKegiatan(lama), selesai ? "selesai" : "berhenti",
                alasan, (double)ml, (unsigned long)(durasi / 1000UL));
  if (pemeliharaan && lama == KEG_UJI_POMPA) {
    snprintf(langkahPem, sizeof(langkahPem), "Uji pompa selesai");
  }
  if (idKeg != 0) {
    Laporan l;
    IsiLaporan(&l, idKeg, selesai, alasan);
    if (lama != KEG_ISI_AIR && lama != KEG_ENCER) {
      TambahEkstra(&l, "ml_nyata", roundf(ml * 10.0f) / 10.0f);
    }
    TambahEkstra(&l, "durasi_ms", (float)durasi);
    KirimLaporan(l);
  }
  idKeg = 0;
}

static void JalankanKegiatan(uint32_t now)
{
  if (keg == KEG_DIAM) {
    return;
  }
  /* pompa dimatikan dari luar (E-STOP / batas waktu) */
  if (keg != KEG_JEDA_AB && !BebanMenyala(bebanKeg)) {
    AkhiriKegiatan(false, EstopAktif() ? "estop" : "pompa_dimatikan");
    return;
  }
  if (keg == KEG_ISI_AIR || keg == KEG_ENCER) {
    if (FloatAtasNaik()) {
      AkhiriKegiatan(true, "tandon_penuh");
    } else if (level == LEVEL_ERROR) {
      AkhiriKegiatan(false, "float_error");
    } else if ((uint32_t)(now - tKeg) >= durasiKegMs) {
      /* pompa isi lebih lama dari batas tanpa float atas naik: sumber habis / bocor / float rusak */
      harian.kunciIsi = KUNCI_ISI_TIMEOUT;
      SimpanHarianSekarang();
      AkhiriKegiatan(false, "timeout_isi_dikunci");
    }
    return;
  }
  if (keg == KEG_UJI_POMPA && bebanKeg == BEBAN_ISI && FloatAtasNaik()) {
    AkhiriKegiatan(true, "tandon_penuh");    /* uji pompa isi pun tidak boleh meluapkan tandon */
    return;
  }
  if ((uint32_t)(now - tKeg) < durasiKegMs) {
    return;
  }
  switch (keg) {
    case KEG_DOSING_A: {
      mlSelesai = MlBerjalan();
      MatikanBeban(BEBAN_POMPA_A);
      keg = KEG_JEDA_AB;
      tKeg = now;
      durasiKegMs = (uint32_t)(P.jedaAbDtk * 1000.0f);
      lajuKeg = 0;
      break;
    }
    case KEG_JEDA_AB: {
      const char *alasan = NULL;
      float mlA = mlSelesai;
      if (!NyalakanUntukKegiatan(BEBAN_POMPA_B, durasiBMs, &alasan)) {
        AkhiriKegiatan(false, alasan ? alasan : "pompa_b_gagal");
        return;
      }
      mlSelesai = mlA;
      keg = KEG_DOSING_B;
      break;
    }
    default:
      AkhiriKegiatan(true, "ok");
      break;
  }
}

/* ===========================================================================
 *  PEMELIHARAAN
 * ========================================================================= */
static void MulaiPemeliharaan(const char *oleh)
{
  if (pemeliharaan) {
    return;
  }
  AkhiriKegiatan(false, "pemeliharaan");
  pemeliharaan = true;
  tPemeliharaan = millis();
  kalUkur.ada = false;
  cekAb.aktif = false;                /* air/probe bisa diubah: hasil dosing terakhir tidak dinilai */
  snprintf(langkahPem, sizeof(langkahPem), "Siap kalibrasi");
  Serial.printf("[i] PEMELIHARAAN mulai (%s): dosing & isi otomatis berhenti\n", oleh);
  MintaTelemetriSekarang();
}

static void SelesaiPemeliharaan(const char *oleh)
{
  if (!pemeliharaan) {
    return;
  }
  AkhiriKegiatan(false, "pemeliharaan_selesai");
  pemeliharaan = false;
  kalUkur.ada = false;
  langkahPem[0] = 0;
  ecCuriga = false;                   /* probe sudah ditangani petani */
  LupakanAcuanEc();
  ResetJendelaSensor();               /* probe baru dicelup ulang: bacaan dimulai dari awal */
  if (ppmPernahNaik) {                /* air mungkin dikuras / diganti selama pemeliharaan */
    ppmPernahNaik = false;
    SimpanPpmPernahNaik(false);
  }
  tTindakan = millis();               /* tunggu 1 waktu monitoring sebelum dosing */
  Serial.printf("[i] PEMELIHARAAN selesai (%s)\n", oleh);
  MintaTelemetriSekarang();
}

/* ===========================================================================
 *  KEPUTUSAN OTOMATIS (hanya mode SEMAI)
 * ========================================================================= */
static bool MulaiIsi(Kegiatan k, uint64_t id, const char **alasan)
{
  uint32_t batas = (uint32_t)(P.timeoutIsiMenit * 60000.0f);
  cekAb.aktif = false;                /* air baru mengencerkan: kenaikan ppm dosing tidak bisa dinilai */
  return MulaiKegiatan(k, BEBAN_ISI, batas, 0, id, alasan);
}

/* Hitung durasi pompa dari mL; dibatasi 10 mnt. */
static uint32_t DurasiMs(float ml, float laju)
{
  if (laju <= 0 || ml <= 0) {
    return 0;
  }
  float dtk = ml / laju;
  float maks = (float)MAKS_POMPA_DOSING_MS / 1000.0f - 5.0f;
  if (dtk > maks) {
    dtk = maks;
  }
  return (uint32_t)(dtk * 1000.0f);
}

static bool MulaiDosingAb(float mlTotal, uint64_t id, const char **alasan)
{
  float mlTiap = mlTotal / 2.0f;
  uint32_t dA = DurasiMs(mlTiap, P.lajuA);
  uint32_t dB = DurasiMs(mlTiap, P.lajuB);
  if (dA < (uint32_t)(MIN_DETIK_POMPA * 1000) || dB < (uint32_t)(MIN_DETIK_POMPA * 1000)) {
    *alasan = "ml_terlalu_kecil";
    return false;
  }
  durasiBMs = dB;
  float mlNyataTotal = (P.lajuA * dA + P.lajuB * dB) / 1000.0f;
  if (!MulaiKegiatan(KEG_DOSING_A, BEBAN_POMPA_A, dA, mlNyataTotal, id, alasan)) {
    return false;
  }
  harian.ab++;
  SimpanHarianSekarang();
  /* catat untuk penilaian setelah monitoring (deteksi botol habis) */
  if (sen.ecValid && P.volumeL > 0 && P.ppmPerMlAb > 0) {
    cekAb.aktif = true;
    cekAb.ppmSebelum = sen.ppm;
    cekAb.harap = (mlNyataTotal / 2.0f) * P.ppmPerMlAb / P.volumeL;
  } else {
    cekAb.aktif = false;
  }
  return true;
}

/* Dipanggil saat bacaan EC stabil & monitoring setelah dosing AB sudah habis. */
static void NilaiHasilDosingAb(float ppm)
{
  if (!cekAb.aktif) {
    return;
  }
  cekAb.aktif = false;
  if (cekAb.harap < 20.0f) {
    return;                           /* dosis terlalu kecil untuk dinilai */
  }
  float naik = ppm - cekAb.ppmSebelum;
  if (naik < 0.3f * cekAb.harap) {
    gagalAb++;
    Serial.printf("[!] Dosing AB: ppm hanya naik %.0f dari perkiraan %.0f (ke-%u) - cek botol A/B & selang\n",
                  (double)naik, (double)cekAb.harap, gagalAb);
  } else {
    gagalAb = 0;
  }
  if (gagalAb >= 2 && !kunciNutrisi) {
    kunciNutrisi = true;
    SimpanKunciNutrisi(true);
    Serial.println("[!] NUTRISI HABIS? 2x dosing AB tanpa kenaikan ppm: dosing AB DIKUNCI (isi botol, lalu RESET)");
    MintaTelemetriSekarang();
  }
}

static void BukaKunciNutrisi(void)
{
  gagalAb = 0;
  cekAb.aktif = false;
  if (kunciNutrisi) {
    kunciNutrisi = false;
    SimpanKunciNutrisi(false);
  }
}

static bool MulaiDosingPh(bool naik, float ml, uint64_t id, const char **alasan)
{
  Beban b = naik ? BEBAN_PH_UP : BEBAN_PH_DOWN;
  uint32_t d = DurasiMs(ml, LajuBeban(b));
  if (d < (uint32_t)(MIN_DETIK_POMPA * 1000)) {
    *alasan = "ml_terlalu_kecil";
    return false;
  }
  if (!MulaiKegiatan(naik ? KEG_PH_UP : KEG_PH_DOWN, b, d, LajuBeban(b) * d / 1000.0f, id, alasan)) {
    return false;
  }
  harian.ph++;
  harian.phTerakhirUnix = UnixSekarang();
  tPhMs = millis();
  SimpanHarianSekarang();
  return true;
}

static float MlPhSekali(void)
{
  float ml = P.phMlPer100L * P.volumeL / 100.0f;
  if (ml > P.phMlMaks) {
    ml = P.phMlMaks;
  }
  return ml;
}

static uint32_t DetikSejakPh(void)
{
  if (JamRtcValid() && harian.phTerakhirUnix > 0 && UnixSekarang() >= harian.phTerakhirUnix) {
    return UnixSekarang() - harian.phTerakhirUnix;
  }
  return (millis() - tPhMs) / 1000UL;
}

static void PutuskanOtomatis(uint32_t now)
{
  if (siklus.mode != MODE_SEMAI || pemeliharaan || keg != KEG_DIAM || EstopAktif() || estopLatch) {
    return;
  }
  const char *alasan = NULL;

  /* 1) Air RENDAH: wajib isi dulu (stabil 10 dtk agar riak tidak memicu) */
  if (level == LEVEL_RENDAH) {
    if (tRendahSejak == 0) { tRendahSejak = now ? now : 1; }
    if ((uint32_t)(now - tRendahSejak) >= TUNDA_RENDAH_MS && harian.kunciIsi == KUNCI_TIDAK &&
        !pompaKelamaan && P.timeoutIsiMenit > 0 && (otomasi & OTO_ISI)) {
      if (harian.isi >= (uint8_t)P.maksIsiHari) {
        harian.kunciIsi = KUNCI_ISI_SERING;      /* terlalu sering = curiga bocor */
        SimpanHarianSekarang();
        Serial.println("[!] Isi air melebihi batas harian: pompa isi DIKUNCI (cek kebocoran, lalu tekan RESET)");
      } else if (MulaiIsi(KEG_ISI_AIR, 0, &alasan)) {
        harian.isi++;
        SimpanHarianSekarang();
      }
    }
    return;                                       /* air rendah: tidak boleh dosing */
  }
  tRendahSejak = 0;

  /* 2) Syarat umum dosing */
  if (ApaYangKurangSemai() != NULL || AdaKunci() || level == LEVEL_ERROR) {
    return;
  }
  if (!Lewat(tTindakan, MonitoringMs())) {
    return;                                       /* masih masa monitoring */
  }
  if (!sen.suhuAirValid) {
    return;
  }

  /* 3) Nutrisi AB */
  if (siklus.targetPpm > 0 && sen.ecValid && sen.ecStabil) {
    float ppm = sen.ppm;
    /* Pengaman "probe terangkat" hanya berlaku setelah ppm PERNAH naik di siklus ini. Semai dari air
       baku (± 0 ppm) tetap boleh dosing; bila ppm sudah ratusan lalu jatuh ke ± 0 = probe di udara. */
    if (!ppmPernahNaik && P.ppmMinDosing > 0 && ppm >= P.ppmMinDosing + 30.0f) {
      ppmPernahNaik = true;
      SimpanPpmPernahNaik(true);
    }
    ppmTerlaluRendah = (P.ppmMinDosing > 0 && ppmPernahNaik && ppm < P.ppmMinDosing);
    if (ppmTerlaluRendah) {
      cekAb.aktif = false;                        /* bacaan tidak bisa dipercaya untuk menilai dosing */
      return;                                     /* hampir 0 = probe di udara / kabel lepas: jangan dosing */
    }
    NilaiHasilDosingAb(ppm);                      /* monitoring sudah habis & bacaan stabil */
    if (ppm < siklus.targetPpm - P.toleransiBawahPpm && (otomasi & OTO_AB) && !kunciNutrisi) {
      encerTertunda = false;
      if (harian.ab >= (uint8_t)P.maksAbHari) {
        return;                                   /* batas harian penuh: tunggu besok */
      }
      float delta = (siklus.targetPpm - ppm) * P.persenDosis / 100.0f;
      if (delta > P.maksPpmSekali) {
        delta = P.maksPpmSekali;
      }
      float mlTiap = delta * P.volumeL / P.ppmPerMlAb;              /* mL A (= mL B) */
      float batasTiap = MAKS_ML_PER_L_SEKALI * P.volumeL;
      if (mlTiap > batasTiap) {
        mlTiap = batasTiap;
      }
      Serial.printf("[i] ppm %.0f < target %.0f: dosing AB naik %.0f ppm = %.1f mL A + %.1f mL B\n",
                    (double)ppm, (double)siklus.targetPpm, (double)delta, (double)mlTiap, (double)mlTiap);
      if (!MulaiDosingAb(mlTiap * 2.0f, 0, &alasan)) {
        Serial.printf("[!] dosing AB tidak jalan: %s\n", alasan ? alasan : "?");
        tTindakan = now;                         /* jangan mencoba ulang tiap loop */
      }
      return;
    }
    if (ppm > siklus.targetPpm + P.toleransiAtasPpm) {
      /* 4) Encerkan: hanya bila air SEDANG (masih ada ruang) */
      if (level == LEVEL_SEDANG && harian.encer < (uint8_t)P.maksEncerHari &&
          (otomasi & OTO_ENCER) && (otomasi & OTO_ISI)) {
        encerTertunda = false;
        Serial.printf("[i] ppm %.0f > target %.0f: encerkan (isi air sampai penuh)\n",
                      (double)ppm, (double)siklus.targetPpm);
        if (MulaiIsi(KEG_ENCER, 0, &alasan)) {
          harian.encer++;
          SimpanHarianSekarang();
        } else {
          tTindakan = now;
        }
        return;
      }
      encerTertunda = true;                       /* penuh / batas: tunggu air terpakai tanaman */
    } else {
      encerTertunda = false;
    }
  }

  /* 5) pH (dicek terakhir, setelah nutrisi tenang) */
  if (siklus.phMax > 0 && sen.phValid && sen.phStabil && harian.ph < (uint8_t)P.maksPhHari && (otomasi & OTO_PH) &&
      DetikSejakPh() >= (uint32_t)(P.phJedaMenit * 60.0f)) {
    bool naik = sen.ph < siklus.phMin - P.phToleransi;
    bool turun = sen.ph > siklus.phMax + P.phToleransi;
    if (naik || turun) {
      float ml = MlPhSekali();
      Serial.printf("[i] pH %.2f di luar %.1f-%.1f: pH %s %.1f mL\n", (double)sen.ph, (double)siklus.phMin,
                    (double)siklus.phMax, naik ? "UP" : "DOWN", (double)ml);
      if (!MulaiDosingPh(naik, ml, 0, &alasan)) {
        Serial.printf("[!] dosing pH tidak jalan: %s\n", alasan ? alasan : "?");
        tTindakan = now;
      }
    }
  }
}

/* ===========================================================================
 *  TOMBOL, E-STOP, LAMPU
 * ========================================================================= */
static void TanganiEstopDanTombol(uint32_t now)
{
  bool server = EstopDariServer();
  TetapkanEstopServer(server);
  if (EstopFisikDitekan() && !estopLatch) {
    estopLatch = true;
    Serial.println("[!] E-STOP DITEKAN: semua pompa mati");
    MintaTelemetriSekarang();
  }
  if ((EstopAktif() || estopLatch) && keg != KEG_DIAM) {
    AkhiriKegiatan(false, server && !EstopFisikDitekan() ? "estop_server" : "estop");
  }
  if (EstopAktif() || estopLatch) {
    MatikanSemuaBeban();
  }

  Beban b;
  if (AmbilPompaKelamaan(&b)) {
    pompaKelamaan = true;
    Serial.printf("[!] Beban %d menyala melewati batas waktu: dipaksa mati & dikunci (tekan RESET)\n", (int)b);
    AkhiriKegiatan(false, "melebihi_durasi_maks");
  }

  if (AmbilTekanSingkatReset()) {
    if (estopLatch && !EstopFisikDitekan()) {
      estopLatch = false;
      tTindakan = now;                    /* tunggu 1 waktu monitoring setelah E-STOP */
      layarSementara = 2;
      tLayarSampai = now + 3000;
      Serial.println("[i] RESET: E-STOP dilepas, alat kembali normal");
      MintaTelemetriSekarang();
    } else if (!estopLatch && (harian.kunciIsi != KUNCI_TIDAK || pompaKelamaan || ecCuriga || kunciNutrisi)) {
      harian.kunciIsi = KUNCI_TIDAK;
      pompaKelamaan = false;
      ecCuriga = false;
      LupakanAcuanEc();
      BukaKunciNutrisi();
      SimpanHarianSekarang();
      layarSementara = 3;
      tLayarSampai = now + 3000;
      Serial.println("[i] RESET: kunci pompa dibuka");
    } else if (!estopLatch) {
      layarSementara = 1;                 /* info WiFi/IP/server */
      tLayarSampai = now + 5000;
    }
  }
  if (AmbilTahanLamaReset() && !EstopAktif() && !estopLatch) {
    if (pemeliharaan) { SelesaiPemeliharaan("tombol RESET"); }
    else              { MulaiPemeliharaan("tombol RESET"); }
  }
  if (layarSementara != 0 && (int32_t)(now - tLayarSampai) >= 0) {
    layarSementara = 0;
  }
}

static void TetapkanPolaLampu(void)
{
  PolaLampu pola = LAMPU_BIRU;
  if (EstopAktif() || estopLatch) {
    pola = LAMPU_MERAH;
  } else if (AdaKunci() || kunciNutrisi) {
    pola = LAMPU_MERAH_KEDIP;
  } else if (pemeliharaan) {
    pola = LAMPU_KUNING_KEDIP;
  } else if (KegiatanDosing(keg) || keg == KEG_UJI_POMPA) {
    pola = LAMPU_BIRU_KEDIP_CEPAT;
  } else if (keg == KEG_ISI_AIR || keg == KEG_ENCER) {
    pola = LAMPU_BIRU_KEDIP_LAMBAT;
  } else if (ApaYangKurangTampil() != NULL || !MqttTerhubung() ||
             (siklus.mode == MODE_SEMAI && (harian.ab >= (uint8_t)P.maksAbHari ||
                                            harian.ph >= (uint8_t)P.maksPhHari || level == LEVEL_RENDAH))) {
    pola = LAMPU_KUNING;
  }
  TetapkanLampu(pola);
}

/* ===========================================================================
 *  INISIALISASI & LOOP
 * ========================================================================= */
void InisialisasiKontrol(void)
{
  MuatParameter(P);
  TetapkanFaktorEc(P.ecFaktor);
  MuatSiklus(&siklus);
  MuatHarian(&harian);
  otomasi = MuatOtomasi();
  ppmPernahNaik = MuatPpmPernahNaik();
  kunciNutrisi = MuatKunciNutrisi();
  uint32_t now = millis();

  /* program baru dari OTA jauh berhasil dipasang: laporkan ke web */
  uint64_t idOta = MuatOtaId();
  if (idOta != 0) {
    char a[48];
    snprintf(a, sizeof(a), "ota_berhasil_v%s", FIRMWARE_VERSI);
    Laporan l;
    IsiLaporan(&l, idOta, true, a);
    KirimLaporan(l);
    HapusOtaId();
  }
  tTindakan = now;          /* setelah menyala: tunggu 1 waktu monitoring sebelum dosing */
  tPhMs = now;
  tHariMs = now;
  estopLatch = EstopFisikDitekan();

  DataJurnal j;
  if (MuatJurnal(&j)) {
    Serial.printf("[!] Listrik mati / reboot saat %s - TIDAK dilanjutkan\n", NamaKegiatan((Kegiatan)j.kegiatan));
    if (j.idPerintah != 0) {
      Laporan l;
      IsiLaporan(&l, j.idPerintah, false, "reboot_saat_jalan");
      TambahEkstra(&l, "ml_nyata", NAN);
      KirimLaporan(l);
    }
    HapusJurnal();
  }
  Serial.printf("[i] Mode %s  target %.0f ppm  pH %.1f-%.1f  | hari ini AB %u pH %u encer %u isi %u%s\n",
                NamaMode((ModeSiklus)siklus.mode), (double)siklus.targetPpm, (double)siklus.phMin,
                (double)siklus.phMax, harian.ab, harian.ph, harian.encer, harian.isi,
                harian.kunciIsi ? "  [POMPA ISI TERKUNCI]" : "");
}

void PerbaruiKontrol(void)
{
  uint32_t now = millis();
  AmbilSnapshotSensor(&sen);

  /* Program baru sedang diunggah: hentikan semua, jangan ambil keputusan apa pun */
  if (OtaBerjalan()) {
    if (keg != KEG_DIAM) {
      AkhiriKegiatan(false, "update_program");
    }
    MatikanSemuaBeban();
    TetapkanLampu(LAMPU_KUNING_KEDIP);
    return;
  }
  /* Izin OTA: lokal saat pemeliharaan atau tidak sedang menjaga tanaman & tidak ada kegiatan;
     jauh hanya saat pemeliharaan (dibuka sengaja dari web / tahan RESET). */
  TetapkanIzinOta(pemeliharaan || (siklus.mode != MODE_SEMAI && keg == KEG_DIAM),
                  pemeliharaan && keg == KEG_DIAM);

  HitungLevel(now);
  TanganiEstopDanTombol(now);
  CekGantiHari(now);
  if (pemeliharaan && Lewat(tPemeliharaan, (uint32_t)(P.pemeliharaanMaksMenit * 60000.0f))) {
    SelesaiPemeliharaan("batas waktu");
  }
  if (kalUkur.ada && Lewat(kalUkur.t, KAL_UKUR_BERLAKU_MS)) {
    kalUkur.ada = false;
  }
  JalankanKegiatan(now);
  CekEcCuriga(now);
  PutuskanOtomatis(now);
  TetapkanPolaLampu();
}

/* ===========================================================================
 *  PERINTAH
 * ========================================================================= */
static bool HarusPemeliharaan(void) { return siklus.mode == MODE_SEMAI && !pemeliharaan; }

static void PerintahKalibrasiTim(const PerintahWeb &p)
{
  /* format firmware tim: {ph_v4, ph_v7} tegangan, {tds_faktor}, {laju_a, laju_b, laju_ph_up, laju_ph_down} */
  char pesan[48] = "kalibrasi_disimpan";
  ParameterAlat baru = P;
  float v;
  bool adaParam = false;
  struct { const char *kunci; const char *nama; } LAJU[] = {
    { "laju_a", "laju_a" }, { "laju_b", "laju_b" }, { "laju_ph_up", "laju_ph_up" }, { "laju_ph_down", "laju_ph_down" },
  };
  for (auto &x : LAJU) {
    if (AngkaP(p, x.kunci, &v)) {
      if (!AturNilaiParameter(baru, CariIndeksParameter(x.nama), v, pesan, sizeof(pesan))) {
        Lapor(p.id, false, "laju_pompa_tak_sah");
        return;
      }
      adaParam = true;
    }
  }
  if (AngkaP(p, "tds_faktor", &v) || AngkaP(p, "ec_faktor", &v)) {
    if (!AturNilaiParameter(baru, CariIndeksParameter("ec_faktor"), v, pesan, sizeof(pesan))) {
      Lapor(p.id, false, "kalibrasi_tds_tak_sah");
      return;
    }
    adaParam = true;
  }
  float v4, v7;
  bool adaPh = AngkaP(p, "ph_v4", &v4) && AngkaP(p, "ph_v7", &v7);
  if (adaPh && !SimpanDuaTitikKalibrasi(true, v4, 4.01f, v7, 7.00f, pesan, sizeof(pesan))) {
    Lapor(p.id, false, pesan);
    return;
  }
  if (!adaParam && !adaPh) {
    Lapor(p.id, false, "parameter_kosong");
    return;
  }
  if (adaParam) {
    if (!SimpanParameter(baru)) {
      Lapor(p.id, false, "gagal_simpan_flash");
      return;
    }
    P = baru;
    TetapkanFaktorEc(P.ecFaktor);
  }
  Lapor(p.id, true, "kalibrasi_disimpan_nvs");
}

static void PerintahKalSensor(const PerintahWeb &p)
{
  const char *s = TeksP(p, "sensor");
  bool ph = strcasecmp(s, "ph") == 0;
  bool ec = strcasecmp(s, "ec") == 0 || strcasecmp(s, "tds") == 0;
  float t = 0;
  uint8_t titik = (AngkaP(p, "titik", &t) && t >= 0 && t <= 2) ? (uint8_t)t : 255;
  const char *aksi = TeksP(p, "aksi");
  if (!aksi[0]) { aksi = "UKUR"; }
  if (!ph && !ec) {
    Lapor(p.id, false, "sensor_harus_ph_atau_ec");
    return;
  }
  if (strcasecmp(aksi, "BATAL") == 0) {
    kalUkur.ada = false;
    snprintf(langkahPem, sizeof(langkahPem), "Kalibrasi dibatal");
    Lapor(p.id, true, "dibatalkan");
    return;
  }
  if (titik > 2 || (titik == 0 && ph)) {   /* titik 0 hanya EC (v6.3: air tawar / udara) */
    Lapor(p.id, false, ph ? "titik_harus_1_atau_2" : "titik_harus_0_1_atau_2");
    return;
  }
  if (HarusPemeliharaan()) {
    Lapor(p.id, false, "mulai_pemeliharaan_dulu");
    return;
  }
  if (keg != KEG_DIAM) {
    Lapor(p.id, false, "sibuk");
    return;
  }
  char pesan[48];
  if (strcasecmp(aksi, "UKUR") == 0) {
    float volt = NAN;
    bool ok = UkurKalibrasi(ph, titik, &volt, pesan, sizeof(pesan));
    Laporan l;
    IsiLaporan(&l, p.id, ok, pesan);
    TambahEkstra(&l, "tegangan", isfinite(volt) ? roundf(volt * 10000.0f) / 10000.0f : NAN);
    TambahEkstra(&l, "titik", (float)titik);
    TambahEkstra(&l, "acuan", AcuanBawaan(ph, titik));
    KirimLaporan(l);
    if (ok) {
      kalUkur.ada = true;
      kalUkur.ph = ph;
      kalUkur.titik = titik;
      kalUkur.volt = volt;
      kalUkur.t = millis();
      snprintf(langkahPem, sizeof(langkahPem), "%s t%u:%.3fV SIMPAN?", ph ? "pH" : "EC", titik, (double)volt);
    } else {
      snprintf(langkahPem, sizeof(langkahPem), "%s t%u belum tenang", ph ? "pH" : "EC", titik);
    }
    MintaTelemetriSekarang();
    return;
  }
  if (strcasecmp(aksi, "SIMPAN") == 0) {
    if (!kalUkur.ada || kalUkur.ph != ph || kalUkur.titik != titik) {
      Lapor(p.id, false, "ukur_dulu_sebelum_simpan");
      return;
    }
    float acuan = 0;
    if (!AngkaP(p, "acuan", &acuan) || acuan <= 0) {
      acuan = AcuanBawaan(ph, titik);
    } else if (titik == 0) {
      /* nilai alat ukur genggam = EC pada 25 C; garis kalibrasi memakai EC pada suhu air saat ini */
      float suhu = sen.suhuAirValid ? sen.suhuAir : 25.0f;
      acuan *= 1.0f + KOEF_SUHU_EC * (suhu - 25.0f);
    }
    bool ok = SimpanTitikKalibrasi(ph, titik, kalUkur.volt, acuan, pesan, sizeof(pesan));
    Laporan l;
    IsiLaporan(&l, p.id, ok, pesan);
    TambahEkstra(&l, "tegangan", kalUkur.volt);
    TambahEkstra(&l, "acuan", acuan);
    TambahEkstra(&l, "titik_terisi", (float)JumlahTitikKalibrasi(ph));
    KirimLaporan(l);
    if (ok) {
      kalUkur.ada = false;
      snprintf(langkahPem, sizeof(langkahPem), "%s t%u tersimpan", ph ? "pH" : "EC", titik);
    }
    return;
  }
  Lapor(p.id, false, "aksi_harus_UKUR_SIMPAN_BATAL");
}

/* Nama alternatif yang mungkin dipakai web */
static const char *AliasParameter(const char *k)
{
  if (strcasecmp(k, "volume") == 0 || strcasecmp(k, "volume_tandon") == 0) return "volume_l";
  if (strcasecmp(k, "waktu_monitoring") == 0 || strcasecmp(k, "monitoring") == 0) return "monitoring_menit";
  if (strcasecmp(k, "jeda_ab") == 0) return "jeda_ab_dtk";
  if (strcasecmp(k, "uji_lab") == 0 || strcasecmp(k, "ppm_per_ml") == 0) return "ppm_per_ml_ab";
  if (strcasecmp(k, "tds_faktor") == 0) return "ec_faktor";
  return k;
}

static void PerintahKonfigurasi(const PerintahWeb &p)
{
  ParameterAlat baru = P;
  char pesan[48];
  int diatur = 0;
  float a = 0, b = 0;
  bool adaA = AngkaP(p, "ppm_per_ml_a", &a), adaB = AngkaP(p, "ppm_per_ml_b", &b);
  if (adaA != adaB) {
    Lapor(p.id, false, "ppm_per_ml_a_dan_b_harus_berdua");
    return;
  }
  if (adaA && adaB) {
    /* uji lab terpisah: 1 mL A/L naik a ppm, 1 mL B/L naik b ppm -> bersama a+b */
    if (!AturNilaiParameter(baru, CariIndeksParameter("ppm_per_ml_ab"), a + b, pesan, sizeof(pesan))) {
      Lapor(p.id, false, pesan);
      return;
    }
    diatur++;
  }
  for (int i = 0; i < p.nAngka; i++) {
    const char *k = p.kunciAngka[i];
    if (strcasecmp(k, "ppm_per_ml_a") == 0 || strcasecmp(k, "ppm_per_ml_b") == 0 ||
        strcasecmp(k, "penampung") == 0) {
      continue;
    }
    int idx = CariIndeksParameter(AliasParameter(k));
    if (idx < 0) {
      continue;                 /* field lain dari web diabaikan dengan aman */
    }
    if (!AturNilaiParameter(baru, idx, p.angka[i], pesan, sizeof(pesan))) {
      Lapor(p.id, false, pesan);  /* satu salah = tidak ada yang disimpan */
      return;
    }
    diatur++;
  }
  if (diatur == 0) {
    Lapor(p.id, false, "tidak_ada_parameter_dikenal");
    return;
  }
  if (!SimpanParameter(baru)) {
    Lapor(p.id, false, "gagal_simpan_flash");
    return;
  }
  P = baru;
  TetapkanFaktorEc(P.ecFaktor);
  const char *kurang = ApaYangKurangSemai();   /* siap untuk SEMAI = alat siap + data meja lengkap */
  Laporan l;
  IsiLaporan(&l, p.id, true, kurang ? "tersimpan_belum_lengkap" : "tersimpan_siap");
  TambahEkstra(&l, "jumlah_diatur", (float)diatur);
  KirimLaporan(l);
  MintaTelemetriSekarang();
}

static bool BacaTarget(const PerintahWeb &p, DataSiklus *d, bool wajibSemua, const char **alasan)
{
  float ppm = 0, mn = 0, mx = 0;
  bool adaPpm = AngkaP(p, "target_ppm", &ppm) || AngkaP(p, "ppm", &ppm) || AngkaP(p, "target", &ppm);
  bool adaMn = AngkaP(p, "ph_min", &mn), adaMx = AngkaP(p, "ph_max", &mx);
  if (wajibSemua && (!adaPpm || !adaMn || !adaMx)) {
    *alasan = "wajib_target_ppm_ph_min_ph_max";
    return false;
  }
  if (!adaPpm && !adaMn && !adaMx) {
    *alasan = "parameter_kosong";
    return false;
  }
  if (adaMn != adaMx) {
    *alasan = "ph_min_dan_ph_max_harus_berdua";
    return false;
  }
  if (adaPpm && (ppm < 50.0f || ppm > 3000.0f)) {
    *alasan = "target_ppm_di_luar_50_3000";
    return false;
  }
  if (adaMn && (mn < 4.0f || mx > 8.5f || mx - mn < 0.2f)) {
    *alasan = "rentang_ph_tak_sah";
    return false;
  }
  if (adaPpm) { d->targetPpm = ppm; }
  if (adaMn)  { d->phMin = mn; d->phMax = mx; }
  return true;
}

static Beban BebanDariNama(const char *n, bool *ok)
{
  *ok = true;
  if (strcasecmp(n, "A") == 0) return BEBAN_POMPA_A;
  if (strcasecmp(n, "B") == 0) return BEBAN_POMPA_B;
  if (strcasecmp(n, "PH_UP") == 0 || strcasecmp(n, "PHUP") == 0) return BEBAN_PH_UP;
  if (strcasecmp(n, "PH_DOWN") == 0 || strcasecmp(n, "PHDOWN") == 0) return BEBAN_PH_DOWN;
  if (strcasecmp(n, "ISI_AIR") == 0 || strcasecmp(n, "ISI") == 0) return BEBAN_ISI;
  *ok = false;
  return BEBAN_POMPA_A;
}

void TerapkanPerintah(const PerintahWeb &p)
{
  if (p.tipe == P_SINKRON_JAM) {
    uint32_t lokal = (uint32_t)((int64_t)p.exp + (int64_t)P.tzMenit * 60);
    uint32_t skr = UnixSekarang();
    if (!JamRtcValid() || skr == 0 || (skr > lokal ? skr - lokal : lokal - skr) > 30) {
      if (AturWaktuRtcDariUnix(lokal)) {
        Serial.println("[i] Jam RTC disinkronkan (NTP / server)");
      }
    }
    return;
  }

  if (p.id != 0) {
    if (IdSudahDiterima(p.id)) {
      return;                   /* QoS 1 bisa mengirim dua kali: jangan jalankan ulang */
    }
    CatatIdDiterima(p.id);
    Serial.printf("[perintah] #%llu %s\n", (unsigned long long)p.id, p.tipeTeks);
  }

  /* STOP & STOP_DARURAT selalu diterima */
  if (p.tipe == P_STOP_DARURAT) {
    TetapkanEstopServer(true);
    AkhiriKegiatan(false, "stop_darurat");
    MatikanSemuaBeban();
    Lapor(p.id, true, "stop_darurat");
    return;
  }
  if (p.tipe == P_STOP) {
    AkhiriKegiatan(false, "dihentikan");
    MatikanSemuaBeban();
    Lapor(p.id, true, "stop");
    return;
  }
  if (p.adaExp && p.id != 0 && JamRtcValid() && UnixUtc() > p.exp) {
    Lapor(p.id, false, "kedaluwarsa");
    return;
  }

  const char *alasan = NULL;
  float v = 0;
  switch (p.tipe) {
    case P_STATUS:
      MintaTelemetriSekarang();
      Lapor(p.id, true, "status_dikirim");
      return;

    case P_KONFIGURASI:
      PerintahKonfigurasi(p);
      return;

    case P_KALIBRASI:
      PerintahKalibrasiTim(p);
      return;

    case P_KAL_SENSOR:
      PerintahKalSensor(p);
      return;

    case P_BALIK_KALIBRASI: {
      const char *s = TeksP(p, "sensor");
      bool ph = strcasecmp(s, "ph") == 0;
      if (!ph && strcasecmp(s, "ec") != 0 && strcasecmp(s, "tds") != 0) {
        Lapor(p.id, false, "sensor_harus_ph_atau_ec");
      } else {
        bool ok = KembalikanKalibrasi(ph);
        Lapor(p.id, ok, ok ? "kalibrasi_dikembalikan" : "tidak_ada_cadangan");
      }
      return;
    }

    case P_PEMELIHARAAN: {
      const char *aksi = TeksP(p, "aksi");
      bool mulai = strcasecmp(aksi, "MULAI") == 0 || strcasecmp(aksi, "ON") == 0 ||
                   (AngkaP(p, "aktif", &v) && v != 0);
      bool selesai = strcasecmp(aksi, "SELESAI") == 0 || strcasecmp(aksi, "OFF") == 0 ||
                     (AngkaP(p, "aktif", &v) && v == 0);
      if (mulai) {
        if (EstopAktif() || estopLatch) {
          Lapor(p.id, false, "estop");
          return;
        }
        MulaiPemeliharaan("web");
        Lapor(p.id, true, "pemeliharaan_mulai");
      } else if (selesai) {
        SelesaiPemeliharaan("web");
        Lapor(p.id, true, "pemeliharaan_selesai");
      } else {
        Lapor(p.id, false, "aksi_harus_MULAI_atau_SELESAI");
      }
      return;
    }

    case P_SEMAI: {
      const char *kurang = ApaYangKurangSemai();
      if (kurang != NULL) {
        char a[48];
        snprintf(a, sizeof(a), "belum_siap_%s", kurang);
        for (char *c = a; *c; c++) { if (*c == ' ') { *c = '_'; } }
        Lapor(p.id, false, a);
        return;
      }
      DataSiklus baru = siklus;
      if (!BacaTarget(p, &baru, true, &alasan)) {
        Lapor(p.id, false, alasan);
        return;
      }
      baru.mode = MODE_SEMAI;
      ppmPernahNaik = false;                      /* semai baru: boleh mulai dari air baku */
      SimpanPpmPernahNaik(false);
      baru.mulaiUnix = UnixSekarang();
      siklus = baru;
      SimpanSiklus(siklus);
      Serial.printf("[i] SEMAI dimulai: target %.0f ppm, pH %.1f-%.1f\n", (double)siklus.targetPpm,
                    (double)siklus.phMin, (double)siklus.phMax);
      Lapor(p.id, true, "semai_dimulai");
      MintaTelemetriSekarang();
      return;
    }

    case P_TARGET: {
      DataSiklus baru = siklus;
      if (!BacaTarget(p, &baru, false, &alasan)) {
        Lapor(p.id, false, alasan);
        return;
      }
      siklus = baru;
      SimpanSiklus(siklus);
      Serial.printf("[i] Target baru: %.0f ppm, pH %.1f-%.1f\n", (double)siklus.targetPpm,
                    (double)siklus.phMin, (double)siklus.phMax);
      Lapor(p.id, true, "target_disimpan");
      MintaTelemetriSekarang();
      return;
    }

    case P_PANEN:
      if (keg != KEG_UJI_POMPA) {
        AkhiriKegiatan(false, "panen");
      }
      siklus.mode = MODE_PANEN;
      SimpanSiklus(siklus);
      Serial.println("[i] PANEN: dosing & isi otomatis berhenti, sensor tetap membaca");
      Lapor(p.id, true, "panen_dosing_off");
      MintaTelemetriSekarang();
      return;

    case P_OTOMASI: {
      /* hanya kunci yang disebut yang diubah; yang tidak disebut tetap */
      static const struct { const char *kunci; uint8_t bit; } BIT[] = {
        { "nutrisi", OTO_AB }, { "ph", OTO_PH }, { "encer", OTO_ENCER }, { "isi", OTO_ISI },
      };
      uint8_t baru = otomasi;
      bool ada = false;
      for (size_t i = 0; i < sizeof(BIT) / sizeof(BIT[0]); i++) {
        if (AngkaP(p, BIT[i].kunci, &v)) {
          ada = true;
          baru = (v != 0) ? (uint8_t)(baru | BIT[i].bit) : (uint8_t)(baru & ~BIT[i].bit);
        }
      }
      if (!ada) {
        Lapor(p.id, false, "otomasi_kosong");
        return;
      }
      if (baru != otomasi) {
        otomasi = baru;
        SimpanOtomasi(otomasi);
      }
      Serial.printf("[i] Izin otomasi: AB=%d pH=%d encer=%d isi=%d\n", (otomasi & OTO_AB) != 0,
                    (otomasi & OTO_PH) != 0, (otomasi & OTO_ENCER) != 0, (otomasi & OTO_ISI) != 0);
      Lapor(p.id, true, "otomasi_tersimpan");
      MintaTelemetriSekarang();
      return;
    }

    case P_BUKA_KUNCI:
      harian.kunciIsi = KUNCI_TIDAK;
      pompaKelamaan = false;
      ecCuriga = false;
      LupakanAcuanEc();
      BukaKunciNutrisi();
      SimpanHarianSekarang();
      Lapor(p.id, true, "kunci_dibuka");
      return;

    case P_OTA:
      /* OTA jauh hanya saat pemeliharaan (dibuka sengaja) & tidak ada kegiatan. Laporan akhir dikirim
         task komunikasi (gagal) atau setelah restart (berhasil). */
      if (!pemeliharaan) {
        Lapor(p.id, false, "mulai_pemeliharaan_dulu");
      } else if (keg != KEG_DIAM) {
        Lapor(p.id, false, "sibuk");
      } else if (!SiapkanOtaJauh(p.id)) {
        Lapor(p.id, false, "ota_parameter_salah_path_sha256");
      } else {
        Serial.println("[OTA] jauh: diterima, mulai mengunduh");
      }
      return;

    default:
      break;
  }

  /* ---- perintah yang menyalakan pompa ---- */
  if (EstopAktif() || estopLatch) {
    Lapor(p.id, false, "estop");
    return;
  }
  if (keg != KEG_DIAM) {
    if (p.tipe == P_ISI_AIR && strcasecmp(TeksP(p, "aksi"), "STOP") == 0 &&
        (keg == KEG_ISI_AIR || keg == KEG_ENCER)) {
      AkhiriKegiatan(false, "isi_air_stop");
      Lapor(p.id, true, "isi_air_stop");
      return;
    }
    Lapor(p.id, false, "sibuk");
    return;
  }

  switch (p.tipe) {
    case P_ISI_AIR: {
      const char *aksi = TeksP(p, "aksi");
      if (strcasecmp(aksi, "STOP") == 0) {
        MatikanBeban(BEBAN_ISI);
        Lapor(p.id, true, "isi_air_stop");
        return;
      }
      if (FloatAtasNaik())                   { Lapor(p.id, false, "tandon_penuh"); return; }
      if (level == LEVEL_ERROR)              { Lapor(p.id, false, "float_error"); return; }
      if (harian.kunciIsi != KUNCI_TIDAK)    { Lapor(p.id, false, "pompa_isi_terkunci"); return; }
      if (!MulaiIsi(KEG_ISI_AIR, p.id, &alasan)) {
        Lapor(p.id, false, alasan ? alasan : "gagal");
      }
      return;
    }

    case P_UJI_POMPA: {
      bool ok = false;
      Beban b = BebanDariNama(TeksP(p, "pompa"), &ok);
      float dtk = 0;
      if (!ok || !AngkaP(p, "detik", &dtk) || dtk < MIN_DETIK_POMPA || dtk > MAKS_DETIK_UJI_POMPA) {
        Lapor(p.id, false, "parameter_uji_pompa");
        return;
      }
      if (HarusPemeliharaan()) {
        Lapor(p.id, false, "mulai_pemeliharaan_dulu");
        return;
      }
      if (b == BEBAN_ISI && FloatAtasNaik()) {
        Lapor(p.id, false, "tandon_penuh");
        return;
      }
      if (!MulaiKegiatan(KEG_UJI_POMPA, b, (uint32_t)(dtk * 1000.0f), LajuBeban(b) * dtk, p.id, &alasan)) {
        Lapor(p.id, false, alasan ? alasan : "gagal");
        return;
      }
      if (pemeliharaan) {
        snprintf(langkahPem, sizeof(langkahPem), "Uji pompa %s %.0fs", TeksP(p, "pompa"), (double)dtk);
      }
      return;
    }

    case P_DOSIS: {
      const char *l = TeksP(p, "larutan");
      float ml = 0;
      if (!AngkaP(p, "ml", &ml) || ml <= 0) { Lapor(p.id, false, "parameter"); return; }
      if (pemeliharaan)                      { Lapor(p.id, false, "pemeliharaan"); return; }
      if (level == LEVEL_RENDAH)             { Lapor(p.id, false, "air_kurang_float_bawah"); return; }
      if (level == LEVEL_ERROR)              { Lapor(p.id, false, "float_error"); return; }
      if (strcasecmp(l, "AB") == 0) {
        if (P.lajuA <= 0 || P.lajuB <= 0)    { Lapor(p.id, false, "belum_dikalibrasi"); return; }
        if (harian.ab >= (uint8_t)P.maksAbHari) { Lapor(p.id, false, "batas_harian_ab"); return; }
        if (P.volumeL > 0 && ml / 2.0f > MAKS_ML_PER_L_SEKALI * P.volumeL) { Lapor(p.id, false, "melebihi_batas_suntik"); return; }
        if (!MulaiDosingAb(ml, p.id, &alasan)) { Lapor(p.id, false, alasan ? alasan : "gagal"); }
        return;
      }
      bool naik = strcasecmp(l, "PH_UP") == 0;
      if (!naik && strcasecmp(l, "PH_DOWN") != 0) { Lapor(p.id, false, "larutan_tak_dikenal"); return; }
      if (LajuBeban(naik ? BEBAN_PH_UP : BEBAN_PH_DOWN) <= 0) { Lapor(p.id, false, "belum_dikalibrasi"); return; }
      if (harian.ph >= (uint8_t)P.maksPhHari) { Lapor(p.id, false, "batas_harian_ph"); return; }
      if (ml > P.phMlMaks)                   { Lapor(p.id, false, "melebihi_batas_suntik"); return; }
      if (!MulaiDosingPh(naik, ml, p.id, &alasan)) { Lapor(p.id, false, alasan ? alasan : "gagal"); }
      return;
    }

    default:
      Lapor(p.id, false, "tipe_tak_dikenal");
      return;
  }
}

/* ===========================================================================
 *  STATUS
 * ========================================================================= */
const ParameterAlat &ParameterAktif(void) { return P; }

bool AturParameterSerial(const char *nama, float nilai, char *pesan, size_t n)
{
  ParameterAlat baru = P;
  int idx = CariIndeksParameter(AliasParameter(nama));
  if (idx < 0) {
    snprintf(pesan, n, "nama parameter tidak dikenal (ketik 'param')");
    return false;
  }
  if (!AturNilaiParameter(baru, idx, nilai, pesan, n)) {
    return false;
  }
  if (!SimpanParameter(baru)) {
    snprintf(pesan, n, "gagal menyimpan ke flash");
    return false;
  }
  P = baru;
  TetapkanFaktorEc(P.ecFaktor);
  snprintf(pesan, n, "%s = %g tersimpan", NamaParameter(idx), (double)nilai);
  return true;
}

void AmbilStatusSistem(StatusSistem *s)
{
  uint32_t now = millis();
  memset(s, 0, sizeof(*s));
  s->sensor = sen;
  s->floatBawahNaik = FloatBawahNaik();
  s->floatAtasNaik = FloatAtasNaik();
  s->level = level;
  for (int i = 0; i < JUMLAH_BEBAN; i++) {
    s->bebanNyala[i] = BebanMenyala((Beban)i);
  }
  s->estopFisik = EstopFisikDitekan();
  s->estopServer = EstopDariServer();
  s->tungguReset = estopLatch && !EstopFisikDitekan();
  s->pemeliharaan = pemeliharaan;
  s->mode = (ModeSiklus)siklus.mode;
  const char *kurang = ApaYangKurangTampil();
  s->siap = (kurang == NULL);
  snprintf(s->kurang, sizeof(s->kurang), "%s", kurang ? kurang : "");
  s->kegiatan = keg;
  s->kegiatanMl = (keg == KEG_DIAM) ? 0 : MlBerjalan();
  s->kegiatanMlTotal = mlRencana;
  if (keg != KEG_DIAM) {
    uint32_t jalan = now - tKeg;
    uint32_t sisa = (jalan < durasiKegMs) ? durasiKegMs - jalan : 0;
    if (keg == KEG_DOSING_A || keg == KEG_JEDA_AB) {
      sisa += durasiBMs + (keg == KEG_DOSING_A ? (uint32_t)(P.jedaAbDtk * 1000.0f) : 0);
    }
    s->kegiatanSisaDtk = (keg == KEG_ISI_AIR || keg == KEG_ENCER) ? jalan / 1000UL : sisa / 1000UL;
  }
  s->kunciIsi = (KunciIsi)harian.kunciIsi;
  s->pompaKelamaan = pompaKelamaan;
  s->ecCuriga = ecCuriga;
  s->ppmTerlaluRendah = ppmTerlaluRendah && siklus.mode == MODE_SEMAI;
  s->nutrisiHabis = kunciNutrisi;
  s->otaBerjalan = OtaBerjalan();
  s->otaPersen = PersenOta();
  s->batasAbPenuh = harian.ab >= (uint8_t)P.maksAbHari;
  s->batasPhPenuh = harian.ph >= (uint8_t)P.maksPhHari;
  s->encerTertunda = encerTertunda;
  s->targetPpm = siklus.targetPpm;
  s->phMin = siklus.phMin;
  s->phMax = siklus.phMax;
  if (siklus.mode == MODE_SEMAI && siklus.mulaiUnix > 0 && JamRtcValid() && UnixSekarang() >= siklus.mulaiUnix) {
    s->hariSemai = (uint16_t)((UnixSekarang() / 86400UL) - (siklus.mulaiUnix / 86400UL) + 1);
  }
  s->otomasi = otomasi;
  s->abHari = harian.ab;
  s->phHari = harian.ph;
  s->encerHari = harian.encer;
  s->isiHari = harian.isi;
  uint32_t mon = MonitoringMs(), lewat = now - tTindakan;
  s->sisaMonitoringDtk = (lewat < mon) ? (mon - lewat) / 1000UL : 0;
  s->dosingTerakhirUnix = harian.dosingTerakhirUnix;
  if (pemeliharaan) {
    uint32_t maks = (uint32_t)(P.pemeliharaanMaksMenit * 60000.0f), jalan = now - tPemeliharaan;
    s->sisaPemeliharaanDtk = (jalan < maks) ? (maks - jalan) / 1000UL : 0;
  }
  snprintf(s->langkahPemeliharaan, sizeof(s->langkahPemeliharaan), "%s", langkahPem);
  s->layarSementara = layarSementara;
  s->kalTunggu = kalUkur.ada;
  s->rtcValid = JamRtcValid();
  s->unixLokal = UnixSekarang();
  s->uptimeDtk = now / 1000UL;
  s->wifiOk = WifiTerhubung();
  s->mqttOk = MqttTerhubung();
  s->serverOk = ServerSegar();
  s->rssi = RssiWifi();
  s->param = P;
}
