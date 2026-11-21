/* ============================================================================
 *  TampilanLcd — LCD 20x4 I2C (PCF8574, 0x27). Hanya dari loop utama.
 *  Prioritas layar (yang lebih tinggi menutup, tidak bergantian):
 *    1. E-STOP ditekan   2. tunggu RESET   3. E-STOP server   4. pesan singkat (RESET OK / info)
 *    5. pemeliharaan     6. utama 1 <-> utama 2 bergantian tiap 10 dtk
 *  Dosing / isi air tampil di baris 4 layar utama (angka tetap terlihat).
 * ========================================================================== */
#pragma once
#include <Arduino.h>
#include "Tipe.h"

void InisialisasiLcd(void);
void TampilkanSplash(void);
void PerbaruiLcd(const StatusSistem &s);
