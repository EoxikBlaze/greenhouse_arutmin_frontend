/* ============================================================================
 *  Tipe.h — tipe bersama antar modul.
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Parameter.h"

enum Beban : uint8_t {
  BEBAN_POMPA_A = 0,
  BEBAN_POMPA_B,
  BEBAN_PH_UP,
  BEBAN_PH_DOWN,
  BEBAN_ISI,
  JUMLAH_BEBAN
};

/* Pola lampu pilot: satu lampu pada satu waktu */
enum PolaLampu : uint8_t {
  LAMPU_MATI = 0,
  LAMPU_BIRU,            /* normal */
  LAMPU_BIRU_KEDIP_CEPAT,/* dosing / uji pompa */
  LAMPU_BIRU_KEDIP_LAMBAT,/* isi air / encerkan */
  LAMPU_KUNING,          /* perlu perhatian */
  LAMPU_KUNING_KEDIP,    /* pemeliharaan */
  LAMPU_MERAH,           /* E-STOP */
  LAMPU_MERAH_KEDIP      /* kerusakan: float error, isi terkunci, pompa kelamaan, sensor rusak */
};

/* Mode siklus tanam (tersimpan di flash) */
enum ModeSiklus : uint8_t {
  MODE_SIAP = 0,         /* belum semai: sensor jalan, dosing & isi otomatis mati */
  MODE_SEMAI,            /* menjaga target ppm & pH, isi otomatis aktif */
  MODE_PANEN             /* selesai: dosing & isi otomatis mati, sensor tetap jalan */
};

enum LevelAir : uint8_t { LEVEL_RENDAH = 0, LEVEL_SEDANG, LEVEL_PENUH, LEVEL_ERROR };

/* Kegiatan aktuator yang sedang berjalan (hanya satu) */
enum Kegiatan : uint8_t {
  KEG_DIAM = 0,
  KEG_DOSING_A,
  KEG_JEDA_AB,
  KEG_DOSING_B,
  KEG_PH_UP,
  KEG_PH_DOWN,
  KEG_ISI_AIR,           /* karena air rendah */
  KEG_ENCER,             /* mengencerkan karena ppm terlalu tinggi */
  KEG_UJI_POMPA
};

/* Kunci yang menahan pompa isi (tersimpan di flash; dibuka tombol RESET / perintah web) */
enum KunciIsi : uint8_t { KUNCI_TIDAK = 0, KUNCI_ISI_SERING, KUNCI_ISI_TIMEOUT };

struct SnapshotSensor {
  bool  ecValid, ecStabil, ecTerkalibrasi;
  bool  phValid, phStabil, phTerkalibrasi;
  bool  suhuAirValid, udaraValid;
  bool  kunci;           /* bacaan rusak berturut-turut */
  bool  adsAda;
  float ecMs, ppm, ph, suhuAir, suhuUdara, kelembaban;
  float ecVolt, phVolt;
};

struct StatusSistem {
  SnapshotSensor sensor;
  bool      floatBawahNaik, floatAtasNaik;
  LevelAir  level;
  bool      bebanNyala[JUMLAH_BEBAN];
  bool      estopFisik, estopServer, tungguReset;
  bool      pemeliharaan;
  ModeSiklus mode;
  bool      siap;                 /* semua nilai wajib terisi */
  char      kurang[24];           /* apa yang belum diisi (bila !siap) */
  Kegiatan  kegiatan;
  float     kegiatanMl, kegiatanMlTotal;  /* progres dosing */
  uint32_t  kegiatanSisaDtk;
  KunciIsi  kunciIsi;
  bool      pompaKelamaan;
  bool      ecCuriga;             /* ppm turun mendadak tanpa isi air: probe terangkat? */
  bool      ppmTerlaluRendah;     /* ppm < ppm_min_dosing: dosing ditahan */
  bool      nutrisiHabis;         /* 2x dosing AB tanpa kenaikan ppm: botol A/B habis / selang lepas? */
  bool      otaBerjalan;          /* program baru sedang diunggah (semua pompa OFF) */
  uint8_t   otaPersen;
  bool      batasAbPenuh, batasPhPenuh;
  bool      encerTertunda;
  float     targetPpm, phMin, phMax;
  uint16_t  hariSemai;            /* 0 = tidak diketahui */
  uint8_t   abHari, phHari, encerHari, isiHari;
  uint8_t   otomasi;              /* bit OTO_*: 1 = alat boleh menyalakan sendiri */
  uint32_t  sisaMonitoringDtk;
  uint32_t  dosingTerakhirUnix;
  uint32_t  sisaPemeliharaanDtk;
  char      langkahPemeliharaan[21];
  uint8_t   layarSementara;       /* 0 = tidak, 1 = info jaringan, 2 = RESET OK, 3 = kunci dibuka */
  bool      kalTunggu;            /* ada hasil UKUR kalibrasi menunggu SIMPAN */
  bool      rtcValid;
  uint32_t  unixLokal;
  uint32_t  uptimeDtk;
  bool      wifiOk, mqttOk, serverOk;
  int       rssi;
  ParameterAlat param;
};

