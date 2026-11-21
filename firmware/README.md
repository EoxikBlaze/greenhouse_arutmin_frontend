# Firmware alat (ESP32)

Versi final: `hidroponik_firmware_v6_4/` (sumber asli di Laragon `fw_hidro/hidroponik_firmware_v6_4`).
Penjelasan per versi ada di `README_v6.md` sampai `README_v6.4.md` di folder itu.

## Sebelum compile
1. Salin `HidroponikV6/rahasia.contoh.h` menjadi `HidroponikV6/rahasia.h`, lalu isi WiFi, IP server, API key, dan sandi OTA.
2. `rahasia.h` diabaikan git (lihat `.gitignore`). Jangan pernah meng-commit file itu.
3. Arduino IDE: board ESP32 Dev Module, Partition Scheme **Minimal SPIFFS (1.9MB APP with OTA)**, Erase All Flash **Disabled**.
4. Saat kabel USB tersambung, cabut OUT+ buck dari J7.

Status: belum diunggah dan belum diuji di alat.
