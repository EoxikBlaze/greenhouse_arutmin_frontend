# Preset nutrisi — Melon, Selada, Daun Bawang, Bayam

Preset dosing (halaman **Dosing Otomatis → Preset nutrisi**) untuk empat tanaman, per tahap GARAP.
Target penampung bermode *Otomatis* = titik tengah rentang. Dibuat 25 Okt 2026 dari riset pustaka;
**angka ini titik awal**, bukan resep pasti — sesuaikan setelah melihat respons tanaman di greenhouse.

- ppm memakai **faktor 500** (ppm = EC mS/cm × 500), sama dengan `konfigurasi_dosis.faktor_ppm_per_ec`
  dan firmware sensor. Meter berfaktor 700 akan menunjukkan angka ±1,4× lebih tinggi.
- Tahap GARAP: **Semai** = bibit/persemaian, **Peremajaan** = bibit pindah tanam/vegetatif awal,
  **Pendewasaan** = vegetatif penuh sampai panen (melon: pembungaan & pembuahan).

| Tanaman | Tahap | Durasi (hari) | EC (mS/cm) | ppm (×500) | pH |
|---|---|---|---|---|---|
| Selada | Semai | 7 | 0,8–1,0 | 400–500 | 5,8–6,2 |
| | Peremajaan | 14 | 1,0–1,4 | 500–700 | 5,8–6,5 |
| | Pendewasaan | 21 | 1,2–1,8 | 600–900 | 6,0–6,5 |
| Bayam | Semai | 7 | 1,0–1,4 | 500–700 | 6,0–6,5 |
| | Peremajaan | 10 | 1,6–2,0 | 800–1000 | 6,0–6,8 |
| | Pendewasaan | 14 | 1,8–2,3 | 900–1150 | 6,0–6,8 |
| Daun Bawang | Semai | 14 | 0,7–1,1 | 350–550 | 5,5–6,2 |
| | Peremajaan | 21 | 1,0–1,4 | 500–700 | 5,5–6,5 |
| | Pendewasaan | 30 | 1,4–1,8 | 700–900 | 5,8–6,5 |
| Melon | Semai | 10 | 1,0–1,5 | 500–750 | 5,8–6,3 |
| | Peremajaan | 21 | 1,8–2,2 | 900–1100 | 5,8–6,3 |
| | Pendewasaan | 50 | 2,0–2,5 | 1000–1250 | 5,8–6,3 |

## Dasar tiap tanaman

- **Selada** — OSU Extension: EC 1,2–1,8 mS/cm, pH 6,0–7,0 (dewasa). Bibit 0,8–1,0 mS/cm (Bright Lane
  Gardens); daun 0,8–1,6 mS/cm / 400–800 ppm (Rise Gardens). pH dibatasi ≤ 6,5 agar besi tetap tersedia.
- **Bayam** — panduan NFT bertahap: bibit 1,0–1,4, vegetatif 1,6–2,0, dewasa 1,8–2,3 mS/cm; OSU 1,8–2,3
  mS/cm dengan pH 6,0–7,0.
- **Daun bawang** — pustaka paling sedikit dan paling beragam. Kebanyakan panduan: pH 5,5–6,5, EC naik dari
  ±1,0–1,2 (minggu ke-2) ke 1,4–1,8 mS/cm saat dewasa; satu tabel bertahap memberi bibit 0,7–1,1 mS/cm.
  Truleaf mengingatkan tidak ada angka tunggal yang didukung kuat — pantau ujung daun (terbakar = EC terlalu tinggi).
- **Melon** — studi Korea (media sabut, larutan Yamazaki): EC 1,8 / 2,0 / 2,3 dS/m untuk tahap awal / tengah /
  akhir; studi Nature 2026 (melon jaring hidroponik): 1,8–2,1 dS/m pada pH 6,0; studi empat sistem hidroponik:
  ±2,5 mS/cm. Bibit dimulai rendah (1,0–1,5) agar akar muda tidak rusak. Studi Polinela/Polije memakai EC 3–5
  mS/cm untuk pertumbuhan — lebih tinggi dari preset ini; naikkan bertahap hanya bila tanaman sehat.

## Yang perlu diperhatikan sebelum dipakai

1. **Ambang alert TDS saat ini 50–1000 ppm** (halaman Ambang Sensor). Bayam dewasa (s.d. 1150) dan melon
   (s.d. 1250) akan memicu alert "di luar batas" walau sesuai preset. Ambang berlaku global, bukan per meja —
   naikkan batas atas TDS (mis. 1300) bila menanam melon/bayam.
2. **Satu penampung = satu tanaman.** Preset dipilih dari batch yang berjalan di meja itu; jangan mencampur
   melon dan selada di satu penampung.
3. Durasi tahap adalah perkiraan (melon ±80 hari sejak semai, bayam ±30, selada ±42, daun bawang ±65) dan
   menentukan label "Siap dipindah" — ubah di **Durasi Siklus** bila varietas berbeda.

## Sumber

- [OSU Extension — Electrical Conductivity and pH Guide for Hydroponics](https://extension.okstate.edu/fact-sheets/electrical-conductivity-and-ph-guide-for-hydroponics)
- [Rise Gardens — Nutrient solution EC levels for different plants](https://risegardens.com/blogs/communitygarden/nutrient-solution-ec-levels-for-different-plants)
- [Bright Lane Gardens — What is EC in hydroponics](https://brightlanegardens.com/best-hydroponic-ec-meter/)
- [SARE — Leafy Greens Hydroponic (2022)](https://projects.sare.org/media/pdf/L/e/a/Leafy-Greens-Hydroponic-publication2022.pdf)
- [Truleaf — How to grow green onions hydroponically](https://truleaf.org/insights/hydroponic-green-onions-guide)
- [Hydroponicsup — Hydroponic green onions](https://hydroponicsup.com/hydroponic-cultivation/vegetables/green-onions/)
- [Scientific Reports 2026 — Hydroponic netted melon cultivation strategies](https://www.nature.com/articles/s41598-026-36171-4)
- [ResearchGate — Melon production using four hydroponic systems](https://www.researchgate.net/publication/283034211_Melon_production_using_four_hydroponic_systems)
- [Polinela — Pengaruh EC larutan nutrisi terhadap pertumbuhan melon](https://jurnal.polinela.ac.id/index.php/PROSIDING/article/view/1168)
- [Polije — EC melon di smart greenhouse](https://sipora.polije.ac.id/7356/)
- [NT Hydroponics — Hydroponic melon cultivation](https://nthydroponics.ca/blogs/learn/hydroponic-melon-cultivation-grow-sweet-juicy-melons-with-precision-farming)
