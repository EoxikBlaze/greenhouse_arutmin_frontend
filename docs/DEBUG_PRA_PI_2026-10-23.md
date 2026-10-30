# Debug Menyeluruh Sebelum Pasang di Raspberry Pi — 23 Okt 2026

Tujuan: memastikan paket yang dipasang `deploy-pi/siapkan-sd.sh` → `pasang-server.sh` benar-benar jalan di Pi,
dengan menjalankan langkah yang sama di Mac (bukan sekadar membaca kode).

## Yang dijalankan

| Lapisan | Cara | Hasil |
|---|---|---|
| Backend | `npm test` | 189 tes · 188 lulus · 0 gagal · 1 dilewati |
| Web | `tsc -b`, `oxlint`, `npm run build` | bersih · build sukses |
| Mobile | `flutter analyze`, `flutter test` | bersih · 18/18 lulus |
| Instalasi DB baru | role **non-superuser** + DB kosong → impor `vertonik.sql` (`ON_ERROR_STOP=1`) → `migrate.js` (2×) → `atur-kata-sandi.js --semua-acak` → `buat-kunci.js` sensor-01 & aktuator-01 | semua lulus; 8 migrasi, ulang = "sudah terbaru" |
| Backend mode produksi | `NODE_ENV=production`, env persis `rahasia.env` Pi | jalan |
| Uji asap API | login 3 akun, 33 GET × 4 peran, perangkat ESP32, pagar aktuator, E-STOP, AI, header keamanan | **0 gagal**, tidak ada 5xx |
| nginx | konfigurasi Pi **apa adanya** (hanya port/sertifikat/root diganti) di nginx 1.31 | lihat bug N1–N3 |
| Browser lewat nginx HTTPS | login lewat form, buka penuh (reload) 31 halaman × 3 peran | **31/31 OK**, 0 galat konsol, 0 respon 4xx/5xx, 0 terkena rate-limit (459 respon) |
| Skrip deploy | `shellcheck`, `bash -n` | 2 peringatan kecil, bukan bug |
| Firmware | `arduino-cli compile` ESP32 Dev Module (core 3.3.12) | sensor & aktuator ter-compile (79% flash) |

## Bug yang ditemukan dan sudah diperbaiki

| # | Bug | Bukti | Perbaikan |
|---|---|---|---|
| **N1** 🔴 | **Web di Pi tampil KOSONG.** Navigasi browser ke `/`, `/dashboard`, dst. dibalas **204** | nginx uji: `GET /dashboard` (Sec-Fetch-Mode: navigate) → 204. Penyebab: `if { rewrite … break; }` di `location @app` mewarisi `proxy_pass` → diteruskan ke backend, yang sengaja menjawab navigasi dengan 204 | `deploy-pi/nginx/vertonik.conf`: di dalam `if` hanya `return 418`; `error_page 418` → `@web` (index.html) / `@api`. Diuji: navigasi → HTML, axios/Flutter → JSON |
| **N2** 🟠 | `POST /login` diteruskan **tanpa `X-Forwarded-For`** → semua pengguna berbagi satu jatah login 10/menit (11 salah sandi mengunci semua orang) | server gema: header kosong | `/login` POST → `@api` yang meneruskan `X-Forwarded-For`/`X-Real-IP`/`X-Forwarded-Proto` (diuji) |
| **N3** 🟠 | `http2 on;` hanya ada di nginx ≥ 1.25.1. Di Raspberry Pi OS **Bookworm** (nginx 1.22) `nginx -t` gagal → `pasang-server.sh` (pipefail) berhenti di langkah 8 | dokumentasi versi nginx | `listen 443 ssl http2` (diterima nginx lama & baru; versi baru hanya memberi peringatan). Diuji di 1.31: lulus, tetap HTTP/2 |
| **D1** 🟠 | `vertonik.sql` dibuat `pg_dump` 17.6+: `\restrict`, `\unrestrict`, `SET transaction_timeout` tidak dikenal PostgreSQL 15 (Bookworm) → impor gagal | 3 baris itu satu-satunya fitur PG17 di dump | `pasang-server.sh` membuang 3 baris itu sebelum impor. Diuji: impor ke DB kosong lulus (52 tabel) |
| **A1** 🟡 | Pi RAM 2 GB: `setup-ai.sh` menarik `qwen2.5:0.5b`, tetapi `rahasia.env` tetap `qwen2.5:1.5b` → AI selalu jatuh ke jawaban aturan | baca skrip | `pasang-server.sh` memilih model sesuai RAM saat menulis `rahasia.env` dan meneruskan `AI_MODEL` ke `setup-ai.sh` |
| **P1** 🟡 | Bundel SD ikut membawa `.agents/`, `skills-lock.json`, `*.bak-*` | `rsync -n` | dikecualikan di `siapkan-sd.sh` dan `pasang-server.sh` |
| **P2** 🟡 | Panduan & pesan akhir pemasang menyebut "tanpa kunci → 401"; API sebenarnya **403** → instalasi benar terlihat gagal | uji asap | teks diperbaiki; uji "curl → HTML" diganti "buka di browser" |
| **F1** 🟡 | Tombol E-STOP belum dipasang → pin 13 mengambang (HIGH) → aktuator menganggap E-STOP aktif, semua perintah ditolak | baca firmware | catatan di panduan: jumper pin 13 ke GND saat uji |

