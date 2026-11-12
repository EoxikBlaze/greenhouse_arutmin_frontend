# Infografis 09 — Troubleshooting GARAP

| Item | Isi |
|---|---|
| **Judul** | Troubleshooting GARAP |
| **Subjudul** | Gejala → kemungkinan penyebab → langkah pemeriksaan → tindakan. Operator dan teknisi punya bagian masing-masing. |
| **Tujuan komunikasi** | Gangguan umum dapat dikenali dan ditangani cepat tanpa operator melampaui kewenangannya. |
| **Target pembaca** | Operator, Teknisi |
| **Ukuran desain** | Poster panjang lebar **1200 px**, tinggi mengikuti isi (±2.100–3.050 px). Cetak: **A3 potret, 2 halaman** (lebar kanvas = lebar A3). Alternatif media sosial: carousel 1080 × 1350 px, satu seksi per slide. |
| **Preview HTML** | `03-HTML-PREVIEW/infographic-09.html` |

## 1. Struktur layout

Header → legenda peran (2 lencana) → tabel 4 kolom, 7 baris gejala → kartu "kapan berhenti dan memanggil teknisi" → footer. Di Canva, tabel dapat dipecah menjadi 7 kartu gejala.

## 2. Urutan informasi

1. kartu
2. Tujuh gangguan yang paling mungkin
3. Berhenti dan panggil teknisi bila

## 3. Konten final (siap salin ke Canva)

**Header (navy):** eyebrow `INFOGRAFIS 09 · GARAP · Vertonik Smart Farm`
**Judul:** Troubleshooting GARAP
**Subjudul:** Gejala → kemungkinan penyebab → langkah pemeriksaan → tindakan. Operator dan teknisi punya bagian masing-masing.
**Label pembaca:** Operator · Teknisi

- **Tindakan operator** _(Operator)_ — Pemeriksaan visual, website, tombol RESET singkat, E-STOP, dan melapor.  
  _ikon: user-round.svg_
- **Tindakan teknisi** _(Teknisi)_ — Membuka panel, kabel/sekring, Serial Monitor ESP32, perintah di Raspberry Pi, kalibrasi.  
  _ikon: wrench.svg_

### 2. [Matriks gangguan] Tujuh gangguan yang paling mungkin

| Gejala | Kemungkinan penyebab | Langkah pemeriksaan | Tindakan |
|---|---|---|---|
| Sensor tidak terbaca | Probe lepas/kotor, kabel sensor putus. | LCD tampil `pH --.--` / `EC ----`; nilai di Dashboard kosong. | **Operator:** Catat waktu, lapor teknisi.<br>**Teknisi:** Periksa probe & kabel; cek `status` di Serial Monitor (115200). |
| Data tidak masuk website | HP beda jaringan, IP Pi berubah, layanan web/API berhenti. | Pastikan Wi-Fi sama dengan Pi. Tekan **RESET** singkat → baca IP server di LCD 4 detik. | **Operator:** Buka `http://vertonik.local` atau IP dari LCD.<br>**Teknisi:** Periksa layanan `nginx` & `vertonik-api` di Pi. |
| MQTT terputus | Port 1883 diblokir router, *client isolation* aktif. | LCD `HTTP SENSOR ONLY` atau `TUNGGU SERVER...`; lampu merah + hijau. | **Operator:** Pompa terkunci aman. Lapor.<br>**Teknisi:** Matikan AP/client isolation; cek `sudo ufw status` / `siapkan-modem.sh`. |
| ESP32 tidak terkoneksi | Wi-Fi 5 GHz / sandi berubah / sinyal lemah. | LCD `WIFI MATI`. Dashboard: alat terputus. | **Operator:** Pastikan router menyala; lapor.<br>**Teknisi:** Serial: `scan`, lalu `wifi NAMA|SANDI`; `cari` untuk IP Pi. |
| Pompa tidak merespons | E-STOP aktif, detak server hilang > 30 dtk, laju `belum_dikalibrasi`, mode pemeliharaan. | Lihat lampu merah saja / LCD `E-STOP AKTIF!`. Cek Peringatan. *Eksekusi dosing memang diblokir.* | **Operator:** Jangan memaksa. Lapor penyebab yang terlihat.<br>**Teknisi:** Cari sebab E-STOP; kalibrasi laju pompa di halaman Kalibrasi. |
| Pembacaan tidak normal | Probe perlu kalibrasi, probe di luar air, gelembung udara. | Bandingkan dengan alat ukur manual; nilai di luar rentang wajar (pH 3–9, TDS 50–2.500 ppm, suhu air 5–45 °C). | **Operator:** Periksa fisik tandon; jangan menambah nutrisi/pH manual.<br>**Teknisi:** Kalibrasi 2 titik EC & pH. |
| Gangguan daya | Listrik padam, adaptor rusak, korsleting. | Panel/LCD mati, Dashboard data usang. Ada bau hangus atau percikan? | **Operator:** Bau/percikan: tekan E-STOP, menjauh, panggil teknisi.<br>**Teknisi:** Matikan sumber daya, periksa sekring & catu 12 V. |

