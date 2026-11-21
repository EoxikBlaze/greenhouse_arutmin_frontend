# Firmware Hidroponik v6.0.0

Tanggal: 17 November 2026
Folder sketch: `HidroponikV6/` (buka `HidroponikV6.ino`, board **ESP32 Dev Module**)
Dasar:
- Rancangan v6 yang disepakati 17 Nov 2026.
- Kontrak MQTT dari firmware tim **gabungan v0.6**, yang sudah terbukti masuk server Pi.
- Modul teruji dari v5: sensor dan kalibrasi, pengaman relay, RTC.

v5 dan firmware tim **tidak diubah**.

> **Status jujur:** v6 lulus kompilasi (lihat bagian 9). **Belum diunggah ke papan dan belum diuji dengan server Pi.**

---

## 1. Ringkas cara kerja

```
Upload pertama -> semua nilai wajib KOSONG -> alat hanya membaca sensor (BELUM SIAP)
   |  web mengirim: kalibrasi pH/EC, laju 4 pompa, volume, waktu monitoring, jeda A-B, uji lab
   v
SIAP -> petani klik SEMAI (target ppm + rentang pH) -> SEMAI: alat menjaga sendiri
   |  web mengirim TARGET baru tiap ada kenaikan (mis. tiap hari)
   v
PANEN -> dosing & isi otomatis berhenti, sensor tetap membaca
```

- **Alat menjaga sendiri** walaupun internet atau Pi mati. Target terakhir tetap tersimpan di flash.
- Semua nilai disimpan di **flash (NVS)**, jadi tidak hilang saat listrik padam.
- **Kalibrasi pH yang sudah ada tetap terpakai**, karena v6 memakai namespace NVS yang sama (`kalibrasi_ph` / `kalibrasi_ec`). Syaratnya, saat upload jangan pilih "Erase All Flash".

## 2. Aturan menjaga (mode SEMAI)

Urutan pengecekan tiap putaran (hanya bila tidak sedang ada kegiatan):

| # | Kondisi | Tindakan |
|---|---|---|
| 1 | Air **RENDAH** (float bawah turun, stabil 10 dtk) | Isi air sampai float atas naik. Tidak boleh dosing. |
| 2 | Masih dalam **waktu monitoring** sejak tindakan terakhir | Tunggu. |
| 3 | ppm < target − 50 | **Dosing AB.** Takaran = 80% kekurangan, maks naik 150 ppm sekali. mL A = mL B = Δppm × volume / uji_lab. Urutan: A, jeda, B. |
| 4 | ppm > target + 100 | **Encerkan** (isi air sampai penuh), **hanya bila air SEDANG**. Kalau PENUH: tunggu air terpakai. |
| 5 | pH < min − 0,2 atau > max + 0,2 | **pH up/down** 2 mL per 100 L (maks 10 mL). Jeda 2 jam, jadi tidak bisa bolak-balik. |

Aturan lain:
- Dosing yang sedang berjalan **diselesaikan dulu**, baru isi air.
- Setelah tindakan apa pun, E-STOP, pemeliharaan, atau alat menyala, alat **menunggu 1 waktu monitoring**.
- Bacaan harus **stabil** (median 9 sampel) dan sensor suhu air harus valid.
- **Batas per hari** (kembali 0 tiap hari baru):

  | Kegiatan | Batas |
  |---|---|
  | AB | 6× |
  | pH | 5× |
  | Encer | 3× |
  | Isi air | 6× |

  Isi air lebih dari 6× dianggap **curiga bocor**: pompa isi dikunci.
- Pompa isi menyala lebih dari 15 menit tanpa float atas naik juga **dikunci**. Penyebabnya bisa sumber air habis, bocor, atau float rusak.
- Kunci dibuka dengan **tombol RESET** atau perintah web `BUKA_KUNCI`.
- Semua angka di atas adalah parameter, dan bisa diubah (bagian 6).

## 3. Pengaman

