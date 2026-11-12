# Naskah Poster 4 — Alur Konfirmasi & Persetujuan Dosing

| Atribut | Isi |
|---|---|
| Kode | GARAP-PST-04 · Versi 1.0 · 12 November 2026 |
| Ukuran | A3 landscape (420 × 297 mm) |
| Contoh HTML | [`html/Poster_Dosing.html`](html/Poster_Dosing.html) · PDF: [`pdf/Poster_Dosing.pdf`](pdf/Poster_Dosing.pdf) |
| Tempat pasang | Ruang kerja admin & operator |
| Sumber fakta | `backend-nodejs/src/siklusBudidaya.js`, `dosingSiklus.js`, `gerbangDosis.js`; SOP-01 SOP 6 |

> ⛔ Poster ini **wajib** menampilkan status **BELUM DIIZINKAN** di kepala dan footer. Jangan menghapus label itu saat menyunting di Canva.

## 1. Naskah final

**Judul:** Alur Konfirmasi & **Persetujuan Dosing**
**Subjudul:** Rancangan di server — belum ada tombolnya di aplikasi, dan pompa dosing **tidak boleh dijalankan**.
**Lencana merah:** ikon gembok · BELUM DIIZINKAN

**Kartu "Persetujuan ≠ Eksekusi"**

| | Persetujuan | Eksekusi |
|---|---|---|
| Arti | Operator mengizinkan cakupan dosis | Pompa menyuntik larutan |
| Status | API saja, belum ada tombol | Diblokir server |

Catatan: Gerbang `EKSEKUSI_DIIZINKAN = false`. Server menjawab **423** untuk setiap permintaan dosis.

**Alur konfirmasi bibit (siklus baru):** Semai (preset/target awal & jumlah benih dicatat) → Data nutrisi (sensor mencatat tiap 5 detik) → **H+4** (96 jam: sistem minta konfirmasi + notifikasi) → **Jawab ≤ 24 jam** (Bibit SIAP / BELUM SIAP).

- **SIAP:** Isi berhasil + gagal = jumlah semai, pilih meja tujuan → tahap pertumbuhan. Berhasil 0 → siklus selesai (gagal semai).
- **BELUM SIAP / tidak dijawab:** Kembali ke semai. Bibit **tidak pernah** dianggap siap tanpa jawaban. Muncul notifikasi "Konfirmasi terlewat".

**Alur persetujuan dosing (rancangan):** Diajukan → Disetujui (atau ditolak / kedaluwarsa / dicabut) → **Jalankan: DIBLOKIR** → Campur & verifikasi (tidak terjadi selama diblokir) → Selesai (4× gagal / kelebihan → kunci penampung). Tiga simpul terakhir bergaris putus merah.

**Kartu "Yang dilakukan operator sekarang":** Catat tahap di Kebun Saya: isi jumlah berhasil. · Beri nutrisi & koreksi pH manual (SOP-01 SOP 5), ukur dengan alat pembanding. · Catat di log nutrisi manual.

**Kartu "Angka naik/turun tidak wajar":** Angka mustahil → ditolak server. · 3× mustahil berturut → sensor dianggap rusak, penampung dikunci. · Ukur ulang dengan alat pembanding, lapor admin.

**Kotak "Dilarang" (merah):** Mencoba menjalankan pompa dosing dari web, HP, atau Serial. · Mengubah pengaturan keamanan tanpa keputusan pemilik.

**Pita K3:** Dosing otomatis baru boleh setelah kalibrasi, uji pengaman, uji 24 jam, validasi parameter & keputusan tertulis pemilik.

## 2. Arahan visual

- Simpul yang diblokir: latar merah muda #FBE7E4, garis putus merah #C0392B, ikon gembok/silang.
- Simpul H+4 dan 24 jam diberi garis hijau tebal sebagai titik keputusan operator.
- Hindari warna hijau "berhasil" pada simpul eksekusi agar tidak memberi kesan fitur siap.

## 3. Catatan

- Angka 96 jam dan 24 jam berasal dari parameter `konfirmasi_peremajaan_jam_ke` dan `konfirmasi_peremajaan_batas_jam` di migrasi basis data. Nilai di server produksi [PERLU VERIFIKASI].
- Setelah pemilik mengizinkan dosing dan antarmuka selesai, poster ini **harus diterbitkan ulang**, bukan sekadar menghapus label.