/* ----------------------- PERINTAH DARI WEB ----------------------- */
enum TipePerintah : uint8_t {
  P_TIDAK_DIKENAL = 0,
  P_STOP, P_STOP_DARURAT,
  P_ISI_AIR, P_UJI_POMPA, P_DOSIS,
  P_KALIBRASI,           /* format tim: ph_v4/ph_v7/tds_faktor/laju_* */
  P_BALIK_KALIBRASI,
  P_KAL_SENSOR,          /* v6: {sensor, titik, aksi: UKUR|SIMPAN|BATAL} */
  P_KONFIGURASI,         /* v6: volume_l, monitoring_menit, jeda_ab_dtk, ppm_per_ml_ab, ... */
  P_SEMAI, P_TARGET, P_PANEN,
  P_PEMELIHARAAN,        /* {aksi: MULAI|SELESAI} */
  P_BUKA_KUNCI,
  P_OTOMASI,             /* v6: {nutrisi, ph, encer, isi: 0|1} izin otomasi per aktuator */
  P_STATUS,
  P_OTA,                 /* v6.2: {path, sha256} unduh program baru dari Pi (wajib pemeliharaan) */
  P_KONSOL,              /* v6.2: {baris} jalankan perintah serial dari web; keluaran di hasil.keluaran */
  P_SINKRON_JAM          /* internal: dari NTP / ts detak server */
};

/* Izin otomasi per aktuator (dari saklar web). OFF = alat hanya membaca & melapor; perintah manual tetap jalan. */
const uint8_t OTO_AB = 1, OTO_PH = 2, OTO_ENCER = 4, OTO_ISI = 8, OTO_SEMUA = 15;

const int MAKS_ANGKA_PERINTAH = 16;
const int MAKS_TEKS_PERINTAH  = 4;

struct PerintahWeb {
  uint64_t     id;               /* 0 = internal (tanpa laporan) */
  TipePerintah tipe;
  char         tipeTeks[20];
  bool         adaExp;
  uint32_t     exp;              /* epoch UTC */
  uint8_t      nAngka, nTeks;
  char         kunciAngka[MAKS_ANGKA_PERINTAH][22];
  float        angka[MAKS_ANGKA_PERINTAH];
  char         kunciTeks[MAKS_TEKS_PERINTAH][12];
  char         teks[MAKS_TEKS_PERINTAH][48];
};

/* ----------------------- NAMA (untuk data, serial, LCD) ----------------------- */
inline const char *NamaMode(ModeSiklus m)
{
  switch (m) {
    case MODE_SEMAI: return "SEMAI";
    case MODE_PANEN: return "PANEN";
    default:         return "SIAP";
  }
}

inline const char *NamaLevel(LevelAir l)
{
  switch (l) {
    case LEVEL_RENDAH: return "RENDAH";
    case LEVEL_SEDANG: return "SEDANG";
    case LEVEL_PENUH:  return "PENUH";
    default:           return "ERROR";
  }
}

inline const char *NamaKegiatan(Kegiatan k)
{
  switch (k) {
    case KEG_DOSING_A:  return "DOSING_A";
    case KEG_JEDA_AB:   return "JEDA_AB";
    case KEG_DOSING_B:  return "DOSING_B";
    case KEG_PH_UP:     return "PH_UP";
    case KEG_PH_DOWN:   return "PH_DOWN";
    case KEG_ISI_AIR:   return "ISI_AIR";
    case KEG_ENCER:     return "ENCER";
    case KEG_UJI_POMPA: return "UJI_POMPA";
    default:            return "DIAM";
  }
}

/* Kunci yang sedang menahan alat ("" = tidak ada) */
inline const char *NamaKunci(const StatusSistem &s)
{
  if (s.level == LEVEL_ERROR)               return "FLOAT_ERROR";
  if (s.kunciIsi == KUNCI_ISI_SERING)       return "ISI_SERING";
  if (s.kunciIsi == KUNCI_ISI_TIMEOUT)      return "ISI_TIMEOUT";
  if (s.pompaKelamaan)                      return "POMPA_KELAMAAN";
  if (s.ecCuriga)                           return "EC_CURIGA";
  if (s.nutrisiHabis)                       return "NUTRISI_HABIS";
  if (s.sensor.kunci)                       return "SENSOR_RUSAK";
  return "";
}

const int MAKS_EKSTRA_LAPORAN = 6;

/* Laporan ke garap/<kode>/hasil (diulang tiap 3 dtk sampai ack) */
struct Laporan {
  uint64_t id;
  bool     selesai;              /* "selesai" / "gagal" */
  char     alasan[48];
  uint8_t  nEkstra;
  char     kunci[MAKS_EKSTRA_LAPORAN][16];
  float    nilai[MAKS_EKSTRA_LAPORAN];
  char     keluaran[900];        /* teks keluaran perintah KONSOL ("" = tidak ada) */
};
