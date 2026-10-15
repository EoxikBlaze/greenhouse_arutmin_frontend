# API & Route Map (Laravel existing)

Sumber: `/Users/rizki/Documents/Vertonik-Smart-Farm/routes/web.php` dan `routes/api.php`.

## routes/web.php (dipakai web/app existing; perlu API contract untuk SPA/mobile)

| Method | Path | Name / Note |
|---|---|---|
| GET | `/` | `login` |
| GET | `/login` |  |
| POST | `/login` | `login.proses` |
| GET | `/logout` | `logout` |
| GET | `/monitoring/getReport6Jam` |  |
| POST | `/monitoring/saveAlert` |  |
| POST | `/monitoring/saveSensor` |  |
| GET | `/dashboard` | `dashboard` |
| GET | `/tanam` | `tanam.index` |
| POST | `/tanam/mulai` | `tanam.mulai` |
| POST | `/tanam/{tipe}/{id}/selesai` | `tanam.selesai` |
| POST | `/tanam/{id}/hapus` | `tanam.hapus` |
| GET | `siklus/csv` | `siklus.csv` |
| GET | `/semai/batch/{id}` | `semai.batch` |
| GET | `/semai/selesai` | `semai.selesai` |
| GET | `/monitoring/chart-data` | `monitoring.chart` |
| GET | `/monitoring/tarik` | `monitoring.tarik` |
| GET | `/monitoring/tarik/csv` | `monitoring.tarik.csv` |
| GET | `/watercontrol` | `watercontrol.index` |
| POST | `/watercontrol/fill` | `watercontrol.fill` |
| POST | `/watercontrol/stop` | `watercontrol.stop` |
| GET | `/watercontrol/status` | `watercontrol.status` |
| POST | `/watercontrol/setMode` | `watercontrol.mode` |
| GET | `/laporan` | `laporan.index` |
| GET | `/laporan/csv` | `laporan.csv` |
| GET | `/profil` | `profil.index` |
| POST | `/profil/update` | `profil.update` |
| GET | `/profil/password` | `profil.password` |
| POST | `/profil/password` | `profil.password.update` |
| GET | `/notifikasi-wa` | `notifikasi-wa.index` |
| POST | `/notifikasi-wa` | `notifikasi-wa.update` |
| POST | `/notifikasi-wa/uji` | `notifikasi-wa.uji` |
| RESOURCE | `meja` | `MejaController` |
| RESOURCE | `tanaman` | `TanamanController` |
| RESOURCE | `siklus` | `SiklusController` |
| RESOURCE | `ambang` | `AmbangController` |
| RESOURCE | `semai` | `SemaiController` |
| RESOURCE | `peremajaan` | `PeremajaanController` |
| RESOURCE | `pendewasaan` | `PendewasaanController` |
| RESOURCE | `panen` | `PanenController` |
| RESOURCE | `monitoring` | `MonitoringController only['index']` |
| RESOURCE | `user` | `UserController` |

## routes/api.php (publik + ESP32 api.key)

| Method | Path | Name / Note |
|---|---|---|
| GET | `/latest-sensor` |  |
| GET | `/get-thresholds` |  |
| POST | `/save-sensor` |  |
| POST | `/notif-hardware` |  |

## Catatan

- Saat ini controller banyak `return view(...)` (Blade). Untuk React/Flutter dibutuhkan endpoint JSON yang setara (tanpa mengganti nama route yang sudah fix).
- Endpoint JSON yang sudah ada: `GET /api/latest-sensor`, beberapa endpoint `MonitoringController` (lihat `routes/api.php`).
