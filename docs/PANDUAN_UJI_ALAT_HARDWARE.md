# Panduan Uji Alat Hardware GARAP

Untuk papan satu ESP32 (`deploy-pi/firmware/gabungan/gabungan.ino`, firmware `gabungan-0.4`).
Kerjakan berurutan. Jangan lanjut ke tahap berikut bila tahap sekarang gagal.

## Keadaan jalur kalibrasi (12 November 2026)

| Hal | Sampai ke ESP32? |
|---|---|
| Uji pompa dari web (`UJI_POMPA`) | Ya, bila `UJI_POMPA_DIIZINKAN=1` di `.env` backend dan mode pemeliharaan aktif. Bawaan: dikunci |
| Laju pompa (`KALIBRASI` laju A/B/pH Up/pH Down) | Ya, dikirim saat "Simpan laju" |
| Kalibrasi pH dan EC dua titik | **Belum.** Tercatat di server saja; ESP32 memakai nilai lamanya |
| Laju pompa isi air | Belum ada di halaman web |

Jalur ini lolos tes otomatis di server, tetapi belum pernah dicoba dengan alat sungguhan. Tahap 5 adalah uji pertamanya.
Halaman Kalibrasi menampilkan laporan alat ("alat melapor selesai" atau "GAGAL" beserta alasannya); jangan percaya
pompa jalan sebelum laporan itu muncul.

## Aturan keselamatan

- Semua uji pompa memakai **air bersih**, bukan nutrisi atau larutan pH.
- Selang keluaran pompa masuk ke **gelas ukur atau ember terpisah**, bukan ke tandon tanaman.
- Satu orang berdiri di dekat tombol E-STOP selama pompa diuji.
- Gerbang dosis server (`EKSEKUSI_DIIZINKAN`) tetap `false`. Panduan ini tidak membukanya.
- Pompa 12 V lewat relay + dioda flyback. Jangan ambil daya pompa dari pin ESP32.

## Peta pin (untuk cek kabel)

| Alat | Pin |
|---|---|
| I2C SDA / SCL (ADS1115 0x48, SHT31 0x44, LCD 0x27) | 21 / 22 |
| DS18B20 suhu air | 4 |
| Pompa A, B, pH Up, pH Down, isi air | 25, 26, 27, 18, 16 |
| Pelampung bawah / atas | 32 / 33 |
| Lampu merah / hijau / biru | 13 / 17 / 23 |
| Tombol RESET | 19 (belum dipakai firmware) |
| Baca E-STOP (bus 12 V lewat pembagi 33k/10k) | 36 |

## Tahap 0 — Tanpa daya

1. Cocokkan tiap kabel dengan peta pin di atas.
2. Ukur dengan multimeter: tidak ada hubung singkat antara 12 V dan GND, dan antara 3,3 V dan GND.
3. Pastikan pembagi tegangan 33k/10k terpasang di pin 36. Tanpa pembagi, pin terbaca "E-STOP ditekan" dan semua pompa terkunci.
4. Pastikan `AKTIFKAN_BACA_ESTOP` tidak di-set `0` di `rahasia.h`. Nilai `0` hanya untuk meja uji tanpa pompa.
5. Lepas sekring atau konektor daya 12 V pompa. Pompa baru diberi daya di Tahap 5.

## Tahap 1 — Nyala pertama (USB, pompa belum berdaya)

1. Sambungkan ESP32 ke laptop, buka Serial Monitor 115200.
2. Cari baris: `ADS1115 ada, SHT31 ada, LCD ada`.
   - `TIDAK TERBACA` pada salah satu: periksa kabel SDA/SCL dan alamat I2C alat itu.
3. LCD menampilkan `GARAP SYSTEM` lalu empat baris data.
4. Lulus bila ketiga alat I2C terbaca dan papan tidak restart berulang.

## Tahap 2 — Jaringan dan server

1. Nyalakan Pi. Tunggu LCD baris 4 berubah dari `WIFI MATI` atau `TUNGGU SERVER...` ke `PENAMPUNG CUKUP` / `PENAMPUNG KURANG`.
2. Di web, halaman Perangkat: `aktuator-01` online, versi firmware `gabungan-0.4`.
3. Lampu: hijau saja = normal. Merah + hijau bersamaan = peringatan (server belum tersambung atau air kurang).
4. Lulus bila status online bertahan 5 menit tanpa putus.

## Tahap 3 — Sensor

Bandingkan angka LCD, angka di web (halaman Sensor), dan alat ukur pembanding.

| Uji | Cara | Lulus bila |
|---|---|---|
| Suhu air | Celup DS18B20 dan termometer ke gelas yang sama | Selisih ≤ 0,5 °C |
| Suhu / RH ruang | Bandingkan dengan higrometer | Selisih ≤ 2 °C, ≤ 5 % RH |
| pH | Larutan buffer 7,0 lalu 4,0 | Sebelum kalibrasi: catat saja. Sesudah: selisih ≤ 0,1 |
| EC / TDS | Larutan standar 1.413 µS/cm | Sesudah kalibrasi: selisih ≤ 5 % |
| Probe lepas | Cabut probe pH, lalu probe EC | LCD menampilkan `pH --.--` / `EC ----`; web tidak menampilkan angka baru untuk sensor itu |
| Sensor terputus | Cabut daya ESP32 2 menit | Web menandai bacaan basi; asisten AI menyuruh periksa alat, bukan memberi saran larutan |

