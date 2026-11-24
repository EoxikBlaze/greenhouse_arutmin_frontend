# RN Mobile — Irisan 3 (Tanam) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Tab Tanam (S20/S20b), Detail Batch (S21), Mulai Semai (S22), Konfirmasi pindah tahap dan panen (S23/S23b) sesuai `.pen`, dengan data backend nyata.

**Architecture:** `src/features/tanam/`. Logika murni di `tanamView.ts` (pengelompokan batch per tahap, tahap berikutnya) dan `tanamApi.ts` (pemanggilan tulis). Layar tersembunyi `batch`, `semai`, `konfirmasi` di `(tabs)` memakai mekanisme `CHILD_OF` Dock (induk = `tanam`). Data lewat TanStack Query; mutasi invalidasi `['tanam']`.

**Tech Stack:** yang sudah ada.

**Spec:** `docs/superpowers/specs/2026-11-21-rn-mobile-rebuild-design.md`
**Desain:** S20 `v5IuOJ`, S20b `NLBta`, S21 `znH9m`, S22 `ImHy0`, S23 `WnU6k`, S23b `S6t9U`. Komponen: Kartu Batch `Bktti`, Judul Bagian `lJcoi`, Input `EnwLc`, Tombol Primer `F79Tn`.

## Global Constraints
- Aturan irisan 0 dan 2 berlaku. Backend read-only.
- Kartu batch memakai `shadowCard`; kartu Info/Catatan/Form/SOP/Lembar Konfirmasi memakai `shadowDock` (seperti S11).
- Salinan teks desain dipakai persis: "Pindah tahap dan panen hanya menyimpan CATATAN. Pencatatan ini tidak menggerakkan alat apa pun.", "Ya, simpan catatan", "Ya, catat panen".
- Aksi tulis: role demo ditolak klien (sudah ada), tombol tulis tetap tampil tapi galat demo ditampilkan sebagai Banner.

## Data backend (diverifikasi dari `routes/tanam.js`, `routes/tahap.js`, `routes/master.js`)
- `GET /tanam` → `{ page, list: [{ id, tipe: 'semai'|'peremajaan'|'pendewasaan', status, mulai, varietas, meja, jumlah_* }] }`. Panen tidak ada di daftar ini.
- `GET /semai/batch/:id` (admin/demo) → `{ semai, peremajaan[], pendewasaan[], panen[] }`.
- `POST /tanam/mulai` `{id_tanaman,id_meja,jumlah_benih,tgl_awal_semai,keterangan}` → 201 `{status,data}`.
- `POST /tanam/:tipe/:id/selesai` menutup tahap. `POST /peremajaan`, `/pendewasaan`, `/panen` membuat tahap berikutnya.
- Master: `GET /meja`, `GET /tanaman` (cek path persis di `master.js` saat Task 2).

## Keputusan yang diambil (bisa dikoreksi)
- Pindah tahap = `POST /tanam/:tipe/:id/selesai` lalu `POST` tahap berikutnya dengan `id_induk` dan `id_meja` yang sama. Dua panggilan, gagal di tengah → batch tetap di tahap lama dan galat ditampilkan.
- Catat panen = `POST /panen` dari pendewasaan aktif, lalu `selesai` pendewasaan.
- Checklist SOP (S22): backend tidak punya endpoint SOP. Langkah dibaca dari `sikluses` bila ada; bila tidak, kartu SOP disembunyikan (bukan teks karangan). Perlu konfirmasi pemilik.
- S20b menampilkan satu bagian per tahap (Semai, Peremajaan, Pendewasaan, Panen); bagian tanpa batch memakai Kosong (S20). Panen: dari `panen` tiap batch tidak tersedia di `/tanam`, jadi bagian Panen kosong sampai ada sumbernya.
- Petani: hanya baca (tahap routes admin/demo).

## Review Focus
- Daftar kosong → empat keadaan kosong persis S20.
- Batch tanpa `varietas`/`meja` (LEFT JOIN null) → tampil "Tanpa nama"/tanpa meja, bukan "null".
- Pindah tahap gagal di panggilan kedua → tidak ada klaim sukses, daftar dimuat ulang.
- Dobel ketuk "Ya" → satu permintaan saja.
- Demo menulis → galat 403 klien, tanpa fetch.
- Tahap terakhir (pendewasaan) tidak punya "Pindah ke …", hanya "Catat panen".

### Task 1: Model Tanam
**Files:** `src/features/tanam/tanamView.ts`, `__tests__/tanamView.test.ts`
**Produces:** `type Tahap = 'semai'|'peremajaan'|'pendewasaan'|'panen'`; `groupByTahap(list: TanamRow[]): { tahap: Tahap; judul: string; batches: BatchView[] }[]` (selalu 4 bagian, urutan desain); `nextTahap(t: Tahap): Tahap | null`; `batchView(row): { id; tipe; nama: string; tahapLabel: string; tanggal: string }`.
- [ ] Tes: 4 bagian walau daftar kosong; varietas null → `nama==='Tanpa nama'`; `nextTahap('pendewasaan')==='panen'`, `nextTahap('panen')===null`; tanggal "12 Mar 2026".
- [ ] Gagal, implement, lulus.

### Task 2: Layar Tanam + Detail Batch
**Files:** `TanamScreen.tsx`, `BatchScreen.tsx`, `app/(tabs)/{tanam,batch}.tsx` (ganti placeholder), `_layout.tsx`, `Dock.tsx` (`CHILD_OF` + batch/semai/konfirmasi → `tanam`).
- [ ] S20/S20b: Header, "Mulai semai" (primer), bagian per tahap dengan Kartu Batch atau Kosong, tarik-segarkan, skeleton, banner galat.
- [ ] S21: Kartu Info (Tahap, Tanaman, Mulai, Catatan), Kartu Catatan, "Pindah ke {next}" (primer, hanya bila ada), "Catat panen" (sekunder, hanya pendewasaan).
- [ ] Verifikasi browser 390x844 lawan `.pen` dengan data lokal (2 semai, 4 peremajaan ada).

### Task 3: Mulai Semai
**Files:** `SemaiFormScreen.tsx`, `tanamApi.ts` (`mulaiSemai`), `__tests__/tanamApi.test.ts`
- [ ] Tes: `mulaiSemai` memanggil `POST /tanam/mulai` dengan field persis; demo → ApiError 403 tanpa fetch.
- [ ] Form S22 (Pilih Meja, Pilih Tanaman sebagai pemilih), tombol "Simpan catatan" nonaktif sampai kedua terisi; sukses kembali ke Tanam.

### Task 4: Konfirmasi
**Files:** `KonfirmasiScreen.tsx`, `tanamApi.ts` (`pindahTahap`, `catatPanen`)
- [ ] Tes: `pindahTahap` gagal pada panggilan kedua → melempar, panggilan pertama tercatat; dobel ketuk → satu pemanggilan.
- [ ] Lembar S23/S23b dengan salinan persis; "Batal" kembali.

### Task 5: Verifikasi
- [ ] `npx tsc --noEmit`, `npx jest` lulus; tangkap layar S20/S20b/S21/S22/S23/S23b dan bandingkan dengan `.pen`.
