/* ============================================================================
 *  WaktuRtc — pembungkus DS3231.
 *  PENTING: hanya PerbaruiWaktuRtc()/AturWaktuRtc*() yang menyentuh bus I2C
 *  (dipanggil dari loop utama). Pembaca lain (mis. pencatat log dari task
 *  WiFi) memakai UnixSekarang() yang membaca cache — aman lintas-task.
 *  Semua waktu = WAKTU LOKAL (zona waktu = tzMenit), disimpan sebagai
 *  "detik sejak 1970" semu.
 * ========================================================================== */
#pragma once
#include <Arduino.h>

void InisialisasiBusI2C(void);
bool InisialisasiJamRtc(void);          /* true = chip terdeteksi */
void PerbaruiWaktuRtc(void);            /* panggil tiap loop; membaca chip tiap 1 detik */
bool JamRtcValid(void);                 /* chip ada, tidak kehilangan daya, angka masuk akal */
uint32_t UnixSekarang(void);            /* waktu lokal (cache + interpolasi); 0 bila tidak valid */
bool AturWaktuRtc(uint16_t th, uint8_t bl, uint8_t tg, uint8_t jam, uint8_t mnt, uint8_t dtk);
bool AturWaktuRtcDariUnix(uint32_t unixLokal);
void PecahUnix(uint32_t unixLokal, uint16_t *th, uint8_t *bl, uint8_t *tg,
               uint8_t *jam, uint8_t *mnt, uint8_t *dtk);
