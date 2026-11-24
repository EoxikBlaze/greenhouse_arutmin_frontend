# Naskah & Storyboard — Video Stickman Edukatif GARAP (2 menit, landscape)

Status: **rencana produksi v2, belum ada audio, belum ada render.** Dokumen ini bukan MP4 dan bukan hasil sinkronisasi final.
Revisi: 25 Nov 2026 — memakai jawaban pemilik, *Buku Pedoman Sistem GARAP v1.0* (24 Nov 2026, firmware v6.4.0), gambar panel, dan tampilan garap.net (dibaca saja).

Sumber utama per topik:
| Topik | Sumber |
|---|---|
| Prinsip kerja, mode alat, logika dosing, keselamatan, lampu, kalibrasi, perpipaan, rutinitas | Buku Pedoman v1.0 (Bab 4, 7.5, 8, 11, 13–16, 36–40, 43) |
| Nama menu & tombol | garap.net: Dashboard, Kalibrasi, Otomasi Alat; Buku Pedoman Bab 30–32 |
| SOP semai melon | `backend-nodejs/src/aiMelonModul.js` (tidak ada di Buku Pedoman) |
| Palet & font | `DESIGN.md` |
| Bentuk panel | Gambar 3D panel + tata letak isi box (lampiran pemilik) |

---

## 1. Analisis skill & pendekatan

| Hal | Temuan |
|---|---|
| Nama | `stick-figure` (lokal: `~/.claude/skills/stick-figure`), kit suara di `~/.claude/animation-skills/kit`. |
| Keluaran | **MP4 sungguhan**: Canvas (`shots.js`, `chars.js`, `env.js`) → render headless (`tools/render.js`) → `make.sh` + ffmpeg. Ada mode `stills` untuk cek bingkai. |
| Orientasi | **Vertikal 1080×1920 terkunci di kode** (`render.js`, vinyet `main.js`, pita caption y 1250–1420). Landscape perlu modifikasi pada salinan reel. |
| Durasi | Dirancang 30–45 dtk. 120 dtk = ±37 shot; bisa, tapi beban gambar ±3× contoh. |
| Frame rate | Belum diverifikasi di kode. Target 30 fps. |
| Karakter | Rig `drawStick` (kepala putih besar, wajah, IK lengan, topi) cocok. Properti bawaan bertema bajak laut → semua properti GARAP dibuat baru (`env2.js`). |
| Suara | Kokoro `lang="en-us"`, **tidak ada suara Indonesia**. ElevenLabs multibahasa perlu kunci API berbayar. |
| Penyelarasan kata | Parakeet TDT 0.6B v2 = ASR bahasa Inggris → tidak andal untuk Indonesia. |
| Subtitle | `capText()` = 1–2 kata huruf kecil → harus diganti subtitle 2 baris. |
| Musik & SFX | Disintesis di `audio.py`, dengan ducking. Sesuai. |

Tiga repo GitHub pembanding **tidak dibuka**.

**Pendekatan**: salin template `stick-figure` ke folder reel baru → ubah ke 1920×1080 → **narasi direkam penutur Indonesia** → tandai waktu per kalimat dari rekaman → timing ulang `shots.js` → render di komputer produksi (bukan Raspberry Pi GARAP).

---

## 2. Konsep visual

