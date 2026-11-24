# Naskah & Storyboard — Video Stickman Edukatif GARAP (2 menit, landscape)

Status: **rencana produksi, belum ada audio, belum ada render.** Dokumen ini bukan MP4 dan bukan hasil sinkronisasi final.
Tanggal susun: 25 Nov 2026.

---

## 1. Analisis skill & pendekatan

### Skill yang benar-benar tersedia
| Hal | Temuan |
|---|---|
| Nama | `stick-figure` (lokal: `~/.claude/skills/stick-figure`), mesin di `engine/`, kit suara di `~/.claude/animation-skills/kit` (model Kokoro + Parakeet sudah terpasang). |
| Keluaran | **MP4 sungguhan**: adegan digambar di Canvas (`web/shots.js`, `chars.js`, `env.js`), dirender headless lewat `tools/render.js` (Playwright), dirakit `make.sh` + ffmpeg. Ada juga `stills` untuk cek bingkai. |
| Orientasi | **Vertikal 9:16 terkunci di kode**: viewport 1080×1920 di `render.js`, vinyet berpusat (540,960) di `main.js`, pita caption y 1250–1420, area aman gaya Instagram. Landscape **perlu modifikasi** `render.js`, `main.js` (W/H, vinyet, caption), dan semua koordinat `shots.js`. |
| Durasi | Dirancang 30–45 dtk (±110–120 kata, 10–12 setup). 120 dtk butuh ±35–40 setup; mesin render paralel jadi tidak ada batas teknis, tapi beban gambar ±3× contoh. |
| Frame rate | Belum diverifikasi di kode (`make.sh` tidak menyebut fps secara eksplisit). [PERLU KONFIRMASI: cek fps render; target 30 fps.] |
| Karakter & gerak | Rig `drawStick` (kepala putih besar, wajah ekspresif, IK lengan, topi). Cocok untuk operator & pemandu. Properti bawaan bertema bajak laut → semua properti GARAP harus dibuat baru di `env2.js`. |
| Suara (TTS) | Kokoro dipanggil dengan `lang="en-us"`; **tidak ada suara bahasa Indonesia**. ElevenLabs didukung (multibahasa) tetapi butuh `ELEVENLABS_API_KEY` berbayar & mengirim teks ke layanan luar. |
| Penyelarasan kata | `align.py` memakai Parakeet TDT 0.6B **v2 (model ASR bahasa Inggris)** → stempel waktu kata Indonesia tidak bisa diandalkan. Perlu aligner lain atau penandaan waktu per kalimat secara manual. |
| Subtitle | `capText()` membuat caption 1–2 kata huruf kecil Poppins di tengah. **Tidak sesuai** permintaan subtitle 2 baris → harus ditulis ulang. |
| Musik & SFX | Disintesis dalam kode (`audio.py`), dengan ducking di bawah narasi. Sesuai kebutuhan. |
| Alat tambahan | ffmpeg, Node, Python 3.9+ (kit sudah ada). Tidak ada dependensi yang dipasang pada tahap ini. |

### Referensi luar
Tiga repo GitHub yang disebut **tidak dibuka/dibandingkan** pada sesi ini. Pilihan dibuat karena `stick-figure` sudah terpasang dan menghasilkan MP4 nyata.

### Pendekatan utama yang diusulkan
1. Pakai mesin `stick-figure` sebagai dasar, buat **salinan reel landscape** (bukan mengubah template asli): ubah viewport ke 1920×1080, caption 2 baris di pita bawah.
2. **Narasi direkam manusia** (penutur Indonesia, tenang) → paling aman untuk pelafalan "pH", "EC", "rockwool", "E-STOP". Alternatif: ElevenLabs multilingual (butuh izin & kunci API).
3. **Sinkronisasi per kalimat**: tandai awal/akhir tiap kalimat dari rekaman (manual di editor audio, atau aligner yang mendukung Indonesia — dipasang nanti, setelah disetujui). Fitur warp otomatis `make.sh` baru bisa dipakai bila ada `words_*.json` yang valid.
4. Render di laptop/PC produksi, **bukan** di Raspberry Pi GARAP.