| Lapis | Isi |
|---|---|
| E-STOP fisik | Semua pompa mati seketika. Lanjut **hanya** setelah tombol dilepas **dan** RESET ditekan (layar 4, lalu layar 5). |
| E-STOP server | `STOP_DARURAT` atau detak `estop:true`: semua mati. Dibuka admin dari web. |
| Satu beban | Hanya satu pompa boleh menyala sekaligus. |
| Batas waktu | Pompa dosing lebih dari 10 menit, atau pompa isi lebih dari 45 menit tanpa putus: dipaksa mati dan dikunci. |
| Pengawas | Loop macet lebih dari 8 detik: semua mati, lalu restart. |
| Listrik padam saat pompa jalan | Tidak dilanjutkan. Dilaporkan `reboot_saat_jalan`. Hitungan harian dihitung di awal, jadi tidak bisa "curang". |
| Komunikasi | Berjalan di inti prosesor terpisah, jadi WiFi atau server lambat tidak menahan pompa. |
| Kalibrasi | Ditolak bila bacaan belum tenang, tegangan di luar rentang, atau sama dengan titik lain. Set lama dicadangkan (`BALIK_KALIBRASI`). |
| Batas mL | Dosing A atau B ≤ 3 mL per liter tandon sekali suntik. Angka uji lab yang salah tidak bisa menuang berlebihan. |
| EC terlalu rendah | ppm < `ppm_min_dosing` (bawaan 20) menandakan probe di udara atau kabel lepas. Dosing ditahan, LCD menulis `ppm ~0: cek probe EC`. Kalau sumber air memang sangat tawar (mis. air hujan), set ke 0. |
| EC turun mendadak | Turun > 40% **dan** > 150 ppm dalam 10 menit tanpa isi air atau encer: `kunci = EC_CURIGA`, semua dosing ditahan, lampu merah berkedip. Kunci terbuka sendiri bila ppm kembali, atau lewat RESET / `BUKA_KUNCI` / selesai pemeliharaan. |
| EC negatif | Tegangan probe yang jauh di bawah titik kalibrasi (EC < −0,1) dianggap tidak valid, sehingga tidak dibaca 0 dan tidak dipakai untuk dosing. |

## 4. LCD dan lampu

**Layar LCD**, berdasarkan prioritas (yang lebih tinggi menutup layar di bawahnya):

| Prioritas | Layar |
|---|---|
| 1 | E-STOP |
| 2 | Tunggu RESET |
| 3 | E-STOP server |
| 4 | Pesan singkat (RESET OK / kunci dibuka / info jaringan saat RESET ditekan sebentar) |
| 5 | Pemeliharaan (tegangan pH/EC langsung, langkah kalibrasi, sisa waktu) |
| 6 | Utama 1 ⇄ Utama 2, bergantian tiap 10 detik |

Saat dosing atau isi air, progresnya muncul di baris 4.

**Lampu pilot** (satu lampu pada satu waktu; susunan box: MERAH = PILOT1 GPIO13, KUNING = PILOT2 GPIO17, BIRU = PILOT3 GPIO23):

| Lampu | Nyala tetap | Berkedip |
|---|---|---|
| Merah | E-STOP | Kerusakan: float error, isi terkunci, pompa kelamaan, sensor rusak |
| Kuning | Belum siap / offline / batas harian penuh / air rendah | Pemeliharaan |
| Biru | Normal | Cepat = dosing / uji pompa, lambat = isi air / encer |

**Tombol RESET:**
- Tekan singkat: lepas E-STOP, buka kunci, atau tampilkan info WiFi.
- **Tahan 5 detik:** masuk atau keluar pemeliharaan. Ini cadangan bila web mati.

## 5. Kontrak MQTT

Format sama dengan firmware tim, ditambah perintah baru.

Topik, login, dan detak **sama persis** dengan `gabungan.ino` v0.6:
- Topik: `garap/aktuator-01/{data,status,perintah,hasil,ack}` dan `garap/server/status`.
- Login: user `aktuator-01`, password = API key.

### 5.1 Data (`garap/aktuator-01/data`, tiap 5 detik)

| Field | Isi |
|---|---|
| `waterTemp`, `airTemp`, `humidity`, `ph`, `tds` | 5 field yang disimpan backend. `tds` = ppm = EC × 500. |
| `ec` | mS/cm |
| `ph_volt`, `ec_volt` | Tegangan probe, untuk kalibrasi dari web. |
| `id_meja` | |
| `level_air` | `RENDAH` / `SEDANG` / `PENUH` / `ERROR` |
| `float_bawah_rendah`, `float_atas_penuh`, `pompa_isi`, `estop` | |
| `mode` | `SIAP` / `SEMAI` / `PANEN` |
| `siap`, `kurang` | `siap` = **alat** siap (ADS1115, kal pH, kal EC, uji lab, laju 4 pompa). Volume, monitoring, dan jeda A-B bukan syarat siap: dikirim web saat Mulai Semai. Saat mode SEMAI, `siap` ikut memeriksa ketiganya. |
| `pemeliharaan` | |
| `kegiatan` | `DIAM` / `DOSING_A` / `JEDA_AB` / `DOSING_B` / `PH_UP` / `PH_DOWN` / `ISI_AIR` / `ENCER` / `UJI_POMPA` |
| `kunci` | `""` / `FLOAT_ERROR` / `ISI_SERING` / `ISI_TIMEOUT` / `POMPA_KELAMAAN` / `SENSOR_RUSAK` |
| `target_ppm`, `ph_min`, `ph_max`, `hari_semai` | |
| `dosing_ab_hari`, `dosing_ph_hari`, `encer_hari`, `isi_hari` | |
| `rssi`, `firmware`, `uptime` | |