- **Dunia**: greenhouse melon terang, garis tinta tebal, bayangan kontak lembut.
- **Tata letak instalasi (tetap di semua adegan)**: penampung di tengah; **panel GARAP** berdiri di kiri penampung (box abu-abu di atas rangka kaki, sesuai gambar 3D); talang meja melon di kanan belakang; meja semai & meja kalibrasi di kiri jauh. Ini susunan untuk video, bukan denah nyata.
- **Panel** (dari gambar): pintu box tertutup saat adegan biasa. Di pintu: 3 lampu pilot (**merah, kuning, biru**), tombol jamur merah **E-STOP**, tombol hijau **RESET**, layar LCD. Kabel keluar dari gland di dinding bawah. **Isi box (220 V, PSU, relay) tidak diperlihatkan terbuka** dan tidak disentuh tangan.
- **Aliran larutan** (Buku Pedoman Bab 8): loop tertutup penampung → pompa sirkulasi → talang → kembali ke penampung. Pompa sirkulasi & aerator menyala terus dan **tidak diatur GARAP**. Yang diatur GARAP: **pompa dosing A, B, pH up, pH down, dan pompa isi air**.
- **Jalur sensor**: air diambil dari sambungan T setelah pompa sirkulasi, melewati probe EC & suhu, lalu pH, kembali ke penampung.
- **Titik suntik dosing**: di bagian berarus kencang dekat aliran balik; A dan B lewat selang terpisah; pH up/down di titik terpisah dari A/B. Digambar sederhana.
- **Operator**: topi caping, kaus hijau hutan `#2D452F`, handuk di bahu.
- **Pemandu**: rompi navy `#0A1F38` dengan strip emas `#E9CD53`, membawa tablet.
- **Palet** (DESIGN.md): navy `#0A1F38`, hijau pucat `#F4F7F2`, hijau hutan `#2D452F`→`#4C6A4B`, moss `#6B9D4A`, emas `#E9CD53` (hanya di atas navy), merah `#C0392B`, kuning `#E0A42B`. Lampu pilot memakai merah/kuning/biru sesuai alat.
- **Tipografi**: Space Grotesk (judul) + Inter (subtitle). File font perlu disiapkan.
- **Identitas**: wordmark teks **GARAP** + "Greenhouse Automation & Research Arutmin–Politala". garap.net memakai emblem Vertonik Smart Farm & nama PT Arutmin Indonesia. Emblem itu baru dipakai bila ada izin dan berkas resminya.
- **Layar 1920×1080**: margin 5% (x 96–1824, y 54–1026). Zona aksi y 54–840. **Pita subtitle y 880–1010**: kotak navy 80%, Inter SemiBold 44 px putih, maks 2 baris × ±42 karakter.

---

## 3. Naskah narasi (siap rekam)

Gaya baca tenang dan ramah. "pH" = *pe-ha*, "EC" = *e-se*, "E-STOP" = *i-stop*, "ppm" = *pe-pe-em*.

| Adegan | Waktu target | Narasi | Kata |
|---|---|---|---|
| 1 | 00:00–00:08 | Petani melon perlu tahu setiap hari: airnya pas? Nutrisinya cukup? Bagaimana memantaunya lebih mudah? | 14 |
| 2 | 00:08–00:18 | Kenalkan GARAP. GARAP membantu memantau kondisi air dan tanaman, lalu mengelola penambahan nutrisi sesuai pengaturan dan izin sistem. | 18 |
| 3 | 00:18–00:30 | Sensor membaca pH, tingkat keasaman air, dan EC, petunjuk kepekatan nutrisi. Server memeriksanya, website menampilkannya. Alat mengatur pompa dosing dan pompa isi air. | 23 |
| 4 | 00:30–00:45 | Sebelum dipakai, sensor dikalibrasi dalam mode pemeliharaan. Kalibrasi menyelaraskan hasil sensor dengan cairan acuan yang nilainya sudah diketahui. Celup, tunggu tenang, tekan Ukur, lalu Simpan. Bilas, ulangi titik kedua. | 29 |
| 5 | 00:45–00:57 | Lalu, alat diuji. Kalibrasi menyetel pembacaan; pengujian memeriksa hasil dan fungsinya. Bandingkan dengan alat ukur genggam, uji pompa dengan air ke gelas ukur, lalu catat. | 25 |
| 6 | 00:57–01:14 | Semai melon mengikuti SOP lapangan GARAP. Rendam benih di air ekstrak bawang merah satu hari. Pakai yang tenggelam. Peram dua hari di kain hitam lembap. Jemur sinar pagi dua hari sambil dijaga lembap, baru pindah ke rockwool. | 37 |
| 7 | 01:14–01:24 | Saat Mulai Semai, website mengirim target ppm dan pH ke alat. Di tab Nutrisi, ppm nyata dibandingkan dengan rencana target. Target bukan bacaan. | 23 |
| 8 | 01:24–01:42 | Dosing artinya menambah cairan secara terukur. Nutrisi rendah tidak langsung menyalakan pompa. Syaratnya: mode semai, saklar otomasi menyala, bacaan tenang. Pompa A, jeda, lalu B. Lalu alat menunggu larutan tercampur sebelum membaca ulang. | 33 |
| 9 | 01:42–01:53 | Setiap hari, cek lampu, dashboard, tinggi air, botol nutrisi, dan selang. Ada peringatan? Cari penyebabnya dulu. Darurat? Tekan E-STOP di panel. | 21 |
| 10 | 01:53–02:00 | Bersama GARAP: kalibrasi, uji, semai, atur, dan pantau. | 8 |
| | | **Total** | **231** |