Kalibrasi pH dan EC dikerjakan dari web, halaman Kalibrasi (panel kalibrasi langsung). Hasilnya tersimpan di ESP32, tidak perlu flash ulang.

## Tahap 4 — Masukan pengaman (pompa masih tanpa daya)

| Uji | Cara | Lulus bila |
|---|---|---|
| Pelampung bawah | Turunkan pelampung dengan tangan | LCD `PENAMPUNG KURANG`, lampu merah + hijau |
| Pelampung atas | Angkat pelampung | LCD `PENAMPUNG PENUH` |
| Kabel pelampung atas putus | Cabut kabelnya | Terbaca penuh (isi air tidak akan jalan) |
| E-STOP | Tekan tombol jamur | LCD `E-STOP AKTIF!`, lampu merah saja, web menampilkan e-stop |
| Lepas E-STOP | Putar tombol | Kembali normal dalam beberapa detik |

Catatan: tombol RESET (pin 19) belum dibaca firmware. Menekannya tidak berpengaruh. Rancangan mewajibkan RESET setelah E-STOP; firmware sekarang pulih sendiri saat E-STOP diputar.

## Tahap 5 — Pompa, satu per satu, dengan air

Pasang daya 12 V pompa. Selang keluaran ke gelas ukur.

1. Dari web (halaman Kalibrasi, bagian kalibrasi pompa), jalankan uji pompa A selama 5 detik.
2. Periksa: hanya pompa A yang berputar, lampu biru menyala selama pompa jalan, LCD `DOSING A...`, pompa berhenti sendiri.
3. Ulangi untuk B, pH Up, pH Down, isi air.
4. Lulus bila tiap perintah menggerakkan pompa yang benar dan tidak ada pompa lain yang ikut jalan.

Bila pompa yang salah berputar: kabel relay tertukar. Perbaiki kabel, jangan ubah kode.

## Tahap 6 — Kalibrasi laju pompa

Untuk tiap pompa:

1. Isi selang sampai penuh (jalankan sebentar, buang airnya).
2. Jalankan pompa 30 detik ke gelas ukur.
3. Catat mL. Laju = mL ÷ 30.
4. Ulangi 3 kali. Lulus bila ketiga hasil berselisih ≤ 5 %.
5. Simpan laju rata-rata lewat halaman Kalibrasi.

Sebelum laju disimpan, firmware menolak setiap dosis berbasis mL dengan alasan `belum_dikalibrasi`. Itu disengaja.

## Tahap 7 — Uji pengaman saat pompa jalan

Ini tahap terpenting. Semua dengan air.

| Uji | Cara | Lulus bila |
|---|---|---|
| E-STOP saat jalan | Jalankan pompa 60 detik, tekan E-STOP di detik ke-5 | Pompa berhenti seketika |
| Server hilang | Jalankan pompa 60 detik, matikan layanan API di Pi | Pompa berhenti paling lama 30 detik kemudian |
| WiFi putus | Jalankan pompa 60 detik, matikan WiFi/hotspot | Pompa berhenti paling lama 30 detik kemudian |
| Air kurang | Jalankan pompa nutrisi, turunkan pelampung bawah | Pompa berhenti, hasil `air_kurang_float_bawah` |
| Tandon penuh | Jalankan isi air, angkat pelampung atas | Pompa isi berhenti, hasil `tandon_penuh` |
| Batas durasi | Minta uji pompa lebih dari 120 detik | Ditolak `parameter_uji_pompa` |
| Daya ESP32 putus | Cabut daya ESP32 saat pompa jalan | Pompa berhenti (relay lepas). Bila pompa tetap jalan: **berhenti, jangan pakai alat**, perbaiki wiring relay |
| Restart ESP32 | Tekan tombol EN saat diam | Tidak ada pompa yang berkedut saat boot |

Bila salah satu baris gagal, alat belum boleh dipasang ke tandon tanaman.

## Tahap 8 — Uji tahan 24 jam (tanpa dosis)

1. Biarkan alat menyala 24 jam dengan sensor terendam air.
2. Sesudahnya periksa di web: tidak ada celah bacaan lebih dari 2 menit, `uptime` perangkat tidak kembali ke nol (tidak restart), suhu Pi di bawah 70 °C.
3. Catat berapa kali perangkat sempat offline.

## Yang tidak diuji di panduan ini

- Dosis otomatis ke tandon tanaman. Gerbang server masih tertutup.
- Tombol RESET dan RTC: belum dipakai firmware.
- Versi dua ESP32 (`sensor.ino` + `aktuator.ino`): tidak punya LCD dan lampu; Tahap 1 dan sebagian Tahap 4 tidak berlaku.

## Lembar hasil

| Tahap | Tanggal | Lulus / Gagal | Catatan |
|---|---|---|---|
| 0 Kabel | | | |
| 1 Nyala pertama | | | |
| 2 Jaringan | | | |
| 3 Sensor | | | |
| 4 Masukan pengaman | | | |
| 5 Pompa | | | |
| 6 Kalibrasi laju | | | |
| 7 Pengaman saat jalan | | | |
| 8 Tahan 24 jam | | | |
