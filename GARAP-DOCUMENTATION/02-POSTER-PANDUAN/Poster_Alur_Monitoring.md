# Naskah Poster 3 — Alur Monitoring Hidroponik

| Atribut | Isi |
|---|---|
| Kode | GARAP-PST-03 · Versi 1.0 · 12 November 2026 |
| Ukuran | A3 landscape (420 × 297 mm) — alur dibaca horizontal |
| Contoh HTML | [`html/Poster_Monitoring.html`](html/Poster_Monitoring.html) · PDF: [`pdf/Poster_Monitoring.pdf`](pdf/Poster_Monitoring.pdf) |
| Tempat pasang | Ruang kerja operator |

## 1. Naskah final

**Judul:** Alur **Monitoring** Hidroponik
**Subjudul:** Dari probe di tandon sampai layar HP Anda — dan apa yang harus dilakukan.
**Lencana:** 5 dtk · sensor dikirim setiap 5 detik

**Alur 6 simpul (kiri → kanan, dengan panah):**

1. **Sensor** — pH, EC/TDS, suhu air, suhu & kelembapan udara, pelampung
2. **ESP32** — Membaca & mengirim tiap 5 detik. Tampil juga di LCD
3. **Wi-Fi + MQTT** — Lewat Wi-Fi 2,4 GHz ke broker di Raspberry Pi
4. **Server Pi** — Tolak angka mustahil, simpan, bandingkan ambang
5. **Web & HP** — Dashboard, grafik, peringatan & notifikasi
6. **Operator** (disorot) — Membaca, memeriksa, bertindak sesuai SOP

**Kartu "Baca angka dengan benar"**

| Tanda di layar | Arti |
|---|---|
| Alat tersambung (hijau) | Angka = kondisi sekarang |
| Bacaan terakhir (kuning) | Data > 2 menit. Jangan dipakai mengambil keputusan |
| Perangkat offline (merah) | Alat tidak mengirim. Cek panel |
| `pH --.--` di LCD | Probe lepas / tak terbaca |

**Kartu "Saat ada peringatan"** (urut): 1) Buka Peringatan, baca kode & penjelasan. 2) Pastikan data baru, bukan basi. 3) Ukur ulang dengan alat pembanding. 4) Pembanding juga tidak normal → masalah larutan: lapor admin. 5) Pembanding normal → masalah sensor: bersihkan / kalibrasi. 6) Catat di buku log. Admin Tandai selesai.

**Kartu gelap "Pengaman otomatis":** Server menolak angka mustahil (mis. pH 99). · Detak server hilang > 30 detik → ESP32 mematikan semua pompa. · Air kurang (pelampung bawah) → pompa nutrisi tidak boleh jalan. · AI hanya memberi saran teks, tidak menyalakan pompa.

**Keterangan penting:** Batas aman ikuti layar — diatur admin di Ambang Sensor dan tampil di setiap kartu. Jangan memakai angka hafalan.
**Keterangan kuning:** Pantau minimal 3× sehari — pagi, siang, sore — dan setiap kali notifikasi HP berbunyi (dicek tiap 60 detik).
**Pita K3:** Data tidak masuk lebih dari 5 menit? Ikuti Poster Troubleshooting & ukur manual tiap 4 jam sampai pulih.

## 2. Arahan visual

- Simpul alur: kartu putih dengan lingkaran ikon mint; simpul Operator diberi garis hijau tebal.
- Chip status memakai warna yang sama dengan aplikasi: hijau (mint), kuning, merah.
- Tiga kartu bawah sejajar; kartu pengaman berlatar navy agar menonjol.

## 3. Catatan Canva

Sengaja tidak mencantumkan angka ambang (pH/TDS) karena nilai diatur admin dan dapat berubah. Bila pengelola ingin mencantumkan, ambil dari halaman Ambang Sensor yang sudah diverifikasi.