**Estimasi (bukan hasil ukur)**: 2,0–2,2 kata/dtk → narasi ±103–114 dtk, sisa ±6–17 dtk untuk jeda & ekor musik. Adegan 6 paling padat (±2,2 kata/dtk), disusul 4, 5, 8 (±1,9–2,1). Durasi wajib diukur dari rekaman; bila lewat slot, ringkas kalimat, jangan percepat suara.

Cadangan ringkasan:
- Adegan 4: hapus "Bilas, ulangi titik kedua." (tetap tampil sebagai label).
- Adegan 6: hapus "Pakai yang tenggelam." (tetap tampil sebagai label uji apung).
- Adegan 8: hapus "Pompa A, jeda, lalu B." (tetap tampil di diagram).

---

## 4. Storyboard (total 120,0 dtk = 3.600 frame @30 fps)

**OP** = operator, **PM** = pemandu. Subtitle di pita bawah mengikuti kalimat narasi; kolom "Teks layar" berisi label di zona aksi.

### Adegan 1 — Masalah pembuka (00:00–00:08)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 1a | 00:00–00:03 | "Petani melon perlu tahu setiap hari: airnya pas?" | OP jongkok di tepi penampung, menciduk air ke gelas, mengangkatnya ke mata (penasaran). | Air di gelas bergoyang lalu diam. | Wide greenhouse, push-in pelan. Aksi sudah berjalan di frame 1. | — | ciduk air |
| 1b | 00:03–00:05.5 | "Nutrisinya cukup?" | OP berjalan 3 langkah ke talang, mengangkat daun melon. | Daun terangkat lalu kembali. | Medium, kamera ikut langkah. | — | langkah, gesek daun |
| 1c | 00:05.5–00:08 | "Bagaimana memantaunya lebih mudah?" | OP membuka buku catatan, menggaruk kepala. | Halaman penuh coretan. | Medium close, diam. | "?" | kertas dibalik |

### Adegan 2 — Perkenalan GARAP (00:08–00:18)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 2a | 00:08–00:11 | "Kenalkan GARAP." | OP menoleh ke kiri. | Instalasi utuh: panel, penampung, talang. Lampu **biru** menyala tetap. | Pan pelan ke instalasi, berhenti dengan panel di sepertiga kiri. | — | musik masuk lembut |
| 2b | 00:11–00:15 | "GARAP membantu memantau kondisi air dan tanaman," | PM masuk dari kanan (antisipasi–langkah–berhenti), menunjuk panel. | — | Wide statis. | **GARAP** muncul 00:12–00:17; di bawahnya "Greenhouse Automation & Research Arutmin–Politala" | pop lembut |
| 2c | 00:15–00:18 | "lalu mengelola penambahan nutrisi sesuai pengaturan dan izin sistem." | OP berdiri di samping PM, mengangguk. | Ikon gir (pengaturan) + saklar (izin) di samping panel. | Medium two-shot, diam. | "Pantau • Kelola sesuai izin" | klik UI |

