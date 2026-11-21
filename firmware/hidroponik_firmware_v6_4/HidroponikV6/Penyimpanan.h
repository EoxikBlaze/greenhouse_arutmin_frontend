/* ============================================================================
 *  Penyimpanan — keadaan yang harus bertahan saat listrik mati (flash/NVS).
 *  Ditulis hanya saat berubah (bukan tiap detik) agar flash awet.
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

struct DataSiklus {
  uint8_t  mode;          /* ModeSiklus */
  float    targetPpm;     /* 0 = belum ada */
  float    phMin, phMax;  /* 0 = belum ada */
  uint32_t mulaiUnix;     /* awal semai (waktu lokal), 0 = tidak diketahui */
};

struct DataHarian {
  uint32_t hari;          /* unixLokal / 86400 ; 0 = belum diketahui */
  uint8_t  ab, ph, encer, isi;
  uint8_t  kunciIsi;      /* KunciIsi */
  uint32_t phTerakhirUnix;
  uint32_t dosingTerakhirUnix;
};

/* Jurnal: ditulis SEBELUM pompa dinyalakan, dihapus setelah selesai.
   Ada saat boot = listrik mati / reboot di tengah kegiatan. */
struct DataJurnal {
  uint64_t idPerintah;    /* 0 = kegiatan otomatis */
  uint8_t  kegiatan;      /* Kegiatan */
};

void MuatSiklus(DataSiklus *d);
void SimpanSiklus(const DataSiklus &d);
void MuatHarian(DataHarian *d);
void SimpanHarian(const DataHarian &d);
/* izin otomasi (bit OTO_*); belum pernah diatur = semua ON */
uint8_t MuatOtomasi(void);
void SimpanOtomasi(uint8_t m);
/* ppm pernah naik di atas ppm_min_dosing sejak SEMAI / ganti air (pengaman probe terangkat) */
bool MuatPpmPernahNaik(void);
void SimpanPpmPernahNaik(bool naik);
/* kunci "nutrisi habis" (2x dosing AB tanpa kenaikan ppm) — bertahan sampai RESET / BUKA_KUNCI */
bool MuatKunciNutrisi(void);
void SimpanKunciNutrisi(bool kunci);
/* id perintah OTA yang berhasil: dilaporkan setelah restart dengan program baru */
uint64_t MuatOtaId(void);
void SimpanOtaId(uint64_t id);
void HapusOtaId(void);
/* hapus SEMUA data alat di flash (parameter, status, kalibrasi, WiFi tambahan) */
void KosongkanSemuaFlash(void);
bool MuatJurnal(DataJurnal *d);
void SimpanJurnal(const DataJurnal &d);
void HapusJurnal(void);

/* id perintah yang sudah diterima (16 terakhir) — cegah perintah dijalankan dua kali */
bool IdSudahDiterima(uint64_t id);
void CatatIdDiterima(uint64_t id);
