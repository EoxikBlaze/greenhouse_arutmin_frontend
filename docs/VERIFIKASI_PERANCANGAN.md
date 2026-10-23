# Verifikasi Alur — Perancangan vs Implementasi

> Diperiksa: 23 Okt 2026 · Acuan: [`PERANCANGAN_SISTEM_IOT_HIDROPONIK.md`](PERANCANGAN_SISTEM_IOT_HIDROPONIK.md)
> (konversi dari `Perancangan_Sistem_IoT_Hidroponik_FINAL.docx`, 13 Okt 2026)
> Yang dibandingkan: `backend-nodejs` (commit `a21a105`), `deploy-pi/firmware` (sensor v0.1, aktuator v0.1),
> `react-web-app`, dan isi database lokal.

## Cara memeriksa

1. Setiap Aturan 0–14 dan tabel batas di dokumen dicocokkan dengan kode yang menjalankannya.
2. Ke-38 parameter di tabel `konfigurasi_dosis` & `timing_operasi` dicari pemakainya di kode.
3. Fungsi keputusan `putuskan()` (`src/otomasi.js`) dijalankan dengan contoh angka dari dokumen.
4. Firmware dibaca baris per baris (belum ada perangkat keras — **tidak ada uji fisik**).

Status: ✅ sesuai · ⚠️ sebagian / berbeda · ❌ belum ada.

## Ringkasan

| | |
|---|---|
| **Konversi dokumen** | ✅ 7.379 kata sumber → Markdown; selisih hanya "100 ml"→"100ml" dan nomor daftar. 6 gambar di `docs/rancangan/gambar-perancangan/`. |
| **Konfigurasi di DB** | ✅ Semua angka dokumen tersimpan lengkap dengan rujukan bab. |
| **Konfigurasi dipakai kode** | ⚠️ Hanya **11 dari 38** parameter dibaca kode. 27 lainnya (retry, monitoring 60 mnt, jeda A→B, bilas, median 9, timeout, jatah 8 kejadian, …) tersimpan tapi tidak menggerakkan apa pun. |
| **Arsitektur** | ⚠️ Dokumen: semua aturan jalan **di ESP32** dan tetap jalan saat WiFi mati (Aturan 14). Implementasi: keputusan di **server Pi** (`otomasi.js`, default MATI), ESP32 aktuator hanya pelaksana perintah dan **mematikan semua output bila server hilang 30 dtk**. |
| **Siap dipakai di tanaman?** | ❌ Belum. Bug keselamatan B1 & B2 sudah ditutup (23 Okt); B3–B5 dan alur sampling botol, A/B terpisah, bilas, isi air ber-float belum ada di firmware. |

## Bug keselamatan (prioritas)

| # | Temuan | Bukti | Akibat |
|---|---|---|---|
| **B1** ✅ diperbaiki | Sanity check jauh lebih longgar dari dokumen: kode menerima pH 2–12 dan TDS 0–4000; dokumen mewajibkan pH 3–9, EC 0,1–5 mS/cm (50–2.500 ppm), suhu air 5–45 °C | `src/otomasi.js:34` | Diuji: **TDS 20 ppm (probe EC lepas) → dosis AB 214 mL** (maksimum); pH 2,5 → PH_UP; pH 9,5 → PH_DOWN. Dokumen: bacaan mustahil DIBUANG. |
| **B2** ✅ diperbaiki | Otomasi membaca **bacaan terbaru dari meja mana saja**, bukan dari penampung yang dikendalikan | `src/otomasi.js:85` (`SELECT … FROM monitorings ORDER BY created_at DESC LIMIT 1`) | Penampung X bisa didosis dari bacaan penampung Y. Ditambah `/api/device/v1/sensor` menyimpan bacaan **tanpa `id_meja`** (`src/routes/device.js:46` → `monitoring.js:75`), jadi data per penampung memang belum ada dari perangkat. |
| **B3** | Jatah **8 kejadian/hari tidak ditegakkan**; penghitung `kejadian_dosis_hari` naik setiap suntikan (dokumen: retry TIDAK memotong jatah) | `src/aktuator.js:128` | Batas 500 mL tetap jalan, tapi pagar kejadian & INFO dini (3 kejadian) mati. |
| **B4** | Tidak ada yang memasang **LOCK otomatis** (retry habis, jatah habis, EC tinggi + level aman, 3× bacaan invalid) | tak ada penulis `status_lock = true` di `src/` | Batas habis hanya → 409 ke pemanggil; penampung tidak terkunci, tidak ada alert. |
| **B5** | Katup firmware dipetakan ke penampung id **1, 2, 3**; meja di DB ber-id **3, 8, 9, 10, 11** | `firmware/aktuator/aktuator.ino:38` | Hanya "Meja Selada" (id 3) bisa didosis; dokumen: 4 meja. |

### Perbaikan B1 & B2 (23 Okt 2026)