### Adegan 3 — Kenali bagiannya (00:18–00:30)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 3a | 00:18–00:22 | "Sensor membaca pH, tingkat keasaman air, dan EC, petunjuk kepekatan nutrisi." | PM menunjuk jalur sensor (jari tidak menembus pipa). | Air mengalir pelan dari sambungan T melewati probe EC & suhu, lalu pH, kembali ke penampung. | Close-up jalur sensor, diam. | "pH = keasaman" / "EC = kepekatan nutrisi" | ting ×2 |
| 3b | 00:22–00:24 | (lanjutan) | — | Ikon kecil: suhu air, suhu & kelembapan udara, pelampung bawah/atas. | Slide pelan ke kanan. | "Suhu • Kelembapan • Tinggi air" | — |
| 3c | 00:24–00:27 | "Server memeriksanya, website menampilkannya." | — | Diagram: **Alat membaca → Server memeriksa → Website menampilkan**; titik data mengalir. | Diam. | Tiga kotak tersebut | aliran halus |
| 3d | 00:27–00:30 | "Alat mengatur pompa dosing dan pompa isi air." | PM menunjuk deret 4 pompa kecil, lalu pompa isi. | Label pompa A, B, pH up, pH down, isi air. Pompa sirkulasi di latar, abu-abu, tanpa label GARAP. Tidak ada pompa menyala. | Medium, diam. | "Pompa dosing: A • B • pH up • pH down" / "Pompa isi air" | — |

### Adegan 4 — Kalibrasi (00:30–00:45)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 4a | 00:30–00:34 | "Sebelum dipakai, sensor dikalibrasi dalam mode pemeliharaan." | OP mengetuk tablet. | Lampu panel berganti **kuning berkedip** (pemeliharaan). Di meja: botol **pH 4,01**, **pH 6,86**, **EC 1,413 mS/cm**, **EC 12,88 mS/cm**. | Medium meja kalibrasi + panel di latar, push-in pelan. | Judul "Kalibrasi"; tombol "Aktifkan pemeliharaan" | klik UI |
| 4b | 00:34–00:38 | "Kalibrasi menyelaraskan hasil sensor dengan cairan acuan yang nilainya sudah diketahui." | OP memegang probe pH, mencelupnya ke botol **pH 4,01**. PM menjelaskan. | Probe terendam. | Close-up tangan & botol, diam. | "Titik 1: pH 4,01" | celup |
| 4c | 00:38–00:42 | "Celup, tunggu tenang, tekan Ukur, lalu Simpan." | OP menunggu (memeriksa), lalu mengetuk tablet dua kali. | Bacaan di tablet bergoyang beberapa kali, lalu tenang. **Tanpa angka hasil.** Tombol **Ukur** lalu **Simpan** tersorot bergantian. | Close-up tablet + botol dalam satu frame, diam. | "Ukur → Simpan" | klik ×2 |
| 4d | 00:42–00:45 | "Bilas, ulangi titik kedua." | OP membilas probe di gelas air bersih, mengangkat botol **pH 6,86**. | Ceklis kecil di botol 4,01. Botol EC menunggu giliran. | Medium, diam. | "Titik 2: pH 6,86 • lalu EC 1,413 → 12,88" | air menetes |

Urutan sesuai Buku Pedoman Bab 36: pH 4,01 → 6,86, lalu EC 1,413 mS/cm (1413 µS/cm) → 12,88 mS/cm, bilas di antara larutan.

### Adegan 5 — Uji Alat & Validasi (00:45–00:57)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 5a | 00:45–00:49 | "Lalu, alat diuji. Kalibrasi menyetel pembacaan; pengujian memeriksa hasil dan fungsinya." | PM berdiri di samping papan dua kolom. | Kolom kiri "Kalibrasi: menyetel", kanan "Uji: memeriksa". | Medium, diam. | Judul **"Uji Alat & Validasi"** | pop judul |
| 5b | 00:49–00:53 | "Bandingkan dengan alat ukur genggam, uji pompa dengan air ke gelas ukur," | OP mencelup alat ukur genggam di sebelah jalur sensor, lalu memegang gelas ukur di ujung selang dosing. | Dua layar kecil bersebelahan dengan tanda "≈" (tanpa angka). Pompa menyala sebentar, lampu **biru berkedip cepat**, air bersih mengisi gelas, lalu berhenti. | Close-up, diam. | "Air bersih dulu, bukan nutrisi" | dengung pompa pendek |
| 5c | 00:53–00:57 | "lalu catat." | OP menulis di lembar uji; PM mengangguk. | Item diberi centang saat ditulis. **Tidak ada stempel LULUS.** | Medium, diam. | "Catat hasil uji" | pensil |

