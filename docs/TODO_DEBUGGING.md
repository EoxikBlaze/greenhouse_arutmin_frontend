# GARAP — Todo Debugging (software saja, tanpa Pi/sensor/ESP32)

> Dibuat 27 Okt 2026. **S** = dikerjakan Claude · **K** = dikerjakan kamu/tim.
> Tiap butir punya "lulus bila…" supaya jelas kapan selesai. Temuan dicatat di bagian akhir.
> Aturan tetap: tidak ada push/commit tanpa perintah; data uji dibersihkan setelah selesai.

## Gelombang 1 — Logika inti (S, tanpa menunggu siapa pun)

- [x] **S1. Rantai dosing otomatis end-to-end.** ✅ 27 Okt — `rantai-dosing.test.js` (6 skenario, lulus 2× berturut-turut). Sensor simulasi → target penampung → keputusan `otomasi.js` → perintah → MQTT → aktuator simulasi → hasil.
  Lulus bila: TDS di bawah target memicu dosis; di atas target diam; hasil "selesai" tercatat dan volume harian bertambah.
- [x] **S2. Pagar keselamatan di rantai yang sama.** ✅ 27 Okt — 9 skenario + E-STOP dijalankan manual (status global, tidak masuk tes permanen). LOCK penampung, E-STOP, mode pemeliharaan, batas per suntikan, batas harian, bacaan sensor basi/mustahil (>2500 ppm).
  Lulus bila: tiap pagar menghentikan dosis dan alasannya tercatat; buka kunci/reset E-STOP melepaskannya.
- [x] **S3. Kurva naik harian dengan batch nyata.** ✅ 27 Okt — `naik-harian-kurva.test.js` (8 skenario) + cek visual di web. Batch melon uji; geser tanggal ke hari 0, 1, 30, 60, 90.
  Lulus bila: target 400 → 433 → 1400 → 2400 → 2400; tabel Dosing dan target penampung sama; Semai tetap preset; pindah tahap tak membuat target loncat.
- [x] **S4. Sinkron harian & pergantian tahap.** ✅ 27 Okt — `sinkron-harian.test.js` (5 skenario, alur petani nyata via HTTP + restart server, stabil 2×). Server restart, jam lewat tengah malam, tanaman diubah saat batch berjalan, naik harian dimatikan di tengah jalan.
  Lulus bila: target selalu sesuai aturan tanpa baris yatim; mode manual tidak pernah tersentuh.
- [x] **S5. Ketahanan MQTT.** ✅ 27 Okt — `mqtt-ketahanan.test.js` (9 skenario, stabil 5×; mutasi pagar kunci & pemilik perintah tertangkap). Broker mati lalu hidup; backend restart saat ada perintah menunggu; pesan ganda; payload sampah/besar; banjir pesan; API key dicabut saat jalan.
  Lulus bila: tidak ada perintah dobel, tidak ada perintah terlambat, backend tidak crash, pesan dari kunci tercabut diabaikan ≤30 dtk.
- [ ] **S6. Database bersih.** 🟡 sebagian 27 Okt — 15 migrasi dari nol OK, ulang dari nol OK (idempoten), skema identik dengan DB dev. **Sisa:** tes penuh di DB kosong (proses terpotong di tes ke-131, 0 gagal; sedang dijalankan per file) dan backup→restore. Semua migrasi dari nol di DB kosong (idempoten dijalankan 2×), backup lalu restore.
  Lulus bila: skema sama dengan dev, suite tes lulus di DB bersih.

## Gelombang 2 — Keamanan & performa (S)

- [ ] **S7. Audit keamanan rute baru:** `/kalibrasi`, `/dosing/naik-harian`, `/dosing/target`, topik MQTT. Cek per peran (admin, petani, demo, tanpa token), tamper ID, angka ekstrem, SQLi, spoof topik.
- [ ] **S8. Backlog lama:** S4 scope akun demo, S5 eksposur publik `/api/latest-sensor`, S6 pagination, K3 query `/laporan` (lihat `BACKLOG_GARAP.md`; verifikasi dulu apakah masih berlaku).
- [ ] **S9. Beban & performa:** `scripts/loadtest.js`, data besar (±100 rb baris `monitorings`), waktu respons `/laporan`, `/monitoring`, chat AI.
  Lulus bila: tidak ada query >500 ms pada data besar; tak ada kebocoran koneksi.

## Gelombang 3 — Tampilan & kontrak (S)