---

## 2. Konsep visual singkat

- **Dunia**: greenhouse melon terang, garis tinta tebal (`#221c22`), bayangan kontak lembut. Instalasi GARAP selalu di posisi tetap: **panel di kiri tengah, tandon di kanan panel, talang melon di latar belakang kanan, meja semai di kiri jauh** (posisi ini konvensi video, bukan denah nyata — [PERLU KONFIRMASI dari foto alat]).
- **Operator (Pak/Bu Tani)**: topi caping, kaus hijau hutan `#2D452F`, handuk kecil di bahu. Peran: belajar & memperagakan.
- **Pemandu**: rompi navy `#0A1F38` dengan strip emas `#E9CD53` (emas hanya di atas navy, sesuai DESIGN.md), memegang tablet. Peran: menunjuk & menjelaskan.
- **Palet**: diambil dari **DESIGN.md website GARAP** (navy `#0A1F38`, hijau pucat `#F4F7F2`, hijau hutan `#2D452F`→`#4C6A4B`, moss `#6B9D4A`, emas `#E9CD53`, merah kritis `#C0392B`, kuning waspada `#E0A42B`). Ini palet website, dipakai sebagai usulan identitas video — [PERLU KONFIRMASI: boleh dipakai untuk video?].
- **Tipografi layar**: Space Grotesk (judul/angka) + Inter (subtitle), sesuai DESIGN.md. File font perlu disiapkan (mesin hanya membawa Poppins & Lora).
- **Logo**: tidak ditemukan berkas logo resmi di repo. Gunakan **wordmark teks "GARAP"** saja sampai logo resmi diberikan. Tidak membuat logo rekaan.
- **Tata letak 1920×1080**: margin aman 5% (x 96–1824, y 54–1026). Zona aksi y 54–840. **Pita subtitle y 880–1010**, kotak navy 80% opasitas, Inter SemiBold 44 px putih, maks 2 baris × ±42 karakter. Teks utama/label di atas zona subtitle, maks 6–8 kata.

---

## 3. Naskah narasi (siap rekam)

Gaya baca: tenang, ramah, jeda pendek antar kalimat. "pH" dibaca *pe-ha*; "EC" dibaca *e-se*; "E-STOP" dibaca *i-stop*.

| Adegan | Waktu target | Narasi | Kata |
|---|---|---|---|
| 1 | 00:00–00:08 | Petani melon perlu tahu setiap hari: airnya pas? Nutrisinya cukup? Bagaimana memantaunya lebih mudah? | 14 |
| 2 | 00:08–00:18 | Kenalkan GARAP. GARAP membantu memantau kondisi air dan tanaman, lalu mengelola penambahan nutrisi sesuai pengaturan dan izin sistem. | 18 |
| 3 | 00:18–00:30 | Sensor membaca pH, tingkat keasaman air, dan EC, petunjuk kepekatan nutrisi, juga suhu dan ketinggian air. Sistem memeriksanya, website menampilkannya. Pompa dosing kecil berbeda dari pompa sirkulasi. | 27 |
| 4 | 00:30–00:45 | Sebelum dipakai, sensor dikalibrasi. Kalibrasi menyelaraskan hasil sensor dengan cairan acuan yang nilainya sudah diketahui. Probe dibilas, dicelup, ditunggu sampai stabil, baru disimpan. Ulangi untuk setiap acuan. | 27 |
| 5 | 00:45–00:57 | Setelah itu, alat diuji. Kalibrasi menyetel pembacaan; pengujian memeriksa hasil dan fungsinya. Bandingkan dengan alat ukur pembanding, pastikan website ikut diperbarui, lalu catat. | 23 |
| 6 | 00:57–01:14 | Lalu semai melon, sesuai SOP lapangan GARAP. Rendam benih di air ekstrak bawang merah satu hari. Peram dua hari di kain hitam lembap. Jemur sinar pagi dua hari sambil dijaga lembap, baru pindah ke rockwool. | 35 |
| 7 | 01:14–01:24 | Di website, pengaturan budidaya melon menyimpan target. Pembacaan sensor yang sebenarnya dibandingkan dengan target itu. Target bukan bacaan. | 18 |
| 8 | 01:24–01:42 | Dosing artinya menambah cairan nutrisi secara terukur. Nutrisi rendah tidak langsung menyalakan pompa. Sistem memeriksa bacaan, batas, dan izin dulu. Saat ini izin dosing masih dikunci. Jika diizinkan, pompa menambah sedikit, larutan tercampur, lalu dibaca ulang. | 36 |
| 9 | 01:42–01:53 | Setiap hari, tetap periksa data terbaru, persediaan cairan, selang, dan tanaman. Ada peringatan? Cari penyebabnya dulu. Saat darurat, tekan E-STOP. | 20 |
| 10 | 01:53–02:00 | Bersama GARAP: kalibrasi, uji, semai, atur, dan pantau. | 8 |
| | | **Total** | **226** |