### Adegan 6 — Mulai semai melon (00:57–01:14)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 6a | 00:57–01:00.5 | "Semai melon mengikuti SOP lapangan GARAP. Rendam benih di air ekstrak bawang merah satu hari." | OP menuang benih ke wadah terbuka berisi air bawang merah. | Sebagian benih tenggelam perlahan, sebagian tetap mengambang; kalender kecil di pojok kanan atas. | Medium area semai, push-in. | "Semai Melon — SOP lapangan GARAP"; "Rendam • 1 hari" | tuang biji |
| 6b | 01:00.5–01:02.5 | "Pakai yang tenggelam." | OP menyendok benih yang mengambang ke wadah kecil terpisah, lalu meniriskan benih yang tenggelam. | Wadah kiri: benih tenggelam (dipakai). Wadah kanan: benih mengambang (disisihkan). | Close-up wadah dari samping (potongan air terlihat), diam. | "Uji apung: pakai yang tenggelam"; "Praktik SOP, bukan jaminan tumbuh" | sendok air |
| 6c | 01:02.5–01:05.5 | "Peram dua hari di kain hitam lembap." | OP membilas benih terpilih, membungkusnya dengan kain hitam lembap, menaruhnya di tempat teduh. | Kalender dibalik 2 lembar; latar meredup. | Medium, cut ke tempat teduh. | "Peram kain hitam • 2 hari" | kalender ×2 |
| 6d | 01:05.5–01:10 | "Jemur sinar pagi dua hari sambil dijaga lembap," | OP membuka kain, menyemprot kabut air; matahari rendah. | Kalender dibalik 2 lembar; kecambah **panjangnya berbeda**, sebagian belum pecah. | Close-up kain, diam. | "Sinar pagi • 2 hari • jaga lembap"; "Pertumbuhan bisa berbeda" | semprot |
| 6e | 01:10–01:14 | "baru pindah ke rockwool." | OP menaruh kecambah di lubang rockwool dengan dua jari. | Baris rockwool terisi satu per satu. | Close-up, lalu tarik ke medium. | "Pindah ke rockwool"; "Nutrisi awal 400–600 PPM saat pindah" | letak lembut |

### Adegan 7 — Pengaturan & pembacaan (01:14–01:24)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 7a | 01:14–01:18 | "Saat Mulai Semai, website mengirim target ppm dan pH ke alat." | OP mengetuk tombol **Mulai Semai** di ponsel (menu Kebun Saya). | Amplop data terbang dari ponsel ke panel; LCD berganti ke "SEMAI". | Close-up ponsel → whip ke panel. | "Kebun Saya → Mulai Semai"; "Ilustrasi tampilan" | kirim data |
| 7b | 01:18–01:24 | "Di tab Nutrisi, ppm nyata dibandingkan dengan rencana target. Target bukan bacaan." | OP melihat ponsel, lalu menoleh ke jalur sensor. | Grafik dua garis: **ppm nyata** (garis penuh, dari sensor) dan **rencana target** (garis putus-putus). Tanpa angka. Garis putus-putus penghubung ke probe. | Close-up ponsel, dolly ke jalur sensor, lalu diam. | "ppm nyata ↔ rencana target"; "Ilustrasi tampilan" | — |