Sensor yang gagal dibaca **tidak dikirim** (tidak ada angka palsu). Alat **tidak mengirim peringatan**; web yang menilai.

### 5.2 Perintah (`garap/aktuator-01/perintah`)

Format pesan: `{"id":123,"tipe":"...","parameter":{...}}`

| `tipe` | `parameter` | Keterangan |
|---|---|---|
| `STOP` | – | Hentikan kegiatan. |
| `STOP_DARURAT` | – | Kunci E-STOP server. |
| `ISI_AIR` | `aksi: MULAI\|STOP` | Laporan dikirim setelah penuh. |
| `UJI_POMPA` | `pompa: A\|B\|PH_UP\|PH_DOWN\|ISI_AIR`, `detik: 1-120` | Untuk kalibrasi laju. Saat SEMAI, wajib pemeliharaan dulu. |
| `DOSIS` | `larutan: AB\|PH_UP\|PH_DOWN`, `ml` | Manual. Tetap dicek batas harian dan batas mL. |
| `KALIBRASI` (format tim) | `ph_v4`, `ph_v7` (tegangan), `tds_faktor`, `laju_a`, `laju_b`, `laju_ph_up`, `laju_ph_down` | Langsung disimpan di flash. |
| `BALIK_KALIBRASI` | `sensor: ph\|ec` | |
| **`KAL_SENSOR`** (baru) | `sensor: ph\|ec`, `titik: 1\|2`, `aksi: UKUR\|SIMPAN\|BATAL`, `acuan?` | Lihat alur di bawah tabel. |
| **`KONFIGURASI`** (baru) | `volume_l`, `monitoring_menit`, `jeda_ab_dtk`, `ppm_per_ml_ab` (atau `ppm_per_ml_a` + `ppm_per_ml_b`), serta nama parameter lain di bagian 6 | Satu nilai salah = **tidak ada** yang disimpan. |
| **`SEMAI`** (baru) | `target_ppm`, `ph_min`, `ph_max` (wajib ketiganya) | Ditolak `belum_siap_<apa>` bila alat belum siap atau volume / monitoring / jeda AB belum dikirim (web mengirim KONFIGURASI dulu saat Mulai Semai). |
| **`TARGET`** (baru) | `target_ppm` dan/atau `ph_min` + `ph_max` | Kenaikan target harian. |
| **`PANEN`** (baru) | – | Dosing dan isi otomatis berhenti. |
| **`PEMELIHARAAN`** (baru) | `aksi: MULAI\|SELESAI` | Batas 120 menit. |
| **`BUKA_KUNCI`** (baru) | – | Buka kunci pompa isi / pompa kelamaan. |
| **`OTOMASI`** (baru) | `nutrisi`, `ph`, `encer`, `isi` (0/1, boleh sebagian) | Izin alat menyalakan aktuator sendiri (saklar web). 0 = alat hanya membaca & melapor; perintah manual tetap jalan. Disimpan di flash, bawaan semua 1. `encer` juga butuh `isi` = 1. Dilaporkan di `data`: `otomasi_ab`, `otomasi_ph`, `otomasi_encer`, `otomasi_isi`. |
| **`STATUS`** (baru) | – | Kirim data seketika. |

**Alur `KAL_SENSOR`:**
1. `UKUR`: alat mengukur, lalu melapor `tegangan`.
2. Petani klik simpan, lalu web mengirim `SIMPAN`.
3. Alat menyimpan ke flash dan melapor.

Saat SEMAI, kalibrasi wajib dalam pemeliharaan dulu.

**Hasil** (`garap/aktuator-01/hasil`): `{"id":123,"status":"selesai|gagal","hasil":{"alasan":"...","firmware":"...", ...}}`.
- Hasil diulang tiap 3 detik sampai `ack {id}`.
- Ekstra sesuai perintah: `ml_nyata`, `durasi_ms`, `tegangan`, `acuan`, `titik`, `titik_terisi`, `jumlah_diatur`.
- Perintah dengan `id` yang sama tidak dijalankan dua kali. 16 id terakhir disimpan di flash.

## 6. Parameter (ketik `param` di serial; ubah dengan `set <nama> <nilai>` atau perintah `KONFIGURASI`)

