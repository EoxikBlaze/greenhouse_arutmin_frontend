/* ============================================================================
 *  Config.h — pin, alamat, dan batas tetap firmware Hidroponik v6.
 *  Nilai yang diatur dari web/serial (volume, laju pompa, target, dll.) TIDAK
 *  di sini, melainkan di Parameter (tersimpan di flash/NVS).
 * ========================================================================== */
#pragma once
#include <Arduino.h>

#define FIRMWARE_VERSI  "6.4.0"
#define NAMA_FIRMWARE   "hidro-v" FIRMWARE_VERSI
#define KODE_PERANGKAT  "aktuator-01"     /* = user MQTT di Pi (peran 'gabungan') */

/* ---------------- PIN (PCB perfboard v7) ---------------- */
const int PIN_I2C_SDA        = 21;
const int PIN_I2C_SCL        = 22;
const int PIN_SUHU_AIR       = 4;    /* DS18B20 */
/* Modul relay 8 kanal terpasang terbalik (20 Nov 2026): kanal dibaca dari ujung lain.
   GPIO -> pompa TIDAK berubah; hanya nomor relay di modul. */
const int PIN_RELAY_POMPA_A  = 25;   /* IN8 / relay 8 (dulu IN1) */
const int PIN_RELAY_POMPA_B  = 26;   /* IN7 / relay 7 (dulu IN2) */
const int PIN_RELAY_PH_UP    = 27;   /* IN6 / relay 6 (dulu IN3) */
const int PIN_RELAY_PH_DOWN  = 18;   /* IN5 / relay 5 (dulu IN4) */
const int PIN_RELAY_ISI      = 16;   /* IN4 / relay 4 (dulu IN5) = pompa isi air 12 V */
/* Lampu pilot lewat ULN2003 (HIGH = nyala), susunan box 17 Nov 2026:
   PILOT1 = MERAH, PILOT2 = KUNING, PILOT3 = BIRU */
const int PIN_LAMPU_MERAH    = 13;   /* ULN2003 IN1 -> J20-2 PILOT1 */
const int PIN_LAMPU_KUNING   = 17;   /* ULN2003 IN2 -> J20-3 PILOT2 */
const int PIN_LAMPU_BIRU     = 23;   /* ULN2003 IN3 -> J20-4 PILOT3 */
const int PIN_FLOAT_BAWAH    = 32;   /* J14, HIGH = terangkat (air ada) */
const int PIN_FLOAT_ATAS     = 33;   /* J15, HIGH = terangkat (penuh); kabel putus = dianggap penuh (aman) */
const int PIN_TOMBOL_RESET   = 19;   /* J16, NO ke GND, INPUT_PULLUP */
const int PIN_STATUS_ESTOP   = 36;   /* J18 -> 68k -> GPIO36 -> 20k -> GND (12 V = ~2,7 V) */

const int TINGKAT_RELAY_NYALA     = HIGH;
const int TINGKAT_FLOAT_TERANGKAT = HIGH;
const uint32_t AMBANG_ESTOP_MV    = 1500;   /* di bawah ini = bus aktuator mati = E-STOP ditekan */

/* Uji meja TANPA tombol E-STOP: ubah ke 0 hanya sementara, WAJIB 1 di box. */
#define BACA_ESTOP 1

/* ---------------- I2C ---------------- */
const uint8_t  ALAMAT_ADS1115 = 0x48;   /* A0 = pH, A1 = EC (pembagi 10k/10k) */
const uint8_t  ALAMAT_RTC     = 0x68;
const uint8_t  ALAMAT_LCD     = 0x27;
const uint8_t  ALAMAT_SHT31   = 0x44;
const uint32_t KECEPATAN_I2C  = 100000;
const uint8_t  KANAL_ADS_PH   = 0;
const uint8_t  KANAL_ADS_EC   = 1;
const float    FAKTOR_PEMBAGI_EC = 2.0f;

