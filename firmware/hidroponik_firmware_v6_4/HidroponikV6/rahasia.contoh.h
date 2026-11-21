/* CONTOH rahasia.h - salin menjadi rahasia.h lalu isi nilai asli. rahasia.h TIDAK boleh masuk git.
   OTA_PASSWORD harus lebih dari 8 karakter (bila tidak, OTA lokal dimatikan). */
// Konfigurasi lokal ESP32 GARAP — RAHASIA (JANGAN dibagikan / di-commit ke Git).
// Disederhanakan: satu Wi-Fi saja.
#pragma once

// Satu-satunya Wi-Fi alat.
#define WIFI_SSID   "ISI_DI_SINI"
#define WIFI_PASS   "ISI_DI_SINI"

// ESP32 hanya bisa WiFi 2,4 GHz. Nama WiFi peka huruf besar/kecil.
// Satu jaringan saja (WIFI_JARINGAN sengaja tidak diisi): firmware memakai WIFI_SSID + WIFI_PASS.

// IP Raspberry Pi di jaringan TP-Link (minta tim web mengunci IP ini di router).
// Di hotspot Pi alat otomatis memakai gateway 10.42.0.1.
#define SERVER_IP   "ISI_DI_SINI"   /* IP Pi (20 Nov 2026); kunci di router agar tetap */

// ID meja/penampung di web (0 = bacaan umum; ubah ke >= 1 sesuai id penampung di web,
// atau kirim KONFIGURASI id_meja dari web)
#define ID_MEJA     0

// Satu ESP32 = satu login 'aktuator-01' (peran 'gabungan': sensor + aktuator).
#define API_KEY_AKTUATOR "ISI_DI_SINI"
// #define MQTT_PORT 1883

// Password OTA lokal (Arduino IDE meminta ini saat upload lewat WiFi). Minimal 8 karakter.
// Kosongkan ("") untuk mematikan OTA lokal.
#define OTA_PASSWORD "ISI_DI_SINI"
