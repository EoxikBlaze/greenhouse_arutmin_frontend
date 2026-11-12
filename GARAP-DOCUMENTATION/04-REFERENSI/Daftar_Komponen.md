# Daftar Komponen GARAP

| Atribut | Isi |
|---|---|
| Nomor dokumen | GARAP-REF-02 |
| Versi | 1.0 |
| Tanggal | 12 November 2026 |
| Sumber | Firmware `deploy-pi/firmware/gabungan/gabungan.ino` (v0.6), `rahasia.h.contoh`, konfigurasi `deploy-pi/` |

Kolom **Verifikasi**: ✅ ada di konfigurasi/kode aktif · ❓ [PERLU VERIFIKASI] di perangkat nyata · ❌ tidak ditemukan di konfigurasi aktif.

## 1. Perangkat Keras Panel

| No | Komponen | Jumlah | Spesifikasi dari konfigurasi | Pin / alamat | Verifikasi |
|---|---|---|---|---|---|
| 1 | ESP32 DevKit (board "ESP32 Dev Module") | 1 | Prompt menyebut DevKit V4 WROOM32 | — | ✅ kode / ❓ model fisik |
| 2 | ADS1115 ADC 16-bit | 1 | I2C | 0x48, SDA 21, SCL 22 | ✅ |
| 3 | Probe pH + modul | 1 | Dibaca lewat ADS1115 A0; nilai awal kalibrasi pH7 = 2,50 V, pH4 = 3,05 V | A0 | ✅ kode / ❓ model (KB2003?) |
| 4 | Probe EC/TDS + modul | 1 | ADS1115 A1 lewat pembagi 10k/10k (faktor 2) | A1 | ✅ kode / ❓ model |
| 5 | DS18B20 (tahan air) | 1 | OneWire | GPIO 4 | ✅ |
| 6 | SHT31 | 1 | Suhu & RH udara | 0x44 | ✅ |
| 7 | DHT22 | — | Hanya di firmware lama `sensor.ino` | GPIO 16 (lama) | ❌ di firmware aktif |
| 8 | Pompa peristaltik 12 V — nutrisi A | 1 | Laju belum dikalibrasi | GPIO 25 | ✅ kode / ❓ debit |
| 9 | Pompa peristaltik 12 V — nutrisi B | 1 | idem | GPIO 26 | ✅ / ❓ |
| 10 | Pompa peristaltik 12 V — pH Up | 1 | idem | GPIO 27 | ✅ / ❓ |
| 11 | Pompa peristaltik 12 V — pH Down | 1 | idem | GPIO 18 | ✅ / ❓ |
| 12 | Pompa isi air | 1 | Maks 600 dtk per perintah | GPIO 16 | ✅ / ❓ jenis & debit |
| 13 | Pompa sirkulasi meja NFT/DFT | ❓ | Tidak dikendalikan firmware | — | ❓ |
| 14 | Solenoid valve | ❓ | Tidak ada di firmware gabungan | — | ❌ / ❓ |
| 15 | Modul relay | 1 (≥5 kanal) | HIGH-trigger (jumper COM+HIGH) | — | ✅ kode / ❓ jumlah kanal |
| 16 | Dioda flyback | per pompa | Wajib menurut komentar firmware | — | ❓ |
| 17 | Pelampung bawah | 1 | INPUT_PULLUP, HIGH = terangkat | GPIO 32 | ✅ |
| 18 | Pelampung atas | 1 | HIGH = penuh; kabel putus = penuh | GPIO 33 | ✅ |
| 19 | Lampu pilot merah/hijau/biru + ULN2003 | 3 | HIGH = nyala | 13 / 17 / 23 | ✅ |
| 20 | LCD 20x4 I2C (PCF8574) | 1 | | 0x27 | ✅ |
| 21 | Tombol RESET | 1 | Ke GND, INPUT_PULLUP | GPIO 19 | ✅ (v0.6) |
| 22 | Tombol E-STOP jamur | 1 | Memutus bus 12 V; dibaca lewat pembagi 33k/10k | GPIO 36 | ✅ |
| 23 | Catu daya 12 V | 1 | Kapasitas arus tidak tercantum | — | ❓ |
| 24 | Sekring/MCB, box panel tahan air | ❓ | | — | ❓ |

## 2. Server dan Jaringan

| No | Komponen | Spesifikasi | Verifikasi |
|---|---|---|---|
| 1 | Raspberry Pi | Pi 4/5, Raspberry Pi OS Lite 64-bit (panduan lama) | ❓ model & RAM |
| 2 | Kartu SD | — | ❓ kapasitas |
| 3 | Router/modem Wi-Fi 2,4 GHz | SSID dari `rahasia.h` (lihat Juknis IoT Bab 4) | ❓ |
| 4 | Hotspot Pi (cadangan) | SSID `Vertoniksmartfarm`, Pi = 10.42.0.1 | ✅ kode |
| 5 | Kamera CCTV | Panduan `docs/CCTV_EZVIZ_H8C.md` | ❓ |
| 6 | UPS/daya cadangan | — | ❓ |

## 3. Perangkat Lunak

| Komponen | Versi / catatan |
|---|---|
| Firmware ESP32 | `gabungan-0.6` (belum di-commit); pustaka ArduinoJson 7.x, PubSubClient 2.8, OneWire, DallasTemperature, Adafruit SHT31 |
| Backend | Node.js (systemd `vertonik-api`), Express, PostgreSQL |
| Broker | Mosquitto (port 1883, ACL) |
| Web server | nginx |
| AI | Ollama, model dari `Modelfile.garap` |
| Website | React 19 + Vite + TypeScript + Tailwind v3 |
| Mobile | Flutter (Android/iOS) |

## 4. Tandon dan Meja

| Hal | Nilai | Verifikasi |
|---|---|---|
| Kapasitas tandon penampung | 3.000 L (ketetapan terakhir menurut prompt) | ❓ — basis data pengembangan mencatat volume 250 L |
| Jumlah dan jenis meja | NFT dan DFT, beberapa meja | ❓ jumlah pasti |
| Tanaman | Selada, seledri, kangkung, melon (rencana). Data pengembangan memuat Melon, Melon Golden Emerald, Melon Sweet Net, Pakcoy Hijau, Selada Romaine | ❓ |