**Wajib, bawaan 0 = belum diisi** (dosing tidak jalan sebelum diisi):

| Nama | Arti |
|---|---|
| `volume_l` | Volume tandon (L) |
| `monitoring_menit` | Waktu monitoring |
| `jeda_ab_dtk` | Jeda pompa A ke B (detik) |
| `ppm_per_ml_ab` | Uji lab: kenaikan ppm per (1 mL A + 1 mL B) per liter |
| `laju_a`, `laju_b`, `laju_ph_up`, `laju_ph_down` | Laju pompa (mL/detik) |

**Bawaan disepakati:**

| Nama | Bawaan |
|---|---|
| `toleransi_bawah_ppm` | 50 |
| `toleransi_atas_ppm` | 100 |
| `persen_dosis` | 80 |
| `maks_ppm_sekali` | 150 |
| `ppm_min_dosing` | 20 (0 = cek dimatikan) |
| `ph_toleransi` | 0,2 |
| `ph_jeda_menit` | 120 |
| `ph_ml_per_100l` | 2 ⚠ perlu dicoba dulu, tergantung kekuatan cairan pH |
| `ph_ml_maks` | 10 |
| `maks_ab_hari` | 6 |
| `maks_ph_hari` | 5 |
| `maks_encer_hari` | 3 |
| `maks_isi_hari` | 6 |
| `timeout_isi_menit` | 15 |
| `pemeliharaan_maks_menit` | 120 |
| `telemetri_dtk` | 5 |
| `tz_menit` | 480 (WITA) |
| `id_meja` | 0 (pakai `ID_MEJA` di rahasia.h) |
| `ec_faktor` | 1 |

## 7. Langkah pemasangan

1. **`rahasia.h`** sudah disalin dari kode tim (WiFi, IP Pi, API key). Baris `AKTIFKAN_BACA_ESTOP 0` **sengaja dibuang**, jadi E-STOP selalu dibaca. Jangan dibagikan.
2. Upload dengan aman:
   - MCB OFF, OUT+ buck lepas dari J7, USB terpasang.
   - Arduino IDE: **Erase All Flash = Disabled**.
3. Buka Serial 115200, lalu ketik `status`. Cek: WiFi, server, MQTT, jam, dan kalibrasi pH 2/2.
4. Isi nilai wajib (dari web atau serial). Contoh lewat serial:
   ```
   set volume_l 100
   set monitoring_menit 45
   set jeda_ab_dtk 300
   set ppm_per_ml_ab 100        <- dari uji lab
   uji a 10                      <- ukur mL di gelas ukur, mis. 12 mL -> laju 1.2
   set laju_a 1.2                (ulangi untuk b, phup, phdown)
   ```
5. `semai 600 5.5 6.5`. Mulai **dengan air saja dan pompa dosing diarahkan ke gelas**, untuk memastikan takaran sebelum memakai nutrisi sungguhan.

## 8. Yang perlu disiapkan tim web

1. Kirim perintah baru: `KONFIGURASI`, `SEMAI`, `TARGET`, `PANEN`, `PEMELIHARAAN`, `KAL_SENSOR`, `BUKA_KUNCI`, `STATUS`. Tambahkan juga ke daftar izin dispatch (`TIPE_BOLEH`).
2. Simpan field tambahan `data` (minimal `level_air`, `mode`, `kegiatan`, `kunci`, `estop`) bila ingin ditampilkan.
3. **Matikan dosing otomatis dari server** (perintah `DOSIS` otomatis), karena dosing sekarang diputuskan alat. `DOSIS` manual tetap boleh.
4. Kalibrasi pH dari web boleh tetap memakai format lama (`KALIBRASI ph_v4/ph_v7`). Acuan v6 adalah 4,01 dan 7,00 untuk format ini, dan 4,01 dan 6,86 untuk `KAL_SENSOR`.
5. Batas waktu 90 detik perintah: `ISI_AIR` dilaporkan **setelah penuh** (sama dengan firmware tim v0.6), dan `UJI_POMPA` maksimal 120 detik.

## 9. Status uji

- Kompilasi 17 Nov 2026 (arduino-cli, core esp32 3.2.0, `--warnings all`): **0 error, 0 peringatan dari kode v6**.
  Flash 82% (1.079.662 B), RAM global 17%. Termasuk pengaman EC (ppm_min_dosing + EC_CURIGA). Peringatan yang tersisa berasal dari library (OneWire, LiquidCrystal_I2C, IDF).
- Belum diuji di papan: koneksi Pi, perintah web baru, alur semai, dan dosing nyata.
