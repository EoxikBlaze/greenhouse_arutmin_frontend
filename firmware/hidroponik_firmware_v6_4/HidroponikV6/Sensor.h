/* ============================================================================
 *  Sensor — pH, EC, suhu air, suhu/kelembaban ruangan, 2 float switch.
 *   - median 9 sampel + cek ketenangan, sanity check, kunci bila rusak berturut-turut
 *   - kompensasi suhu EC ke 25 C; ppm = EC x 500
 *   - kalibrasi 2 titik di flash (namespace "kalibrasi_ph"/"kalibrasi_ec" — sama dengan
 *     sketch uji & v5, jadi kalibrasi yang sudah ada TETAP terpakai)
 *  Hanya dipanggil dari loop utama (bus I2C tidak aman lintas-task).
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

bool InisialisasiSensor(void);          /* true = ADS1115 terdeteksi */
void PerbaruiSensor(void);
void AmbilSnapshotSensor(SnapshotSensor *s);
void ResetJendelaSensor(void);
void TetapkanFaktorEc(float f);         /* koreksi dari web (tds_faktor) */
float EcMentahTerakhir(void);           /* EC hitungan terakhir walau ditolak (diagnosa serial) */

bool FloatBawahNaik(void);              /* true = terangkat (air ada) */
bool FloatAtasNaik(void);               /* true = terangkat (penuh) */

/* Kalibrasi 2 titik. pH: titik 1 = buffer 4,01, titik 2 = 6,86 (atau 7,00).
   EC: titik 1 = 1,413 mS/cm, titik 2 = 12,88 mS/cm.
   UKUR: rata-rata 16 bacaan, ditolak bila belum tenang — TIDAK disimpan.
   SIMPAN: menyimpan tegangan hasil ukur ke flash. */
bool UkurKalibrasi(bool ph, uint8_t titik, float *volt, char *pesan, size_t n);
bool SimpanTitikKalibrasi(bool ph, uint8_t titik, float volt, float acuan, char *pesan, size_t n);
/* Dua titik sekaligus (format web tim: KALIBRASI ph_v4 + ph_v7) */
bool SimpanDuaTitikKalibrasi(bool ph, float v1, float a1, float v2, float a2, char *pesan, size_t n);
float AcuanBawaan(bool ph, uint8_t titik);   /* EC: sudah dikoreksi suhu air saat ini */
bool KembalikanKalibrasi(bool ph);           /* set lengkap sebelumnya */
uint8_t JumlahTitikKalibrasi(bool ph);
void InfoKalibrasi(bool ph, float *v1, float *v2, float *a1, float *a2);