- **B1:** `putuskan()` membuang bacaan di luar pH 3–9, TDS 50–2.500 ppm, suhu air 5–45 °C (`SANITY`, `bacaanMustahil()` di `src/otomasi.js`). TDS 20 ppm, pH 2,5 dan pH 9,5 kini → tidak ada dosis, sebab "bacaan dibuang: …".
- **B2:** `POST /api/device/v1/sensor` menerima `id_meja` tervalidasi (bilangan bulat milik meja yang ada; lainnya 422) dan menyimpannya; anti-duplikat dihitung per penampung. Otomasi memakai `bacaanTerakhir(penampung)` — hanya bacaan penampung itu; tanpa bacaan → tidak berbuat apa-apa. Firmware `sensor.ino` mengirim `ID_MEJA`.
- **Ditemukan saat menguji:** `monitorings.created_at` hanya presisi detik, jadi "bacaan terakhir" dan pemeriksa duplikat bisa memilih baris lama dalam detik yang sama. Kini diurutkan `created_at DESC, id DESC`.
- Tes: +3 unit (`test/otomasi.test.js`), +5 integrasi (`test/integration/sensor-penampung.test.js`). Suite: 189 tes, 188 lulus, 1 dilewati, stabil 3× berturut-turut.

## Matriks aturan

| Aturan (dokumen) | Status | Catatan & bukti |
|---|---|---|
| **0** Satu aksi satu waktu | ⚠️ | Firmware menolak perintah baru saat sibuk (`aktuator.ino` "sibuk"); server menolak otomasi bila masih ada perintah berjalan. Antrian berprioritas belum ada. |
| **0** Status permanen (counter, LOCK) tahan mati listrik | ⚠️ | Tersimpan di DB server (`penampung_states`) ✅; ESP32 tidak menyimpan apa pun di flash — batas per jam di firmware hilang saat reboot. |
| **1** Urutan buka jalan → pompa → matikan → tutup | ⚠️ | Katup dibuka 150 ms sebelum pompa ✅; saat berhenti pompa & katup dimatikan **bersamaan** (dokumen: pompa dulu, jeda ±1 dtk, baru tutup). |
| **2** Antrian & prioritas (isi air > sampling > dosing > monitoring) | ❌ | Tidak ada penjadwal giliran 1→4; tidak ada pembatalan perintah dosing lama setelah isi air. |
| **3** Pengisian air (float → solenoid → contactor, timeout 15 mnt) | ❌ | Firmware tidak membaca float. `ISI_AIR` = satu output menyala ≤ 10 mnt (`MAKS_DURASI_MS` 600000) atas perintah server; tidak ada solenoid per penampung untuk isi air, tidak ada alert timeout. |
| **4** Sampling model botol + median 9 + stabil | ❌ | Firmware sensor membaca satu set probe tiap 5 dtk (rata-rata tengah dari 30 sampel ADC) tanpa botol, float, maupun giliran penampung. `SAMPLING` di aktuator = pompa 10 dtk tanpa float. |
| **5** Keputusan setelah baca | ⚠️ | EC kurang → dosis ✅; dalam deadband → tidak berbuat ✅. **EC tinggi → diam saja** dengan sebab "dalam pita target" (dokumen: minta isi air bila level rendah, atau ALERT + LOCK). |
| **6** Dosing 65% maks 300 ppm | ✅ | Diuji: 102→700 ppm → 214 mL (cap 300 ppm); 402→700 → 138,2 mL; 597→700 → 47,8 mL; 650 → tidak dosis. Pagar 215 mL ditolak 422 di server **dan** firmware. |
| **6** A lalu B terpisah, bilas #1/#2, jeda 2 mnt | ❌ | Hanya satu pompa `AB` (`aktuator.ino:28`). Bilas ada sebagai perintah terpisah, tidak otomatis disisipkan. |
| **6** Mixing 15 mnt | ✅ | `otomasi.js` menunggu `mixing_menit` sejak perintah DOSIS terakhir penampung itu. |
| **6** EC dulu, baru pH | ✅ | `putuskan()` memeriksa EC lebih dulu. pH = langkah tetap 5 mL (`ml_ph_per_langkah`). |
| **7** Retry maks 5× EC / 3× pH → ALERT + LOCK | ❌ | `maks_retry_ec/ph` tidak dibaca kode; otomasi akan terus mendosis selama jatah volume belum habis. |
| **8** Monitoring 60 mnt setelah target | ❌ | `monitoring_menit` tidak dipakai; otomasi mengecek ulang tiap 60 dtk. (Dalam praktik deadband mencegah dosis, jadi dampaknya kecil.) |
| **9** Alert ke HP petani (Telegram) | ❌ | Alert hanya dicatat ke `alert_logs` lewat `POST /api/notif-hardware`; pengiriman ke HP tidak ada (WhatsApp sudah dihapus). |
| **9** Peringatan dini 3 kejadian | ❌ | Lihat B3. |
| **10** Boot: semua output OFF | ✅ | `aktuator.ino` `setup()` mematikan semua output sebelum WiFi + watchdog 15 dtk. |
| **10** Pulihkan counter dari flash, waktu dari RTC | ⚠️ | Counter di server ✅; ESP32 tanpa RTC/flash. |
| **11** Reset harian 00:00, LOCK tidak ikut | ✅ | `aktuator.js:118–121` reset saat tanggal WITA berganti; `status_lock` tidak disentuh. |
| **12** E-STOP | ⚠️ | Ada lapis perangkat lunak: tombol di pin 13, perintah `STOP_DARURAT`, latch server `aktuator_state.estop` + `POST /api/aktuator/estop(/reset)`. Pemutusan daya **fisik** tetap urusan panel (wajib). |
| **12** Tombol RESET membersihkan LOCK | ⚠️ | Tidak ada tombol fisik; LOCK bisa dibersihkan lewat `PUT /penampung-states/:id` (admin). Belum ada UI. |
| **13** Mode pemeliharaan | ⚠️ | Kolom `mode_pemeliharaan` ada; hanya menolak dosis **otomatis** (`aktuator.js:124`). Sampling tidak dijeda, bacaan tetap dicatat, belum ada UI. |
| **14** WiFi putus: kontrol lokal jalan, alert diantre maks 20 | ❌ | Kebalikannya: aktuator mematikan semua output setelah 30 dtk tanpa server (`aktuator.ino:44`) — aman, tapi berarti tidak ada kontrol lokal. Sensor tidak mengantre data saat offline. |
| LCD 20×4, pilot lamp RGB | ❌ | Belum ada di firmware. |
| Sensor udara SHT31 (I2C) | ⚠️ | Firmware memakai DHT22 (`sensor.ino:28`). |