**Estimasi (bukan hasil ukur)**: pada 2,0–2,2 kata/detik, narasi ±103–114 dtk, sisa ±6–17 dtk untuk jeda & ekor musik. Adegan 3 (2,25 kata/dtk) dan 8 (2,0) paling padat. **Durasi sebenarnya wajib diukur dari rekaman.** Jika satu adegan melebihi slotnya, ringkas kalimatnya (bukan mempercepat suara).

Cadangan ringkasan bila terlalu panjang:
- Adegan 3: hapus "juga suhu dan ketinggian air" (tetap tampil sebagai ikon).
- Adegan 8: hapus "Saat ini izin dosing masih dikunci." (tetap tampil sebagai label gembok).

---

## 4. Storyboard (total 120,0 dtk = 3.600 frame @30 fps)

Konvensi: **OP** = operator, **PM** = pemandu. Subtitle selalu di pita bawah dan mengikuti kalimat narasi; kolom "Teks layar" hanya berisi label/judul di zona aksi.

### Adegan 1 — Masalah pembuka (00:00–00:08)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 1a | 00:00–00:03 | "Petani melon perlu tahu setiap hari: airnya pas?" | OP berjongkok di tepi tandon, menciduk air ke gelas, mengangkatnya ke mata (penasaran). Kaki tertanam saat jongkok. | Air di gelas bergoyang lalu diam. | Wide greenhouse dari kiri, push-in pelan ke OP. Aksi sudah berjalan di frame 1. | — | ciduk air lembut |
| 1b | 00:03–00:05.5 | "Nutrisinya cukup?" | OP berjalan 3 langkah ke talang, mengangkat daun melon dengan satu tangan. | Daun terangkat, kembali saat dilepas. | Medium, kamera ikut sejajar langkah. | — | langkah, gesek daun |
| 1c | 00:05.5–00:08 | "Bagaimana memantaunya lebih mudah?" | OP membuka buku catatan, menggaruk kepala (bingung). | Buku terbuka, halaman penuh coretan. | Medium close, kamera diam. | "?" kecil di atas kepala | kertas dibalik |

### Adegan 2 — Perkenalan GARAP (00:08–00:18)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 2a | 00:08–00:11 | "Kenalkan GARAP." | OP menoleh ke kanan. | Instalasi terlihat utuh: panel, tandon, talang. | Pan pelan kiri→kanan dari OP ke instalasi, berhenti dengan panel di sepertiga kiri. | — | musik masuk lembut |
| 2b | 00:11–00:15 | "GARAP membantu memantau kondisi air dan tanaman," | PM masuk dari kanan (antisipasi–langkah–berhenti, kaki menapak), mengangkat tangan menunjuk panel. | Panel tidak berubah. | Wide statis. | **GARAP** (wordmark Space Grotesk, navy) muncul 00:12, bertahan hingga 00:17 | pop lembut judul |
| 2c | 00:15–00:18 | "lalu mengelola penambahan nutrisi sesuai pengaturan dan izin sistem." | OP mendekat, berdiri di samping PM, mengangguk (memahami). | Ikon kecil: gir (pengaturan) + gembok (izin) di samping panel. | Medium two-shot, kamera diam. | "Pantau • Kelola sesuai izin" | klik UI |