- [ ] **S10. Regresi klik web semua peran** (admin, petani, demo): Kalibrasi, Dosing, Tanam Saya, Asisten AI, sidebar. Console 0 error.
- [ ] **S11. Aksesibilitas + layar sempit:** Lighthouse dan viewport 375 px untuk Kalibrasi dan Target nutrisi.
- [ ] **S12. Halaman Target nutrisi di simulator iOS:** buka, isi, simpan, validasi, matikan, peringatan ambang.
- [ ] **S13. Kontrak API:** cocokkan `openapi.yaml` dengan rute nyata; tambahkan `/kalibrasi`, `/dosing/naik-harian`, `/dosing/target`.

## Gelombang 4 — Hanya bisa kamu/tim (K)

- [ ] **K1. Pasang aplikasi di HP sungguhan** (Android dan iPhone), terhubung ke server lewat WiFi yang sama. Lulus bila login, Tanam Saya, Target nutrisi, Chat AI jalan.
- [ ] **K2. Uji coba dengan petani:** minta petani mulai tanam, mengisi hasil, dan mengisi target nutrisi tanpa dibantu. Catat ketukan yang berlebih dan kata yang membingungkan.
- [ ] **K3. Validasi nilai agronomi:** preset ppm/pH 4 tanaman, target melon 2400 ppm, ambang kelembapan udara (kini 100–100, kemungkinan salah).
- [ ] **K4. Pastikan faktor ppm:** meter di lapangan faktor 500 atau 700? (2400 ppm faktor 700 ≈ 1700 di sistem ini).
- [ ] **K5. Browser lain:** Safari dan Firefox di perangkat asli.
- [ ] **K6. Notifikasi WhatsApp (Fonnte):** akun/nomor asli, pesan benar-benar terkirim.
- [ ] **K7. Login akun asli & ganti/lupa sandi** (bukan akun dev).
- [ ] **K8. Keputusan:** model chat AI (1,5B vs lebih besar), data proker untuk infografis.

## Rekomendasi urutan

| Tahap | Siapa | Kerjakan | Alasan |
|---|---|---|---|
| 1 | **S** | S1 → S2 → S3 | Logika inti yang paling berisiko; sekarang hanya dites per bagian |
| 2 (paralel dengan 1) | **K** | K3, K4, K8 (keputusan) | Hanya butuh pertimbangan kamu; hasilnya menentukan angka yang dipakai S1–S3 |
| 3 ✅/🟡 | **S** | S4 ✅ → S5 ✅ → S6 🟡 | Ketahanan dan data bersih sebelum dicoba orang lain |
| 4 | **K** | K1, lalu K2 | Pasang aplikasi hanya setelah logika inti stabil, supaya petani tidak mencoba versi yang berubah-ubah |
| 5 (paralel dengan 4) | **S** | S7 → S8 → S9 | Keamanan dan performa tidak menunggu perangkat |
| 6 | **S** | S10 → S12 → S11 → S13 | Rapikan tampilan dan kontrak berdasarkan temuan petani |
| 7 | **K** | K5, K6, K7 | Butuh akun/perangkat asli; bisa kapan saja, tidak menghalangi yang lain |

Setelah tahap 1–6 lulus, barulah masuk uji hardware (Pi → MQTT → ESP32 → kalibrasi → pompa dengan air), lihat `RENCANA_DAN_TODO.md`.

## Catatan temuan

