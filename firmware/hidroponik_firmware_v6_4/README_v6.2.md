# Firmware Hidroponik v6.2.0 (tambahan dari v6.1)

Tanggal: 20 November 2026
Folder sketch: `HidroponikV6/` (buka `HidroponikV6.ino`, board **ESP32 Dev Module**)
Dasar: v6.1 = firmware tim (`Downloads/hidroponik_firmware_v6 2`) + perbaikan EC negatif + pengaman ppm.
Aturan dasar (SEMAI, dosing, batas harian, LCD, MQTT) tetap seperti `README_v6.md`. Dokumen ini hanya menjelaskan **yang baru**.

> **Status jujur:** v6.2 lulus kompilasi (bagian 7). **Belum diunggah ke papan, belum diuji OTA, dan belum diuji dengan server Pi.**

Folder lama tidak diubah: `hidroponik_firmware_v6` (versi awal, sudah usang) dan `hidroponik_firmware_v6_1`.

---

## 1. Cara upload PERTAMA v6.2 (wajib lewat kabel USB, sekali saja)

Pengaturan Arduino IDE → menu Tools:

| Pengaturan | Nilai |
|---|---|
| Board | ESP32 Dev Module |
| **Partition Scheme** | **Minimal SPIFFS (1.9MB APP with OTA/190KB SPIFFS)** |
| Erase All Flash Before Sketch Upload | **Disabled** |

Alasannya:
- Dengan partisi bawaan, program sudah memakai **92%** ruang. Sisa ruang terlalu sempit untuk update berikutnya.
- Minimal SPIFFS memberi ruang program 1,9 MB (sekitar 63% terpakai).
- Lokasi NVS di Minimal SPIFFS **sama** dengan partisi bawaan (0x9000). Jadi **kalibrasi pH/EC, parameter, dan siklus tetap aman** selama Erase **Disabled**.
- Partisi **tidak bisa diganti lewat OTA**. Karena itu upload pertama ini harus lewat USB. Setelah itu, update berikutnya boleh lewat OTA.

**Keselamatan sebelum upload:**
- Saat kabel USB tersambung, **cabut OUT+ buck dari J7**.
- Matikan pompa / tekan E-STOP.

## 2. OTA lokal (laptop dan alat di WiFi yang sama)

1. Pastikan alat **sedang pemeliharaan**, ATAU **tidak dalam SEMAI dan tidak ada kegiatan**. Selain itu alat menolak OTA.
2. Di Arduino IDE, pilih Tools → Port → port jaringan **`aktuator-01`**. Nama ini muncul lewat mDNS, port 3232.
3. Klik Upload, lalu isi password OTA. Password ada di `rahasia.h`, baris `OTA_PASSWORD` (sudah diisi acak 16 karakter).
4. Selama OTA berjalan:
   - LCD menampilkan **"UPDATE PROGRAM … Proses xx %"**.
   - Semua pompa dimatikan.
   - Lampu kuning berkedip.
   - **Jangan cabut listrik.**
5. Bila OTA gagal (WiFi putus, dll.), program lama tetap jalan. ESP32 menulis program baru ke slot kedua, lalu baru pindah slot jika data sudah lengkap.

Jika `OTA_PASSWORD` dikosongkan atau panjangnya ≤ 8 karakter, OTA lokal **dimatikan total** sebagai pengaman.

## 3. OTA jarak jauh (lewat web, dari mana saja)

Alurnya:
```
Admin upload .bin ke web (Pi)  ->  web menghitung SHA-256 file
Petani/admin klik MULAI PEMELIHARAAN  ->  web kirim perintah OTA {path, sha256}
Alat mengunduh http://<IP Pi>:<port><path> (header X-API-KEY)
  -> menghitung SHA-256 sambil mengunduh -> cocok? pasang & restart : batal, program lama jalan
Setelah restart alat melapor hasil "ota_berhasil_v6.2.0" (versi baru)
```

Pengaman:
- **Wajib mode pemeliharaan** dan tidak ada kegiatan.
- `path` harus diawali `/`, tidak boleh `..`, dan hanya boleh berisi huruf, angka, dan `/_.-`.
- `sha256` harus 64 karakter hex. File yang rusak atau berbeda **ditolak**.
- Hanya mengunduh dari **IP server Pi yang sudah terhubung**, bukan URL bebas.

## 4. Konsol jarak jauh (pengganti Serial Monitor)

**Serial Monitor tidak bisa lewat OTA/WiFi.** Sebagai gantinya, web mengirim perintah `KONSOL {baris}`. Alat menjalankannya seperti diketik di Serial, lalu mengirim teks keluarannya di `hasil.keluaran` (maksimal sekitar 900 karakter).

Contoh baris: `status`, `param`, `sensor`, `help`.

Diblokir dari web (hanya lewat kabel USB) karena bisa memutus koneksi atau menghapus data: `wifi`, `server`, `cari`, `scan`, `kosongkan`, `auto`, `mqtt`.

## 5. Deteksi nutrisi habis (baru)

- Setelah dosing AB dan waktu monitoring selesai, alat membandingkan **kenaikan ppm nyata** dengan **kenaikan yang diharapkan**. Kenaikan yang diharapkan dihitung dari mL × uji_lab ÷ volume.
- Jika kenaikan nyata **kurang dari 30%** dari yang diharapkan, dosing itu dihitung gagal. Setelah **2× gagal berturut-turut**, alat memasang kunci **NUTRISI_HABIS**:
  - Dosing AB berhenti.
  - Lampu merah berkedip.
  - LCD menampilkan "NUTRISI HABIS? RESET".
- Penyebab yang mungkin: botol A/B kosong, selang lepas, atau pompa macet.
- Cara membuka kunci: isi botol, lalu tekan **RESET sebentar** atau kirim perintah web `BUKA_KUNCI`.
- Penilaian dilewati (tidak dihitung gagal) bila:
  - dosing dibatalkan (E-STOP, dll.),
  - ada isi air atau pengenceran,
  - sedang pemeliharaan.

## 6. Perintah Serial baru

| Perintah | Fungsi |
|---|---|
| `kosongkan YA` | Menghapus **semua** data flash: kalibrasi, parameter, status, jaringan. Lalu restart. Hanya lewat USB. |

## 7. Status uji

| Hal | Status |
|---|---|
| Kompilasi, partisi bawaan | Lulus, ±1,21 MB (**92%**), terlalu sempit |
| Kompilasi, Minimal SPIFFS | Lulus, 1.212.318 byte (**61%**), tanpa error |
| Upload ke papan | **Belum** |
| OTA lokal / jauh | **Belum diuji** |
| Konsol web, nutrisi habis | **Belum diuji** (butuh dukungan web) |

## 8. Yang perlu ditambahkan tim web

Detail format pesan ada di `Kontrak_MQTT_Tambahan_v6.2.md`.

1. **Halaman upload firmware** (khusus admin):
   - Menyimpan `.bin` di Pi dan menghitung SHA-256.
   - Melayani file lewat HTTP dengan `Content-Length`, di port yang sama dengan API.
   - Memeriksa header `X-API-KEY`.
2. **Tombol "Update Program"**:
   - Hanya aktif saat pemeliharaan.
   - Mengirim `OTA {path, sha256}`.
3. **Kotak konsol**: kirim `KONSOL {baris}`, lalu tampilkan `hasil.keluaran`.
4. **Status**: tampilkan field data `ota_berjalan`, `ota_persen`, `nutrisi_habis`, dan kunci `NUTRISI_HABIS`.