### Adegan 3 — Kenali bagiannya (00:18–00:30)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 3a | 00:18–00:21.5 | "Sensor membaca pH, tingkat keasaman air, dan EC, petunjuk kepekatan nutrisi," | Tangan PM menunjuk dua probe di tandon (ujung jari tidak menembus). | Probe pH & EC tersorot bergantian. | Close-up tandon, kamera diam. | "pH = keasaman" / "EC = kepekatan nutrisi" | ting kecil ×2 |
| 3b | 00:21.5–00:24 | "juga suhu dan ketinggian air." | — (fokus benda) | Ikon muncul di posisi sensornya: termometer (suhu air), sensor udara (suhu & kelembapan), pelampung bawah/atas. | Close-up, slide pelan ke kanan. | "Suhu • Kelembapan • Ketinggian air" | — |
| 3c | 00:24–00:27 | "Sistem memeriksanya, website menampilkannya." | — | Diagram 3 kotak: **Sensor membaca → Sistem memeriksa → Website menampilkan**, titik data mengalir sepanjang panah. | Kamera diam (teks dibaca). | Tiga kotak tersebut | aliran halus |
| 3d | 00:27–00:30 | "Pompa dosing kecil berbeda dari pompa sirkulasi." | PM menunjuk pompa kecil, lalu pompa besar. | Dua pompa berdampingan diberi label; tidak ada yang menyala. | Medium, kamera diam. | "Pompa dosing: tambah sedikit" / "Pompa sirkulasi: alirkan air" | — |

### Adegan 4 — Kalibrasi (00:30–00:45)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 4a | 00:30–00:33 | "Sebelum dipakai, sensor dikalibrasi." | OP menata botol larutan acuan di meja kalibrasi, satu per satu. | Botol berlabel: **pH 4,01**, **pH 6,86**, **EC 1413 µS/cm** [PERLU KONFIRMASI: tampilkan 9,18 dan 12.880 µS/cm?]. | Medium meja kalibrasi, push-in pelan. | Judul bab "Kalibrasi" | botol beradu pelan |
| 4b | 00:33–00:37 | "Kalibrasi menyelaraskan hasil sensor dengan cairan acuan yang nilainya sudah diketahui." | OP membilas probe di gelas bilas (tangan memegang kabel probe). PM berdiri di sisi, menjelaskan dengan tablet. | Tetesan air dari probe. | Close-up tangan & probe, kamera diam. | "Bilas" | air menetes |
| 4c | 00:37–00:41 | "Probe dibilas, dicelup, ditunggu sampai stabil," | OP mencelup probe ke botol pertama, menunggu (memeriksa). | Indikator di layar tablet bergoyang beberapa kali, lalu ikon "stabil". **Tanpa angka hasil.** | Close-up layar + botol dalam satu frame, kamera diam. | "Celup → tunggu stabil" | — |
| 4d | 00:41–00:45 | "baru disimpan. Ulangi untuk setiap acuan." | OP mengetuk tombol simpan di tablet, membilas lagi, mengangkat botol berikutnya. | Ceklis kecil di botol pertama; botol kedua bergeser maju. | Medium, kamera diam. | "Ulangi tiap acuan" | klik UI |

Catatan: urutan botol & langkah "Aktifkan pemeliharaan" mengikuti SOP terverifikasi — lihat bagian 6.