Semua perbaikan di atas ada di `deploy-pi/` (**tidak dilacak git di mesin ini** — salin ke repo `greenhouse_arutmin`).
Salinan sebelum diubah: lihat laporan sesi.

## Belum diperbaiki — perlu keputusan

1. ~~**Data pengembangan ikut ke Pi.**~~ **Selesai** — `backend-nodejs/database/bersihkan_instalasi_baru.sql`, dijalankan
   `pasang-server.sh` hanya pada instalasi baru: hapus 51 alert uji, 15 bacaan lama, `wa_settings`, sesi & cache; katup → AUTO.
   Meja/tanaman/siklus/konfigurasi/akun tetap. Pengaman: menolak jalan bila sudah ada bacaan sesudah 2026-10-22 (diuji).
2. **Aplikasi HP tidak bisa tersambung ke Pi.** `config.dart` menyarankan `http://<ip-pi>:8000`, tetapi di Pi backend hanya
   `127.0.0.1`, firewall hanya 22/80/443, dan port 80 hanya `/api/device/`. Lewat `https://` sertifikatnya self-signed →
   Flutter menolak. Pilihan: (a) aplikasi mempercayai sertifikat Pi secara khusus (pin), (b) buka jalur HTTP terbatas di LAN.
3. **Font poster dari Google Fonts.** Bila Pi/HP tanpa internet, judul "KKN INDUSTRI" dan "Our Team" jatuh ke font cadangan.
   Usul: sajikan font dari Pi (`@fontsource/oswald`, `@fontsource/kaushan-script`).
4. **Akun demo** bisa melihat daftar user (dengan email) dan riwayat audit (backlog S4).
5. Bug B3–B5 di `docs/VERIFIKASI_PERANCANGAN.md` (jatah 8 kejadian, LOCK otomatis, peta katup firmware).

## Tidak bisa diuji dari Mac

- Instalasi sungguhan di Pi (apt, cloud-init, systemd sandbox, ufw, fail2ban, Ollama ARM64).
- PostgreSQL 15 / nginx 1.22 (Bookworm) — perbaikan D1 & N3 dibuat agar kompatibel, tetapi hanya diuji di PostgreSQL 17 & nginx 1.31.
  **Disarankan memakai Raspberry Pi OS 64-bit terbaru (Trixie).**
- Firmware di perangkat keras (hanya compile).
- Kecepatan AI di Pi (Mac: 4–6 dtk; Pi: puluhan detik — batas 30 dtk backend / 45 dtk HP / 60 dtk nginx sudah konsisten).

Uji beban & rekomendasi perangkat keras: [`UJI_BEBAN_PI_2026-10-23.md`](UJI_BEBAN_PI_2026-10-23.md).