/* ---------------- SENSOR ---------------- */
const uint32_t INTERVAL_SIKLUS_SENSOR_MS = 2000;   /* 9 sampel x 2 dtk = jendela 18 dtk */
const uint8_t  UKURAN_JENDELA            = 9;
const uint8_t  SAMPEL_MINIMAL_VALID      = 5;
const uint32_t UMUR_MAKS_DATA_MS         = 10000;
const float SANITY_EC_MIN_MS      = 0.0f;
const float SANITY_EC_MAX_MS      = 20.0f;   /* batas modul EC; larutan kalibrasi 12,88 mS harus terbaca */
const float SANITY_PH_MIN         = 2.0f;
const float SANITY_PH_MAX         = 12.0f;
const float SANITY_SUHU_MIN       = 1.0f;
const float SANITY_SUHU_MAX       = 50.0f;
const float SANITY_UDARA_SUHU_MIN = -20.0f;
const float SANITY_UDARA_SUHU_MAX = 70.0f;
const float    LONJAKAN_EC_MS          = 0.5f;
const uint8_t  LONJAKAN_MAKS_DIABAIKAN = 3;
const float    AMBANG_STABIL_EC_MS     = 0.06f;
const float    AMBANG_STABIL_PH        = 0.15f;
const uint8_t  BATAS_INVALID_BERTURUT  = 3;
const uint8_t  SYARAT_VALID_PULIH      = 3;
const float KOEF_SUHU_EC = 0.02f;
const float PPM_PER_MS   = 500.0f;          /* ppm = EC (mS/cm) x 500 — disepakati */
const uint32_t DEBOUNCE_FLOAT_MS  = 300;
/* shortcut: float bawah rusak (20 Nov 2026) -> dibaca SELALU naik (air ada). Akibatnya isi air
   otomatis saat RENDAH tidak pernah jalan; air harus dicek manual. Kembalikan ke false setelah
   float bawah diganti. Float atas tetap dibaca normal (pengaman isi/encer tetap jalan). */
const bool PAKSA_FLOAT_BAWAH_NAIK = true;
const uint32_t DEBOUNCE_TOMBOL_MS = 50;
const uint32_t DEBOUNCE_ESTOP_MS  = 30;
const uint32_t TAHAN_RESET_PEMELIHARAAN_MS = 5000;   /* tahan RESET 5 dtk = masuk/keluar pemeliharaan */

/* ---------------- PENGAMAN POMPA ---------------- */
const uint32_t MAKS_POMPA_DOSING_MS   = 600000UL;      /* 10 mnt: pompa dosing dipaksa mati */
const uint32_t MAKS_POMPA_ISI_MS      = 45UL * 60000UL; /* lapis terakhir pompa isi */
const float    MAKS_DETIK_UJI_POMPA   = 120.0f;
const float    MIN_DETIK_POMPA        = 0.3f;
const float    MAKS_ML_PER_L_SEKALI   = 3.0f;          /* A (atau B) per dosis <= 3 mL per liter tandon */
const uint32_t TUNDA_RENDAH_MS        = 10000;         /* air RENDAH stabil 10 dtk baru isi */
const uint32_t KAL_UKUR_BERLAKU_MS    = 10UL * 60000UL; /* hasil UKUR kalibrasi boleh disimpan <= 10 mnt */

/* ---------------- KOMUNIKASI ---------------- */
const uint32_t DETAK_SERVER_MAKS_MS = 30000;   /* detak garap/server/status lebih tua = server hilang */
const uint32_t ULANG_HASIL_MS       = 3000;
const uint32_t INTERVAL_STATUS_MS   = 30000;
const int      MAKS_LAPORAN_TERTUNDA = 6;
const uint32_t PENGAWAS_TIMEOUT_MS  = 8000;    /* loop macet 8 dtk -> semua OFF + restart */
const uint32_t INTERVAL_LCD_MS      = 500;
const uint32_t GANTI_LAYAR_MS       = 10000;   /* layar utama 1 <-> 2 */