### Adegan 5 — Uji Alat & Validasi (00:45–00:57)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 5a | 00:45–00:49 | "Setelah itu, alat diuji. Kalibrasi menyetel pembacaan; pengujian memeriksa hasil dan fungsinya." | OP memegang alat ukur pembanding (meter genggam) dan mencelupnya di wadah yang sama dengan probe GARAP. | Dua layar kecil bersebelahan, tanda "≈" di antaranya. **Tanpa angka.** | Close-up dua alat, kamera diam. | Judul bab **"Uji Alat & Validasi"**; "Setel ≠ Periksa" | — |
| 5b | 00:49–00:53 | "Bandingkan dengan alat ukur pembanding, pastikan website ikut diperbarui," | OP melihat ponsel. | Di ponsel, waktu "diperbarui" berganti menjadi lebih baru (ilustrasi). | Over-the-shoulder ke ponsel, kamera diam. | "Data ikut diperbarui?" + label kecil "Ilustrasi tampilan" | notifikasi lembut |
| 5c | 00:53–00:57 | "lalu catat." | OP menulis di lembar uji; PM mengangguk. | Lembar berisi baris item kosong yang diberi tanda centang saat ditulis. **Tidak ada stempel LULUS.** | Medium, kamera diam. | "Catat hasil uji" | pensil menulis |

### Adegan 6 — Mulai semai melon (00:57–01:14)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 6a | 00:57–01:01 | "Lalu semai melon, sesuai SOP lapangan GARAP. Rendam benih di air ekstrak bawang merah satu hari." | OP menuang benih ke wadah air bawang merah (wadah terbuka). | Benih tenggelam perlahan; kalender kecil di pojok kanan atas. | Medium area semai, push-in. | Judul bab "Semai Melon — SOP lapangan GARAP"; label "Rendam • 1 hari" | tuang biji, plung |
| 6b | 01:01–01:05 | "Peram dua hari di kain hitam lembap." | OP meniriskan, membilas, lalu melipat benih dalam kain hitam lembap, menaruhnya di tempat teduh. | Kalender dibalik 2 lembar; latar meredup (gelap). | Medium, cut ke tempat teduh. | "Peram kain hitam • 2 hari" | balik kalender ×2 |
| 6c | 01:05–01:10 | "Jemur sinar pagi dua hari sambil dijaga lembap," | OP membuka kain: ada kecambah, **panjang tidak sama**; menyemprot kabut air; matahari rendah di kiri. | Kalender dibalik 2 lembar; sebagian benih belum berkecambah. | Close-up kain, kamera diam. | "Sinar pagi • 2 hari • jaga lembap"; "Pertumbuhan bisa berbeda" | semprot kabut |
| 6d | 01:10–01:14 | "baru pindah ke rockwool." | OP menaruh satu kecambah di lubang rockwool dengan dua jari (jari menyentuh kecambah). | Baris rockwool terisi satu per satu. | Close-up tangan, lalu tarik ke medium. | "Pindah ke rockwool"; "Nutrisi awal 400–600 PPM (sesuai SOP)" | letak lembut |

### Adegan 7 — Pengaturan & pembacaan (01:14–01:24)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 7a | 01:14–01:18 | "Di website, pengaturan budidaya melon menyimpan target." | OP menggulir ponsel. | Layar: dua kolom **"Bacaan sekarang"** dan **"Target"**, isi berupa garis/batang tanpa angka. | Close-up ponsel, kamera diam. | Label pojok "Ilustrasi tampilan" | gulir halus |
| 7b | 01:18–01:24 | "Pembacaan sensor yang sebenarnya dibandingkan dengan target itu. Target bukan bacaan." | OP menoleh dari ponsel ke tandon. | Garis putus-putus menghubungkan kolom "Bacaan sekarang" ke probe di tandon; kolom "Target" tetap di ponsel. | Dolly dari ponsel ke tandon (gerak bermakna: menghubungkan), lalu diam. | "Bacaan ↔ Target" ; "Target ≠ bacaan" | — |

