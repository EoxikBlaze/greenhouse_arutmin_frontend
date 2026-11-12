# Naskah Poster 6 — Troubleshooting Sederhana

| Atribut | Isi |
|---|---|
| Kode | GARAP-PST-06 · Versi 1.0 · 12 November 2026 |
| Ukuran | A4 portrait (210 × 297 mm) |
| Contoh HTML | [`html/Poster_Troubleshooting.html`](html/Poster_Troubleshooting.html) · PDF: [`pdf/Poster_Troubleshooting.pdf`](pdf/Poster_Troubleshooting.pdf) |
| Tempat pasang | Dinding dekat panel (dalam bingkai plastik tahan lembap) |
| Sumber | SOP-02 SOP 5–8; Juknis IoT Bab 11 dan 14 |

## 1. Naskah final

**Judul:** Troubleshooting **Sederhana**
**Subjudul:** Lihat gejala → lakukan tindakan → masih gagal? Panggil teknisi.
**Lencana:** ikon kunci pas · cepat

**Tabel gejala → tindakan** (dua baris pertama berlatar merah = darurat):

| Gejala | Tindakan |
|---|---|
| Pompa jalan sendiri / tidak berhenti | **Tekan E-STOP sekarang.** Matikan daya panel. Lapor teknisi. |
| Asap, percikan, bau terbakar | **E-STOP**, jauhi panel, matikan daya utama dari tempat kering. Jangan siram air. |
| Lampu merah saja | LCD `E-STOP AKTIF!` = E-STOP tertekan. Cari penyebab dulu. Lepas tombol hanya setelah aman; admin reset di server bila perlu. |
| Dashboard: alat terputus | Lihat LCD. Tekan **RESET**, catat layar info. *(Pompa otomatis mati bila server hilang > 30 dtk — itu normal.)* |
| `WIFI MATI` | Cek router/modem menyala. Tunggu 3 menit. *(Wi-Fi harus 2,4 GHz.)* |
| `TUNGGU SERVER...` | Cek Raspberry Pi menyala. Masih lama → teknisi. |
| `HTTP SENSOR ONLY` | Port MQTT diblokir. Data sensor masuk, pompa terkunci. Lapor teknisi. |
| `PENAMPUNG KURANG` | Tambah air ke tandon sesuai SOP. Cek kebocoran. |
| `pH --.--` / `EC ----` | Probe lepas/tak terbaca. Cek probe terendam & konektor. |
| Angka beda dari alat pembanding | Bersihkan probe. Masih beda → kalibrasi oleh teknisi. |
| Listrik padam | Jangan sentuh panel basah. Saat pulih: **Pi dulu**, tunggu 2 menit, baru panel. |

**Kotak kuning:** Panggil teknisi bila belum pulih dalam 5 menit, gejala berulang, atau perlu membuka panel. **Selalu catat** jam, gejala, dan tindakan di log gangguan.

**Pita K3:** Panel hanya dibuka teknisi dengan daya mati. Tangan kering.

## 2. Arahan visual

- Kolom gejala navy dengan ikon emas; dua baris darurat merah #C0392B.
- Teks LCD memakai font monospace dan huruf besar persis seperti di layar alat.