### Adegan 8 — Bagaimana dosing bekerja? (01:24–01:42)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 8a | 01:24–01:28 | "Dosing artinya menambah cairan secara terukur." | PM di samping diagram, menunjuk langkah 1. | Diagram 5 langkah: **Bacaan diperiksa → Syarat & izin → Tambah terukur → Tunggu tercampur → Baca ulang**. | Diagram potongan sederhana, diam. | Judul "Bagaimana dosing bekerja?" | pop judul |
| 8b | 01:28–01:31 | "Nutrisi rendah tidak langsung menyalakan pompa." | OP mengangkat tangan ke arah pompa; PM menahan dengan isyarat telapak (waspada). | Pompa tetap diam. | Diam. | "Rendah ≠ langsung pompa" | — |
| 8c | 01:31–01:35 | "Syaratnya: mode semai, saklar otomasi menyala, bacaan tenang." | PM menunjuk tiga lampu cek satu per satu. | Tiga cek menyala: "Mode SEMAI", "Saklar Otomasi Alat ON", "Bacaan tenang". | Close-up diagram, diam. | Tiga label cek | tik ×3 |
| 8d | 01:35–01:38 | "Pompa A, jeda, lalu B." | — | Label tetap: **"Ilustrasi setelah izin operasional"**. Pompa A menyala singkat (biru berkedip cepat) lalu mati → ikon jam jeda → pompa B singkat lalu mati. Tidak pernah dua pompa menyala bersamaan. Tetes masuk di titik suntik dekat aliran balik. | Diam. | "A → jeda → B" | dengung pendek ×2 |
| 8e | 01:38–01:42 | "Lalu alat menunggu larutan tercampur sebelum membaca ulang." | OP mengamati talang. | Larutan berputar lewat loop sirkulasi; ikon jam "waktu monitoring"; sensor membaca ulang; panah kembali ke langkah 1. | Wide diagram loop, diam. | "Tunggu tercampur → baca ulang" | aliran halus |

Catatan: diagram tidak menampilkan mL, durasi, atau volume penampung.

### Adegan 9 — Pemantauan & gangguan (01:42–01:53)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 9a | 01:42–01:45 | "Setiap hari, cek lampu, dashboard," | OP melihat panel, lalu ponsel. | Lampu **biru tetap** (normal); ponsel menampilkan "Alat terhubung". | Medium, diam. | Checklist kiri: "Lampu • Dashboard" | tik |
| 9b | 01:45–01:48 | "tinggi air, botol nutrisi, dan selang." | OP melongok ke penampung, menggoyang botol A/B, menelusuri selang dengan jari. | Centang bertambah satu per satu. | Medium, kamera ikut OP. | "Tinggi air • Botol • Selang" | goyang botol |
| 9c | 01:48–01:50.5 | "Ada peringatan? Cari penyebabnya dulu." | OP berhenti, wajah waspada, memeriksa selang. | Lampu **kuning**; ponsel menampilkan contoh peringatan (segitiga kuning). | Close-up ponsel + panel, diam. | "Periksa penyebab sebelum lanjut"; "Ilustrasi tampilan" | chime lembut (bukan alarm) |
| 9d | 01:50.5–01:53 | "Darurat? Tekan E-STOP di panel." | PM menunjuk tombol jamur merah; OP memperhatikan. | E-STOP tersorot; tidak ditekan. | Close-up pintu panel, diam. | "E-STOP: hentikan listrik pompa saat darurat" | — |

### Adegan 10 — Penutup (01:53–02:00)
| Shot | Waktu | Narasi | Tindakan karakter | Perubahan benda/alat | Kamera & komposisi | Teks layar | SFX |
|---|---|---|---|---|---|---|---|
| 10a | 01:53–01:57 | "Bersama GARAP: kalibrasi, uji, semai, atur, dan pantau." | OP & PM berdampingan, OP mengacungkan jempol. | Lampu biru tetap. | Wide, pull-back pelan. | Lima kata muncul bertahap | pop ×5 lembut |
| 10b | 01:57–02:00 | (musik) | Diam, napas ringan. | — | Wide diam. | **GARAP** + "Greenhouse Automation & Research Arutmin–Politala" | akor penutup |

**Cek total:** 8 + 10 + 12 + 15 + 12 + 17 + 10 + 18 + 11 + 7 = **120 dtk**.