### Adegan 8 — Bagaimana dosing bekerja? (01:24–01:42)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 8a | 01:24–01:28 | "Dosing artinya menambah cairan nutrisi secara terukur." | PM berdiri di samping diagram, menunjuk langkah 1. | Diagram konseptual 5 langkah muncul: **Bacaan diperiksa → Syarat & izin → Tambah terukur → Tercampur → Baca ulang**. | Diagram potong sederhana, kamera diam. | Judul "Bagaimana dosing bekerja?" | pop judul |
| 8b | 01:28–01:33 | "Nutrisi rendah tidak langsung menyalakan pompa. Sistem memeriksa bacaan, batas, dan izin dulu." | OP mengangkat tangan seolah mau menekan pompa, PM menahan dengan isyarat telapak (waspada). | Langkah 2 menyala: tiga lampu cek "Bacaan wajar", "Dalam batas", "Izin". | Kamera diam. | Tiga label cek | tik ×3 |
| 8c | 01:33–01:37 | "Saat ini izin dosing masih dikunci." | OP mengangguk. | Lampu "Izin" berubah menjadi **gembok terkunci**; pompa diam. | Close-up gembok, kamera diam. | "Izin eksekusi: dikunci" | klik gembok |
| 8d | 01:37–01:42 | "Jika diizinkan, pompa menambah sedikit, larutan tercampur, lalu dibaca ulang." | — | Pompa dosing menyala **satu denyut singkat** lalu berhenti (tidak terus-menerus); tetes masuk ke tandon secara konseptual; panah melingkar tanda tercampur; ikon sensor membaca ulang, panah kembali ke langkah 1. | Kamera diam. | Label tetap di atas: **"Ilustrasi setelah izin operasional"** | dengung pompa pendek, tetes |

Catatan: titik masuk cairan, jeda A→B, dan cara pencampuran digambar **konseptual** (tanpa perpipaan) sampai dikonfirmasi.

### Adegan 9 — Pemantauan & gangguan (01:42–01:53)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 9a | 01:42–01:45 | "Setiap hari, tetap periksa data terbaru," | OP memeriksa ponsel. | Penanda waktu data terbaru. | Medium, kamera diam. | Checklist muncul di kiri: "Data terbaru" | tik |
| 9b | 01:45–01:48 | "persediaan cairan, selang, dan tanaman." | OP menggoyang jeriken stok, menelusuri selang dengan jari, melihat daun. | Centang bertambah satu per satu. | Medium, kamera ikut OP. | "Cairan • Selang • Tanaman" | goyang jeriken |
| 9c | 01:48–01:50.5 | "Ada peringatan? Cari penyebabnya dulu." | OP berhenti, wajah waspada. | Ponsel menampilkan contoh peringatan sederhana (ikon segitiga kuning). | Close-up ponsel, kamera diam. | "Bacaan tidak tersedia → periksa dulu" + "Ilustrasi tampilan" | chime lembut (bukan alarm) |
| 9d | 01:50.5–01:53 | "Saat darurat, tekan E-STOP." | PM menunjuk tombol jamur merah di panel; OP memperhatikan. | Tombol E-STOP tersorot; tidak ditekan. | Close-up panel, kamera diam. | "E-STOP: untuk keadaan darurat" | — |

### Adegan 10 — Penutup (01:53–02:00)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 10a | 01:53–01:57 | "Bersama GARAP: kalibrasi, uji, semai, atur, dan pantau." | OP & PM berdiri berdampingan di greenhouse, OP mengacungkan jempol. | — | Wide, pull-back pelan. | Lima kata muncul bertahap: Kalibrasi • Uji • Semai • Atur • Pantau | pop ×5 lembut |
| 10b | 01:57–02:00 | (musik) | Diam, napas ringan. | — | Wide diam. | Wordmark **GARAP** + nama lengkap [PERLU KONFIRMASI] | akor musik penutup |

**Cek total:** 8 + 10 + 12 + 15 + 12 + 17 + 10 + 18 + 11 + 7 = **120 dtk**.

---

## 5. Daftar aset

**Karakter (kode `chars.js`)**: OP dengan caping & handuk; PM dengan rompi navy-emas & tablet; ekspresi: penasaran, bingung, memahami, memeriksa, waspada.

