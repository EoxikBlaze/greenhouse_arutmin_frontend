# Firmware Hidroponik v6.3.0 (perubahan dari v6.2)

Tanggal: 20 November 2026
Semua fitur v6.2 tetap ada (lihat `README_v6.2.md`). Perubahan di versi ini:

> **Status jujur:** lulus kompilasi. **Belum diunggah dan belum diuji di alat.**

## 1. Float bawah dipaksa "naik" (sementara, karena float rusak)
- Diatur di `Config.h`: `PAKSA_FLOAT_BAWAH_NAIK = true`.
- Saat alat menyala, Serial menampilkan peringatan `[!] FLOAT BAWAH DIPAKSA NAIK`.
- Akibat:
  - Level air hanya **SEDANG** atau **PENUH**, tidak pernah RENDAH.
  - **Isi air otomatis saat air turun TIDAK jalan.** Air harus dicek dan diisi manual.
  - Float atas tetap dibaca normal. Pengenceran dan pengaman "penuh" tetap bekerja.
- Setelah float bawah diganti, ubah ke `false`, lalu upload ulang.

## 2. EC air tawar tidak lagi terbaca 0
- **Masalah:** kalibrasi memakai larutan 1413 µS dan 12,88 mS. Di bawah 1413 µS, garis kalibrasi menurun ke angka negatif, sehingga air tawar ±100 ppm terbaca 0.
- **Perbaikan:** di bawah titik 1, alat memakai garis dari **titik 0** ke titik 1.
  - Titik 0 bawaan: 0 V = 0 mS.
  - Di atas 1413 µS (rentang nutrisi 800–1200 ppm), hitungan **tidak berubah**.
- **Agar lebih akurat**, ada titik 0 opsional. Syaratnya titik 1 dan 2 sudah ada, dan alat dalam mode pemeliharaan.
  - **Dengan air tawar:** celup probe ke air tawar, ukur dengan alat genggam, lalu ketik `kal ec 0 <mS>`. Contoh: alat genggam menunjukkan 100 ppm, ketik `kal ec 0 0.2`.
  - **Atau probe di udara (kering):** ketik `kal ec 0`.
- Titik 0 otomatis terhapus bila titik 1 dikalibrasi ulang. Setelah itu ulangi `kal ec 0`.
- Lewat web: `KAL_SENSOR {sensor:"ec", titik:0, aksi:"UKUR"/"SIMPAN", acuan?}`.

## 3. Pencarian server lebih aman
- Perangkat yang hanya membuka port 80 (laptop, printer, router) **tidak lagi dianggap Pi**. Dulu API key bisa terkirim ke perangkat asing.
- Yang dicari: perangkat yang membuka port MQTT 1883.
- `SERVER_IP` hanya dipakai bila satu jaringan dengan alat.
- `SERVER_IP` di `rahasia.h` diperbarui ke `<IP Raspberry Pi>`. Kunci IP ini di router (DHCP reservation).

## 4. Pesan OTA
- Saat WiFi putus, pesannya sekarang `[OTA] lokal ditutup (WiFi putus)`, bukan "alat sedang SEMAI".