---

## 5. Daftar aset

**Karakter**: OP (caping, kaus hijau hutan, handuk), PM (rompi navy-emas, tablet). Ekspresi: penasaran, bingung, memahami, memeriksa, waspada.

**Properti (`env2.js`)**:
- Panel GARAP tertutup di atas rangka kaki: 3 lampu (merah, kuning, biru) dengan status tetap & kedip, E-STOP jamur merah, RESET hijau, LCD, gland kabel di bawah.
- Penampung; loop sirkulasi (pompa sirkulasi & aerator, abu-abu); talang melon; jalur sensor dengan sambungan T dan probe EC, suhu, pH; pelampung bawah/atas; sensor udara.
- 4 pompa dosing kecil + botol A, B, pH up, pH down dengan selang terpisah dan titik suntik; pompa isi air.
- Meja kalibrasi: 4 botol berlabel, gelas bilas, alat ukur genggam, gelas ukur.
- Ponsel/tablet: tombol Aktifkan pemeliharaan, Ukur, Simpan, Mulai Semai, grafik ppm nyata vs rencana target, contoh peringatan. Semua diberi label "Ilustrasi tampilan" bila tidak persis sama dengan web.
- Semai: wadah rendam, bawang merah, kain hitam, penyemprot, kalender, nampan rockwool, kecambah beragam panjang.
- Diagram alur data, diagram dosing 5 langkah, diagram loop sirkulasi.

**Tipografi & grafis**: Space Grotesk + Inter (OFL), kotak subtitle, wordmark GARAP.

**Audio**: rekaman narasi Indonesia (WAV 48 kHz), musik instrumental ringan, SFX lembut tanpa alarm.

---

## 6. Status fakta

### Sudah dikonfirmasi
1. Nama: **Greenhouse Automation & Research Arutmin–Politala** (pemilik).
2. pH **4,01 → 6,86**, tanpa 9,18 (pemilik; Buku Pedoman Bab 15/36; garap.net).
3. EC dua titik **1,413 mS/cm → 12,88 mS/cm**, titik 0 air baku opsional (Buku Pedoman; garap.net).
4. Langkah kalibrasi: Aktifkan pemeliharaan → celup → tunggu tenang → **Ukur** → **Simpan** → bilas → titik 2 (garap.net & Bab 15).
5. Pompa yang diatur GARAP: dosing A, B, pH up, pH down + isi air (pemilik). Pompa sirkulasi & aerator menyala terus di luar kendali alat (Bab 8).
6. Lampu (Bab 7.5): **biru** tetap = normal, kedip cepat = dosing/uji pompa, kedip lambat = isi air/encer; **kuning** tetap = perlu dicek, kedip = pemeliharaan; **merah** tetap = E-STOP/menunggu RESET, kedip = kerusakan. Hanya satu lampu menyala.
7. E-STOP fisik memutus V+ aktuator (listrik pompa) secara fisik; E-STOP dari web hanya perintah program dan tidak memutus 12 V (Bab 7.5; garap.net Otomasi Alat).
8. Dosing diputuskan **alat** saat mode SEMAI, dengan saklar Otomasi Alat, bacaan stabil, waktu monitoring habis, tanpa kunci; A → jeda → B; satu pompa satu waktu; lalu menunggu satu waktu monitoring (Bab 4, 13). Web tidak punya dosing manual (garap.net).
9. Menu nyata: Dashboard ("Alat terhubung"), Kebun Saya → Mulai Semai, Sensor → tab Nutrisi (ppm nyata vs rencana target), Peringatan, Kalibrasi, Otomasi Alat.
10. Uji pertama: air saja, selang dosing ke gelas, cocokkan mL; jangan pakai nutrisi sungguhan sebelum cocok (Bab 36).
11. Rutinitas harian: LCD & lampu, Dashboard & Peringatan, tinggi air, botol nutrisi & pH, pipa luber (Bab 38).
12. Pompa sirkulasi tetap tampil di latar, abu-abu, tanpa label GARAP (pemilik, 25 Nov 2026).
13. SOP semai lapangan masih berlaku: rendam air bawang merah 1 hari → kain hitam 2 hari → jemur pagi 2 hari → rockwool (pemilik, 25 Nov 2026; `aiMelonModul.js`).
14. Nutrisi awal 400–600 PPM diberikan saat pindah ke rockwool (pemilik, 25 Nov 2026).
15. Seleksi uji apung dimasukkan (benih tenggelam dipakai, mengambang disisihkan) sebagai praktik SOP, bukan jaminan tumbuh (pemilik, 25 Nov 2026).
16. Status dosing cukup ditandai label "Ilustrasi setelah izin operasional"; tanpa kalimat status nilai uji di video (pemilik, 25 Nov 2026).

