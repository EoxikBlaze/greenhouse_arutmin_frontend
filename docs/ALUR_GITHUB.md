# Saran alur kerja Git/GitHub (belum dijalankan)

Dokumen ini saran. **Tidak ada `git add`, commit, push, atau merge yang dilakukan.** Setiap langkah tulis butuh izin eksplisit pemilik.

## Alur

1. `git status` dan `git diff` di **kedua** repo (`.` = induk, `backend-nodejs/` = backend).
2. Pisahkan perubahan per tujuan (lihat kelompok di bawah). Jangan menggabungkan semua perubahan lama jadi satu commit.
3. Jalankan tes yang relevan (DB uji `garap_uji*`, per berkas, berurutan).
4. Review perubahan & risiko (sheet RISIKO DAN KEPUTUSAN).
5. Stage hanya berkas yang disetujui: `git add <path>` per berkas, bukan `git add .`.
6. Commit dengan pesan jelas.
7. Push ke **branch kerja** (bukan `main`) setelah diizinkan.
8. Buat Pull Request ke `dev`/`main`.
9. Di PR, lampirkan ringkasan, perintah & hasil tes, risiko, dan checklist (di bawah).
10. Merge setelah review dan syarat keselamatan terpenuhi.

## Pengelompokan commit backend (berbasis dependensi)

Berkas yang ada adalah versi **akhir** (gabungan beberapa fase). Commit per fase tidak bisa dibuat tanpa merekonstruksi versi antara, dan hasilnya akan berupa commit yang tidak bisa jalan (mis. `siklusBudidaya.js` sudah memuat `penugasan.js`, `kestabilan.js`, `sanitySensor.js`). Karena itu kelompok disusun agar **setiap commit bisa dimuat dan diuji sendiri**. Isi stage diekspor (`git checkout-index`) dan diuji sebelum commit.

| # | Pesan | Berkas | Status |
|---|---|---|---|
| 1 | `feat(db): migrasi aditif siklus budidaya & persetujuan dosing` | migrasi `01`, `02`, `scripts/migrasi-siklus.js`, `test/migrasi-siklus.test.js`, `test/integration/skema-siklus.test.js` | commit `7df826b` |
| 2 | `feat(siklus): layanan siklus, parameter, penugasan, kestabilan, gerbang dosis` | `src/{siklusBudidaya,parameter,penugasan,kestabilan,gerbangDosis,sanitySensor}.js`, `src/routes/{siklusBudidaya,parameter}.js`, `src/index.js`, migrasi `03`, `04`, tes terkait | di-stage, diuji dari isi stage |
| 3 | `fix(sensor): bukti pengamatan & cegah bacaan ganda saat kiriman bersamaan` | `src/routes/monitoring.js`, `test/integration/sensor-konkurensi.test.js` | — |
| 4 | `security(aktuator)!: tutup jalur dosing tanpa persetujuan & volume tidak pasti` | `src/aktuator.js`, `src/routes/{aktuator,konfigurasi,watercontrol,preset}.js`, `src/otomasi.js` (hapus), `src/kontrolAir.js`, migrasi `05`, `.env.example`, tes `aktuator-parameter`, `perangkat`, `watercontrol`, `mqtt-ketahanan`, `sensor-penampung`, `kontrol-air`, `otomasi-blokir`, hapus `test/otomasi.test.js` & `test/integration/rantai-dosing.test.js` | — |
| 5 | `test: model perilaku firmware aktuator v0.3` | `scripts/aktuator-v03-sim.js`, `test/aktuator-v03-sim.test.js` | — |
| 6 | `security: redact MQTT credentials in logs` | `src/mqttJembatan.js`, `test/integration/mqtt-log-rahasia.test.js` | — |

## Pengelompokan commit induk

| # | Pesan | Berkas | Status |
|---|---|---|---|
| A | `chore(git): lacak 4 sumber firmware, kredensial tetap diabaikan` | `.gitignore`, `deploy-pi/firmware/{aktuator,sensor}/*.ino`, `*.h.contoh` | commit `6c4ad20` |
| B | `docs: desain fase 2, protokol firmware v0.3, alur github, tutorial Pi tanpa OTOMASI` | `docs/DESAIN_FASE2.md`, `docs/PROTOKOL_FIRMWARE_V03.md`, `docs/ALUR_GITHUB.md`, `docs/TUTORIAL_PI_MANUAL.md` | — |

**Ditahan lokal (keputusan pemilik, 29 Okt 2026): repo induk publik dan dokumen ini memuat celah keamanan yang belum ditutup.** Commit hanya setelah risikonya ditutup atau repo dijadikan privat:
- `docs/AUDIT_FASE1_SPESIFIKASI.md`, `docs/FASE3_PEMERIKSAAN.md`, `docs/FASE3B2_GERBANG_3C.md`, `docs/FASE3B3_LAPORAN.md`, `docs/FASE3B4_LAPORAN.md`
- `docs/CHANGELOG.md`, `docs/LOG_PERUBAHAN_VERTONIK_SMART_FARM.xlsx`, `docs/alat/log_perubahan.py` (data risiko tertanam)

**Jangan ikut di-commit tanpa keputusan pemilik:**
- `docs/PROJECT_OVERVIEW.md` (pribadi);
- `docs/presentasi/` (bahan pengguna);
- `flutter_mobile_app/android/app/src/debug/AndroidManifest.xml` (pengaturan debug, keputusan terpisah).

## Checklist PR

- [ ] Hanya berkas yang disetujui; tidak ada `.env`, `rahasia.h`, `*.lokal`, `KREDENSIAL-LOKAL.txt`.
- [ ] Tes: perintah + hasil aktual (lulus/gagal/dilewati); DB uji, bukan DB sumber.
- [ ] Migrasi: aditif, urutan benar, paritas LULUS, rencana rollback.
- [ ] Tidak ada jalur DOSIS tanpa persetujuan (`test/otomasi-blokir.test.js`).
- [ ] Tidak ada klaim uji fisik/Pi bila hanya simulasi.
- [ ] Risiko terbuka & keputusan pemilik tercantum.
- [ ] Changelog & log perubahan diperbarui (`python3 docs/alat/log_perubahan.py segarkan-git`).
