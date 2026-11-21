/* ============================================================================
 *  Kontrol — otak alat (Rancangan v6, disepakati 17 Nov 2026):
 *   - SIAP -> (web: SEMAI + target ppm + rentang pH) -> SEMAI -> (web: PANEN) -> PANEN
 *   - SEMAI: jaga ppm (dosing AB 80% dari kekurangan, maks 150 ppm sekali),
 *            encerkan bila ppm terlalu tinggi (hanya saat air SEDANG),
 *            jaga pH (pH dicek terakhir, jeda 2 jam, tanpa bolak-balik),
 *            isi air otomatis (float bawah turun -> isi sampai float atas naik)
 *   - setiap tindakan diikuti jeda "waktu monitoring" sebelum tindakan berikutnya
 *   - batas harian: AB 6x, pH 5x, encer 3x, isi 6x (lebih = curiga bocor -> dikunci)
 *   - E-STOP: semua mati, lanjut hanya setelah tombol dilepas + RESET ditekan
 *   - pemeliharaan (web / tahan RESET 5 dtk): dosing berhenti, untuk kalibrasi
 *  Semua di loop utama (satu thread): tidak ada kondisi balapan.
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

void InisialisasiKontrol(void);       /* setelah sensor & komunikasi */
void PerbaruiKontrol(void);           /* tiap loop */
void TerapkanPerintah(const PerintahWeb &p);   /* dari web (id >= 1) atau serial (id 0) */
void AmbilStatusSistem(StatusSistem *s);
const ParameterAlat &ParameterAktif(void);
bool AturParameterSerial(const char *nama, float nilai, char *pesan, size_t n);