> **⛔ Berhenti dan panggil teknisi bila**
> - Ada air di dekat panel atau kabel.
> - Tercium bau hangus, terlihat asap/percikan.
> - Lampu merah saja tidak padam setelah penyebab dibereskan.
> - Gangguan berulang setelah RESET.

**Footer (navy):** Sumber data · Modul Juknas Bab V.2 (pesan LCD), Bab VII.2 (perintah Serial), Bab VIII (matriks gangguan); `gabungan.ino` (fail-safe 30 dtk, `belum_dikalibrasi`); `sanitySensor.js`. — Versi 1.0 · 12 Nov 2026

## 4. Arahan ilustrasi

Tanpa ilustrasi besar. Header tabel navy, baris berselang. Label peran di dalam sel tindakan: hijau "OPERATOR", merah gelap "TEKNISI".

## 5. Warna yang digunakan

- Header & footer: navy `#0A1F38` → `#071527`; eyebrow emas `#E9CD53`.
- Latar isi: `#F4F7F2`; kartu putih `#FFFFFF`, border `#E2E8DD`, radius 20 px.
- Lingkar ikon: mint `#CFE2CE` + ikon forest `#2D452F`; nomor langkah forest `#2D452F`.
- Teks: tinta `#0B1A2B`, sekunder abu `#4F6075`.
- Status: sukses moss `#6B9D4A`, peringatan amber `#E0A42B`, bahaya merah `#C0392B`.

## 6. Tipografi

- Judul: Space Grotesk Bold 56 px (cetak A3 ±40 pt), putih.
- Subjudul: Inter Regular 22 px, putih 78%.
- Judul seksi: Space Grotesk Bold 28 px; eyebrow Inter Bold 13 px kapital, spasi huruf 14%.
- Judul kartu: Space Grotesk/Inter SemiBold 19 px; isi Inter 15–16 px abu `#4F6075`.
- Kode/topik: monospace 14 px dalam kotak `#F4F7F2`.

## 7. Catatan desain

- Urutan kolom wajib: GEJALA → KEMUNGKINAN PENYEBAB → LANGKAH PEMERIKSAAN → TINDAKAN.
- Tindakan teknisi yang melibatkan Serial Monitor atau perintah Pi tidak boleh dilakukan operator.
- Ikuti `01-DESIGN-SYSTEM/GARAP_Design_Reference.md`; ikon SVG ada di `04-ASSETS/icons/`.

## 8. Peringatan keselamatan

- Operator **tidak** membuka panel, mencabut kabel di dalam panel, atau mengganti sekring.
- Gangguan daya / bau hangus / percikan: tekan E-STOP, menjauh, panggil teknisi.