**Properti baru (`env2.js`)**: interior greenhouse + talang melon; panel GARAP (LCD 20×4, 3 lampu pilot, tombol RESET, tombol jamur E-STOP) — bentuk dari foto; tandon dengan probe pH/EC, sensor suhu air, pelampung bawah/atas; sensor suhu-kelembapan udara; pompa peristaltik kecil (A, B, pH Up, pH Down) + pompa isi air; pompa sirkulasi [PERLU KONFIRMASI]; jeriken/botol stok; meja kalibrasi, botol larutan acuan berlabel, gelas bilas, meter pembanding; ponsel/tablet dengan tampilan ilustratif; lembar uji; wadah rendam, bawang merah, kain hitam, penyemprot, kalender, nampan rockwool, kecambah dengan panjang beragam; diagram alur sensor→sistem→website & diagram dosing 5 langkah; gembok.

**Tipografi & grafis**: Space Grotesk + Inter (file TTF, lisensi OFL); kotak subtitle; wordmark teks GARAP.

**Audio**: rekaman narasi Indonesia (WAV 48 kHz); musik instrumental ringan (sintesis `audio.py` atau musik bebas lisensi); SFX daftar di atas (lembut, tanpa sirene/alarm).

**Referensi dari Anda (belum ada di sesi ini)**: foto alat (panel, tandon, jalur cairan, posisi sensor, pompa) dan screenshot website (halaman Kalibrasi, Target Nutrisi/pengaturan, Dashboard, Peringatan). Tanpa ini, bentuk alat & layar digambar generik dan diberi label "Ilustrasi".

---

## 6. Fakta yang perlu dikonfirmasi

1. [PERLU KONFIRMASI: kepanjangan GARAP. Brief: "Greenhouse Automation & Research Arutmin–Politala"; modul Juknas/Juknis: "Green Autonomous Responsive Agriculture Platform".]
2. [PERLU KONFIRMASI: titik kalibrasi pH. Keputusan pemilik 17 Nov 2026: buffer resmi 4,01 & 6,86 dan 9,18 dihapus; AGENTS.md & `aiMelonModul.js` masih menyebut 9,18 (opsional); Juknis & `aiPanduan.js` menyebut pH 4,0 & 7,0.]
3. [PERLU KONFIRMASI: kalibrasi EC 1 titik (1413 µS/cm, sesuai brief) atau 2 titik (1413 & 12.880 µS/cm, sesuai Juknis & keputusan K2).]
4. [PERLU KONFIRMASI: urutan botol kalibrasi (pH dulu atau EC dulu; 6,86 dulu atau 4,01 dulu). Juknis: EC dulu, lalu pH 4 → 7. Video saat ini tidak menyiratkan urutan.]
5. [PERLU KONFIRMASI: nama tombol di layar kalibrasi versi web sekarang (Juknis menyebut "Aktifkan pemeliharaan", "Ambil titik 1.413"; aiPanduan menyebut tombol "Kalibrasi"/"Simpan"). Perlu screenshot.]
6. [PERLU KONFIRMASI: apakah GARAP mengendalikan pompa sirkulasi. Peta pin Juknis hanya memuat pompa A, B, pH Up, pH Down, dan isi air.]
7. [PERLU KONFIRMASI: makna lampu pilot pada firmware yang terpasang sekarang (hidro-v6.4.0). Juknis (gabungan-0.6): hijau = normal, merah+hijau = peringatan, merah saja = E-STOP, biru = pompa aktif. Video belum menampilkan arti warna.]
8. [PERLU KONFIRMASI: efek E-STOP. Juknis: mengunci seluruh aktuator/pompa. Video hanya menyebut "untuk keadaan darurat", tanpa klaim memutus seluruh listrik.]
9. [PERLU KONFIRMASI: titik masuk cairan dosing, jeda A→B, dan cara pencampuran (sirkulasi?). Saat ini digambar konseptual.]
10. [PERLU KONFIRMASI: apakah kalimat "Saat ini izin dosing masih dikunci" boleh masuk video publik; status `EKSEKUSI_DIIZINKAN = false` bisa berubah setelah validasi.]
11. [PERLU KONFIRMASI: nutrisi awal 400–600 PPM diberikan saat dipindah ke rockwool atau setelah kotiledon membuka. `aiMelonModul.js`: setelah daun lembaga membuka penuh, pH 5,8–6,5. Label video ditulis "sesuai SOP" tanpa waktu.]
12. [PERLU KONFIRMASI: memasukkan seleksi uji apung (benih tenggelam dipakai, mengambang disisihkan)? Ada di SOP `aiMelonModul.js`; belum dimasukkan ke narasi.]
13. [PERLU KONFIRMASI: nama menu pengaturan budidaya melon yang ditampilkan (Target Nutrisi `/dosing`, Ambang Sensor `/ambang`, atau preset tanaman). Perlu screenshot.]
14. [PERLU KONFIRMASI: alat ukur pembanding yang dipakai pada uji (meter pH/TDS genggam, termometer, higrometer) dan apakah ada dokumen Uji Laboratorium. Video memakai judul "Uji Alat & Validasi" saja.]
15. [PERLU KONFIRMASI: logo resmi & izin memakai palet DESIGN.md untuk video.]
16. [PERLU KONFIRMASI: denah instalasi (posisi panel, tandon, talang, area semai) dari foto.]
17. [PERLU KONFIRMASI: fps & cara mesin menangani 1920×1080 setelah dimodifikasi.]

