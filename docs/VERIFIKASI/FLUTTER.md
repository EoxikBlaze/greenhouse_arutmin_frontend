# Verifikasi FLUTTER — Gerbang auth + integrasi API live

> Pengembang `deleg_80379352` task-0 → Verifier `deleg_d2622b50` task-0 → **LAYAK COMMIT (A–F LULUS)**

## Scope (10 file, `flutter_mobile_app/`)
`lib/main.dart` (M: gerbang `_GarapRoot` + `_MainShell` tab Sensor/Meja/Riwayat/Keluar) · **BARU**: `lib/config.dart`, `lib/services/api_service.dart`, `lib/models/{meja,monitoring_entry}.dart`, `lib/pages/{login,meja,riwayat_monitoring}_page.dart`, `test/{api_service,login_page}_test.dart`

## Bukti utama
- **Baseline**: Flutter 3.47.7 · `analyze` 0 isu · `test` 1/1 (gap sesungguhnya = tak ada alur auth).
- **B–C**: `flutter analyze` → *No issues found!* (exit 0) · `flutter test` → **18/18 hijau** (1 widget + 13 ApiService + 4 login), diulang verifier persis sama.
- **D**: `pubspec.yaml`/`pubspec.lock` **tak berubah** — nol dependensi baru.
- **E (smoke live oleh verifier)**: login admin (password dari `.env`, tak dicetak) → 200; `GET /meja` **5 baris × 13 kolom** (id 11,10,9,8,3); `chart-data` 12 baris; via `ApiService` asli (`dart run`) semuanya OK; file uji live **dihapus** (repo = baseline persis).
- **F**: `_handle()` memetakan 401/403/422/429/404/5xx/jaringan → pesan Indonesia ramah + `onUnauthorized` → balik login; **nol** `print/debugPrint` di `lib`+`test`; nol password hardcoded (hanya literal mock `tok-abc`).

## Temuan (tanpa blocker)
| Sev | Isi |
|---|---|
| info | 5 file non-flutter ikut dirty (react + docs) — **milik agen paralel**, dibuktikan lewat timestamp lebih awal dari jendela kerja flutter |
| info | Reporter `flutter test` compact menampilkan beberapa nama test tertukar — angka +18 & run per-file konsisten |
| risiko | Token hanya di memori (sesi hilang saat app ditutup) — disengaja tanpa dep baru; kandidat: `shared_preferences` |
| risiko | Polling `/api/latest-sensor` masih `http.get` lama; tab Meja/Riwayat belum diuji di emulator/perangkat |

**Nilai: LAYAK COMMIT** — commit `[verified:deleg_d2622b50-F]`.
