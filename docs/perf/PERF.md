# Catatan performa web (CPU 20x)

Diukur dengan Chrome headless + CPU throttling 20x, build produksi (`vite preview`), konteks tanpa ekstensi,
login admin, jendela rekam = load + 4 dtk (baseline: 40 dtk karena FCP-nya lebih lambat dari jendela).
Cara ulang: `npm i puppeteer-core` di folder bebas, lalu `ADMIN_PASSWORD=... node docs/perf/ukur.mjs http://127.0.0.1:4173 ./trace`
dan `python docs/perf/analisis-trace.py ./trace hasil.json`.

## Hasil (baseline `dev` abef4c6 → `perf/optimasi`)
| Rute | FCP dtk | TBT dtk | Long task |
|---|---|---|---|
| dashboard | 20,1 → 3,9 | 25,8 → 6,8 | 50 → 9 |
| saklar | 21,2 → 2,8 | 26,1 → 5,5 | 56 → 9 |
| peringatan | 18,2 → 2,9 | 33,6 → 5,4 | 75 → 10 |
| tanam | 20,9 → 2,8 | 23,7 → 5,6 | 44 → 9 |
| laporan | 14,6 → 2,9 | 17,2 → 5,9 | 37 → 7 |
| ambang | 17,3 → 2,9 | 17,1 → 5,9 | 37 → 6 |
| profil | 19,8 → 3,2 | 22,0 → 5,9 | 36 → 7 |
| Tentang (`/`) | 20,3 → 2,8 | 39,2 → 2,9 | 55 → 11 |

Target: FCP ≤ 5 dtk (tercapai), TBT ≤ 5 dtk (belum: 5,4–6,8 dtk kecuali Tentang). Satu proses ukur per rute;
variasi antar-run besar (lihat ledger), jadi selisih kecil bukan bukti.

## Ledger percobaan
| Ide | Hasil | Verdict | Catatan |
|---|---|---|---|
| PillNav tanpa layout paksa | fungsi `n` (2,4–12 dtk self) hilang dari profil | kept | tahap 1 |
| Lazy route | bundle utama 823 → 301 kB | kept | tahap 2 |
| Inline tema, font lokal, WebP, kerangka statis | request & ukuran turun | kept | tahap 3 |
| Tanpa blur di kartu + animasi dikurangi | layout/style turun | kept | tahap 4 |
| Jeda polling tab tersembunyi | tidak terukur di trace | kept | murah, perilaku jelas |
| Varian CSS (font sistem / tanpa animasi / tanpa content-visibility / tanpa bayangan) | dua run kontrol sendiri beda FCP 1,8 vs 5,1 dtk | tidak disimpulkan | noise > efek; perlu ≥5 run + jendela lebih panjang |

## Sisa biaya (build sesudah, dashboard)
Compile modul 0,9–1,6 dtk, render React shell 1,4–1,7 dtk, satu layout ±1,3 dtk (167 objek) setelah render pertama.

## Dev server (`npm run dev`) di 20x, DevTools merekam
| Rute | FCP dtk | TBT dtk |
|---|---|---|
| dashboard | 24,0 -> 2,0 | 33,8 -> 32,8 |
| laporan | 32,6 -> 2,6 | 33,8 -> 31,9 |
| saklar | 28,9 -> 2,2 | 32,5 -> 31,4 |
| tanam | 26,1 -> 2,4 | 30,0 -> 31,1 |

FCP turun (kerangka statis di index.html), TBT tidak berubah: main thread sibuk ±37 dtk karena React mode dev
(`jsxDEV`, `createElement`, `logComponentRender/Effect` = pencatat track performa React saat merekam, StrictMode
render ganda). Itu tidak ada di build produksi. Ukur performa dengan `npm run build && npm run preview`.

| Ide | Hasil | Verdict |
|---|---|---|
| Hoist `Intl.DateTimeFormat` di `formatClock` (AppShell) | self time `formatClock` 1.449 ms -> 11 ms di profil dev | kept |
