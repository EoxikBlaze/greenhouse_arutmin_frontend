# Naskah Poster 2 — Mengoperasikan Perangkat IoT GARAP

| Atribut | Isi |
|---|---|
| Kode | GARAP-PST-02 · Versi 1.0 · 12 November 2026 |
| Ukuran | A3 portrait (297 × 420 mm) |
| Contoh HTML | [`html/Poster_IoT.html`](html/Poster_IoT.html) · PDF: [`pdf/Poster_IoT.pdf`](pdf/Poster_IoT.pdf) |
| Tempat pasang | Dinding di samping panel kontrol (bukan di dalam panel) |
| Sumber fakta | Juknis IoT GARAP-JUKNIS-02; firmware `gabungan-0.6` |

## 1. Naskah final

**Judul:** Mengoperasikan **Perangkat IoT**
**Subjudul:** Menyalakan, membaca, dan mematikan panel kontrol dengan aman.
**Lencana:** ikon chip · aktuator-01 · gabungan-0.6

**Langkah bernomor**

| No | Ikon | Judul | Teks |
|---|---|---|---|
| 1 | Tangan | Periksa sekitar panel | Lantai & tangan **kering**. Tidak ada kabel terkelupas. Tombol **E-STOP** tidak tertekan. |
| 2 | Server | Nyalakan Raspberry Pi dulu | Tunggu **± 2 menit** sampai server siap. |
| 3 | Daya | Nyalakan panel | Saat menyala, semua pompa **mati** lebih dulu. Itu normal. |
| 4 | Mata | Baca LCD baris 4 | `WIFI MATI` → `TUNGGU SERVER...` → **`PENAMPUNG CUKUP`** = siap. |

**Ilustrasi panel (di samping langkah):** LCD hijau 4 baris (contoh: `EC 1.20mS 600ppm`, `pH 6.10 Air 26.5C`, `Ruang 30C RH 75%`, `PENAMPUNG CUKUP`), tiga lampu merah-hijau-biru, tombol E-STOP jamur merah berlatar kuning. Keterangan: "Contoh tampilan. Angka nyata mengikuti alat."

**Arti lampu**

| Lampu | Arti |
|---|---|
| Hijau | Normal |
| Merah + hijau | Peringatan: server belum tersambung / air kurang |
| Merah | E-STOP aktif |
| Biru | Pompa bekerja |

**Tombol RESET:** Tekan sekali → LCD 4 detik: `WIFI:<nama Wi-Fi>` · `ESP :<IP ESP32>` · `SRV :<IP server>` · `MODE: MQTT AKTIF`. Bukan `MQTT AKTIF`? Lapor teknisi.

**Mematikan:** 1) Lampu biru padam. 2) Matikan daya panel. 3) Pi dimatikan teknisi (`shutdown`). Jangan cabut langsung. 4) Catat di log.

**Peringatan keselamatan (merah):** Panel hanya dibuka teknisi, daya mati. · Jangan semprot air ke panel/Pi. · Operator tidak menjalankan pompa nutrisi/pH — dosing **BELUM DIIZINKAN**. · Pompa jalan sendiri? **Tekan E-STOP.**

**Pita K3:** Listrik + air = bahaya. Tangan kering. Kenali letak E-STOP sebelum bekerja.

**Footer:** GARAP – Smart Hidroponik · GARAP-PST-02 · Versi 1.0 · Status dosing: BELUM DIIZINKAN

## 2. Arahan visual

- Ilustrasi panel digambar vektor sederhana (bukan foto komponen yang tidak sesuai). Warna panel hijau gelap #2B3A33, LCD hijau #9DBB58 dengan font monospace.
- Warna lampu: merah #C0392B, hijau #2E9E41, biru #2F6FB0.
- Baris bawah 3 kartu sejajar: Arti lampu · Tombol RESET · Mematikan. Kotak bahaya selebar poster.

## 3. Catatan Canva

- Bila ada foto panel asli, boleh mengganti ilustrasi. Pastikan foto sesuai perangkat terpasang [PERLU VERIFIKASI].
- Teks LCD harus sama persis dengan firmware (huruf besar, tanda titik tiga pada `TUNGGU SERVER...`).