### Masih perlu konfirmasi
1. [PERLU KONFIRMASI: posisi LCD, lampu, E-STOP, dan RESET di pintu panel versi sekarang. Gambar 3D adalah rancangan awal.]
2. [PERLU KONFIRMASI: izin memakai emblem Vertonik Smart Farm / nama PT Arutmin Indonesia / Politala di video, dan berkas resminya.]
3. [PERLU KONFIRMASI: palet DESIGN.md boleh dipakai sebagai identitas video?]
4. [PERLU KONFIRMASI: fps & penanganan 1920×1080 di mesin setelah dimodifikasi (teknis, dicek saat produksi).]

Catatan `EKSEKUSI_DIIZINKAN = false` (`gerbangDosis.js`): gerbang di server, tidak diubah. Menurut keputusan 17 Nov, server memang tidak pernah mengirim DOSIS; dosing hanya diputuskan alat saat SEMAI. Narasi tidak menyebut gerbang ini.

Tidak dimasukkan ke video: kapasitas penampung, mL/durasi dosing, target ppm per umur, nilai hasil kalibrasi, hasil uji.

---

## 7. Checklist sebelum produksi

**Isi**
- [ ] Butir "Masih perlu konfirmasi" dijawab; teks disesuaikan.
- [ ] Layar yang tidak persis sama dengan garap.net diberi label "Ilustrasi tampilan".
- [ ] Label "Ilustrasi setelah izin operasional" di semua shot pompa dosing menyala (8d).
- [ ] Tidak ada stempel LULUS, angka hasil kalibrasi, kapasitas penampung, atau volume dosing.
- [ ] Isi box panel (220 V) tidak diperlihatkan terbuka.
- [ ] Penutup tanpa klaim panen pasti berhasil / alat bebas pengawasan.

**Audio**
- [ ] Narasi direkam penutur Indonesia (atau TTS Indonesia yang sudah diuji); Kokoro bawaan tidak dipakai.
- [ ] Durasi rekaman diukur per adegan; total ≤ 120 dtk tanpa mempercepat suara.
- [ ] Waktu tiap kalimat ditandai; `shots.js` ditiming ulang dari rekaman nyata.
- [ ] Musik & SFX di bawah narasi; tanpa alarm dekoratif.

**Teknis**
- [ ] Salin template ke folder reel baru; skill asli tidak diubah.
- [ ] Viewport 1920×1080, W/H & vinyet `main.js`, subtitle 2 baris Inter.
- [ ] 30 fps, 3.600 frame.
- [ ] Render di komputer produksi, bukan Raspberry Pi GARAP; aplikasi, firmware, MQTT, dan GARAP-INFOGRAPHICS tidak diubah.

**Pratinjau**
- [ ] Still 1a, 4c, 6c, 8d, 9d: karakter, warna, keterbacaan, margin 5%, subtitle tidak menutupi tangan/sensor/tombol.
- [ ] Kontinuitas: tangan menyentuh benda, kaki tidak meluncur, posisi panel & penampung sama, lampu sesuai arti, aliran searah loop.
- [ ] Subtitle tidak bertumpuk di transisi.
- [ ] Disebut MP4 final hanya setelah file `.mp4` 1920×1080, 30 fps, ±120 dtk ada dan sudah diputar ulang.