| # | Butir | Temuan | Tingkat | Status |
|---|---|---|---|---|
| F1 | S1 | **Bacaan sensor yang stabil tampak basi.** `saveSensorRows` membuang bacaan identik dengan bacaan terakhir, tetapi kesegaran dinilai dari `created_at`. Sensor yang nilainya sama >120 dtk (pH 2 desimal, TDS bulat — mudah terjadi) membuat otomasi berhenti mendosis ("sensor basi") dan status "Alat terhubung" di dashboard/halaman publik/diagnosa AI menjadi offline, padahal sensor mengirim tiap 5 dtk. | **Tinggi** | ✅ **Diperbaiki** (belum di-commit): bacaan identik menyentuh `updated_at`; otomasi, dashboard, status publik, `latest-sensor`, dan diagnosa AI memakainya. Tes regresi + mutasi |
| F2 | S1/S2 | **Batas wajar TDS 2500 ppm terlalu dekat dengan target melon 2400.** 3 bacaan berturut-turut >2500 (EC 5,0) dianggap "sensor rusak" → penampung di-LOCK + alert. Fluktuasi normal ±5% di target 2400 sudah cukup memicu. Batas ada di `otomasi.js` (`SANITY.tds`) dan validasi 50–2500 di `preset.js`/migrasi naik harian. | Sedang | ⬜ **Butuh keputusanmu** — saran: naikkan ke 3500 ppm (EC 7), tergantung rentang baca sensor TDS yang dipakai (K4) |
| F3 | S1 | **Otomasi hanya mengendalikan satu penampung** (`OTOMASI_PENAMPUNG` berisi satu id), sementara firmware aktuator mendukung 3 katup. Penampung lain tetap menerima target tetapi tidak didosis otomatis. | Sedang | ⬜ Keputusan produk: cukup 1 penampung untuk uji, atau perlu banyak |
| F4 | S1 | **Firmware sensor `ID_MEJA = 0` (bawaan)**: bacaan tersimpan tanpa penampung asal → otomasi **tidak pernah mendosis** (sengaja, demi keamanan). Wajib diisi sebelum otomasi dinyalakan. | Sedang | ⬜ Masuk checklist hardware: isi `ID_MEJA` di `sensor.ino` |
| F5 | S1 | Takaran dosis dihitung tetap 0,71 mL per ppm (214 mL = 300 ppm) **tanpa memperhitungkan volume penampung**. Benar-tidaknya bergantung pada volume tangki dan konsentrat; harus dikalibrasi dengan air + pengukuran. | Sedang | ⬜ Uji hardware (kalibrasi `konfigurasi_dosis`) |
| F6 | S3 | Target diperbarui oleh sinkron tiap 10 menit, jadi kenaikan harian baru terlihat paling lambat 10 menit setelah tengah malam. Zona waktu WITA benar di DB dev dan instalasi SD card; instalasi manual di Linux kosongan harus mengatur zona waktu sendiri (`timedatectl set-timezone Asia/Makassar`). | Rendah | ⬜ Tambah satu baris ke panduan Pi manual |
| F7 | S4/S6 | **CHECK naik harian meloloskan isian setengah** (mis. `hari_capai` NULL tetapi ppm terisi): `NULL BETWEEN …` bernilai NULL, dan CHECK hanya menolak FALSE. API sudah menolak; DB belum. | Rendah | ✅ **Diperbaiki** (belum di-commit): migrasi `2026-10-27_02`, tes S4 |
| F8 | S5 | **Status perangkat bisa membuat error DB**: firmware >32 huruf (kolom varchar(32)), rssi/uptime ekstrem (smallint/integer) → 500 di HTTP `/heartbeat` & `/sensor`; di MQTT status tak terperbarui. | Sedang | ✅ **Diperbaiki** (belum di-commit): `bersihkanStatus` di `device.js` dipakai HTTP & MQTT, tes unit + MQTT |
| F9 | S5 | **Jembatan MQTT menentukan pengirim dari nama TOPIK**, bukan login MQTT. Tanpa ACL broker, sensor yang menulis ke `garap/aktuator-01/hasil` dianggap aktuator. Dengan Mosquitto asli ACL sudah terbukti menolaknya. | Sedang | ⬜ **Wajib**: pasang `garap.acl` di Pi (sudah di `pasang-mqtt.sh`); jadikan butir uji pertama di Pi |
| — | S4–S5 | Diverifikasi benar: target mengikuti alur petani (600→400→1400→kosong setelah panen), bertahan saat server restart, jatah & kejadian reset saat ganti hari, sinkron serentak aman; broker mati-hidup, backend restart, hasil ganda (jatah kembali sekali), payload sampah, banjir 1000 pesan ±1 dtk, kunci dicabut, aktuator putus tanpa LWT. Bacaan di luar rentang (pH 99) **sengaja** tetap disimpan agar aturan "3× mustahil → LOCK" bekerja. | — | ✅ |
| — | S1–S3 | Yang sudah diverifikasi benar: kurva 400→433→1400→2400 (hari 0/1/30/60), ditahan setelah tercapai, Semai tetap preset, pindah tahap tidak membuat target loncat, mode manual tak tersentuh, mixing 15 mnt, aktuator offline/diam/gagal, LOCK, E-STOP, jatah harian, retry habis, 8 kejadian/hari, sensor basi/mustahil/meja lain, laporan palsu. 4 pagar dimutasi (mixing, LOCK, batas harian, sanity sensor) dan semuanya ditangkap tes. | — | ✅ |