Tidak ada kapasitas tandon, volume/durasi dosing, target per umur tanaman, atau hasil uji yang dimasukkan ke video.

---

## 7. Checklist sebelum produksi

**Isi**
- [ ] Semua butir bagian 6 dijawab; teks layar & narasi disesuaikan.
- [ ] Foto alat & screenshot website diterima; layar yang tidak sesuai aslinya diberi label "Ilustrasi tampilan".
- [ ] Label "Ilustrasi setelah izin operasional" ada di seluruh shot pompa menyala (8d).
- [ ] Tidak ada stempel LULUS, angka hasil kalibrasi, kapasitas tandon, atau volume dosing.
- [ ] Penutup tanpa klaim panen pasti berhasil / alat bebas pengawasan.

**Audio**
- [ ] Narasi direkam (penutur Indonesia) atau suara TTS Indonesia diuji pelafalannya; Kokoro bawaan tidak dipakai untuk Indonesia.
- [ ] Durasi rekaman diukur per adegan; total ≤ 120 dtk tanpa mempercepat suara. Jika lebih, ringkas naskah dulu.
- [ ] Waktu tiap kalimat ditandai (manual atau aligner berbahasa Indonesia); `shots.js` di-timing ulang dari rekaman nyata.
- [ ] Musik & SFX di bawah narasi; tidak ada bunyi alarm dekoratif.

**Teknis mesin**
- [ ] Salin template ke folder reel baru; jangan ubah skill asli.
- [ ] Ubah viewport `render.js` ke 1920×1080, sesuaikan W/H & vinyet `main.js`, ganti `capText()` dengan subtitle 2 baris Inter.
- [ ] Pastikan 30 fps dan total 3.600 frame.
- [ ] Render di komputer produksi, bukan Raspberry Pi GARAP; tidak mengubah aplikasi, firmware, MQTT, atau GARAP-INFOGRAPHICS.

**Pratinjau (sebelum render penuh)**
- [ ] Still adegan 1, 4c, 6c, 8d, 9d: cek karakter, warna, keterbacaan, margin 5%, subtitle tidak menutupi tangan/sensor/tombol.
- [ ] Cek kontinuitas: tangan menyentuh benda, kaki tidak meluncur, posisi alat sama antaradegan, aliran cairan searah.
- [ ] Cek transisi: subtitle tidak bertumpuk.
- [ ] Hasil akhir disebut MP4 final hanya setelah file `.mp4` 1920×1080, 30 fps, ±120 dtk benar-benar ada dan diputar ulang.