## Antarmuka web

Halaman Dosing hanya mengubah `/konfigurasi-dosis`. Belum ada layar untuk: target EC/pH per penampung, status LOCK & reset, mode pemeliharaan, antrean perintah aktuator, dan E-STOP — padahal dokumen menyebut semua pengaturan dilakukan "lewat aplikasi/website".

## Ketidakkonsistenan di dalam dokumen

Dicatat supaya diperbaiki di dokumen sumber, bukan di kode:

1. **Bab 2.3, contoh 102→700 ppm:** Ronde 1 ditulis 65% = +389 ppm / 278 mL, padahal aturan yang sama membatasi **maks 300 ppm (214 mL) per suntikan**. Sesuai aturan, ronde 1 = 214 mL dan contoh itu jadi 3 ronde, bukan 2. Kode mengikuti aturan (214 mL).
2. **Bab 8 vs Bab 2.2:** Bab 8 menulis "100 ppm = ±14 dtk per pompa"; tabel 2.2 menulis 36 mL per pompa pada 100 mL/menit = **±21 dtk**.
3. **Bab 9:** baris "Dosis per ronde" tertulis dua kali.
4. **Bab 3.2:** baris "Pompa sirkulasi meja" berisi teks baris lain yang tertempel ("Pompa sirkulasi meja | 4 | …").
5. **Bab 1.2 vs data aplikasi:** dokumen memakai Meja 1–4 (3 NFT + 1 DFT); DB berisi 5 meja dengan nama berbeda (keputusan 19 Okt: dibiarkan sampai data lapangan masuk).

## Yang sudah benar dan teruji

- Rumus 65% + cap 300 ppm/214 mL, deadband EC ±100 ppm & pH ±0,2, mixing 15 mnt.
- Pagar berlapis: batas per suntikan di server **dan** firmware, batas 500 mL AB & 100 mL pH per hari, LOCK manual menolak dosis, E-STOP menolak perintah berisiko, antrean maks 10, perintah kedaluwarsa.
- Fail-safe firmware: output OFF saat boot, watchdog, server hilang → semua OFF, batas durasi mutlak per pompa.
- Tes backend: 181 tes, 180 lulus, 1 dilewati (termasuk `test/otomasi.test.js` dan `perangkat.test.js`).

## Urutan perbaikan yang disarankan

1. ~~**B1 + B2**~~ — selesai 23 Okt 2026 (lihat di atas).
2. **B4 + B3** — LOCK otomatis + alert untuk retry habis / jatah habis / EC tinggi; jatah 8 kejadian dihitung per kejadian, bukan per suntikan.
3. **B5** — peta katup firmware mengikuti id meja nyata.
4. Keputusan arsitektur bersama tim: kontrol di ESP32 (sesuai dokumen) atau di Pi (seperti sekarang) — lalu bangun alur sampling botol, A/B + bilas, dan isi air ber-float di sisi yang dipilih.
5. UI: target per penampung, LOCK/reset, mode pemeliharaan, E-STOP.
