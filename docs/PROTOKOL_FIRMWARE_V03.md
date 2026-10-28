# Spesifikasi protokol firmware aktuator v0.3 — UNTUK DITINJAU (belum diimplementasikan)

Status: **rancangan**. Firmware ESP32 v0.3 belum ditulis. `scripts/aktuator-v03-sim.js` adalah model perilaku untuk menguji spesifikasi ini, bukan bukti implementasi.
Prasyarat sebelum penulisan: konflik GPIO terselesaikan dengan bukti fisik (`docs/FASE3B4_LAPORAN.md` §4).

## 1. Topik (tidak berubah dari v0.2)

| Topik | Arah | QoS / retain |
|---|---|---|
| `garap/server/status` | server → perangkat | 0 / retained (LWT `{online:false}`) |
| `garap/aktuator-01/perintah` | server → aktuator | 1 |
| `garap/aktuator-01/hasil` | aktuator → server | 1, diulang sampai ack |
| `garap/aktuator-01/ack` | server → aktuator | 1 |
| `garap/aktuator-01/status` | aktuator → server | 1 / retained (LWT) |

## 2. Payload

**Detak server** (setiap 5 dtk):
```json
{ "online": true, "estop": false, "t": "2026-10-29T12:00:00.000Z", "ts": 1793102400 }
```
`ts` = epoch detik (baru). Sumber jam satu-satunya bagi perangkat.

**Perintah** (`v: 2`):
```json
{ "v": 2, "id": 1234, "tipe": "DOSIS", "exp": 1793102520, "ttl_s": 120,
  "parameter": { "penampung": 8, "larutan": "AB", "ml": 20 },
  "kejadian": 55, "percobaan": 91 }
```
- `id`: bigint server, naik monoton.
- `exp`: epoch detik; **wajib**.
- `kejadian`/`percobaan`: **wajib untuk DOSIS** (id siklus dosing & percobaan yang disetujui).
- `ISI_AIR`: `parameter.katup` (nomor katup perangkat, ≠ `id_meja` server) **wajib** di v0.3.

**Hasil:**
```json
{ "id": 1234, "status": "selesai|gagal",
  "hasil": { "alasan": "ok|...", "ml_nyata": 19.6, "durasi_ms": 9800, "sumber_volume": "estimasi|ukur|tidak_jalan|tidak_diketahui", "katup": "ON|OFF" } }
```
- `ml_nyata: 0` + `sumber_volume: "tidak_jalan"` **hanya** bila output tidak pernah dinyalakan.
- `ml_nyata: null` + `sumber_volume: "tidak_diketahui"` bila volume tidak bisa ditentukan (mis. reboot saat jalan).
- Server: `ESTIMASI` tidak mengembalikan jatah; `TIDAK_DIKETAHUI` → LOCK (sudah diterapkan di backend, Fase 3B.4).

## 3. Aturan perangkat (urutan pemeriksaan)

| # | Aturan | Alasan tolak |
|---|---|---|
| 1 | `STOP` / `STOP_DARURAT` selalu diterima, tanpa syarat lain | — |
| 2 | `id` bilangan bulat ≥ 1 | `id_tidak_sah` |
| 3 | `id ≤ id_terakhir` (NVS) → **tanpa efek**, laporkan duplikat | `duplikat` |
| 4 | E-STOP (fisik/server) aktif | `estop` |
| 5 | detak server terakhir > 30 dtk / MQTT putus | `server_hilang` |
| 6 | belum pernah menerima `ts` | `jam_belum_sinkron` |
| 7 | `exp` tidak ada / `sekarang > exp` / `exp − sekarang > 600` | `exp_tidak_ada` / `kedaluwarsa` / `exp_tidak_wajar` |
| 8 | sedang menjalankan perintah lain | `sibuk` |
| 9 | DOSIS tanpa `kejadian` & `percobaan` bulat | `tanpa_persetujuan` |
| 10 | kalibrasi pompa (mL/dtk) tidak ada di NVS atau ≤ 0 | `belum_dikalibrasi` (konstanta contoh **dihapus** dari kode) |
| 11 | batas lokal (mL/suntik, mL/jam, durasi maks) tidak ada di NVS | `konfigurasi_tidak_lengkap` |
| 12 | `ml` di luar (0, batas] | `ml_tidak_sah` |
| 13 | **tulis `id_terakhir` & `sedang_jalan` ke NVS → baru nyalakan output** | — |
| 14 | durasi habis / STOP / E-STOP / detak hilang → semua output mati, laporan dibuat | — |
| 15 | laporan diulang tiap 3 dtk sampai `ack {id}`; pengulangan tidak menyalakan output | — |
| 16 | boot: semua output LOW; bila `sedang_jalan` ada di NVS → laporan `tidak_diketahui`, hapus `sedang_jalan` | — |

LOCK penampung ditegakkan di server (perintah tidak pernah diantre). Perangkat tidak menyimpan status LOCK.

## 4. Kalibrasi di NVS

- Ditulis hanya lewat prosedur kalibrasi (mode khusus, tombol fisik + perintah admin). Format: `kal/<OUT> = mL/dtk`, `batas/<OUT> = mL`, `kal_ts`, `kal_oleh`.
- Hilang/rusak → output itu ditolak. Tidak ada angka bawaan di kode.

## 5. Daftar tes sebelum firmware dianggap selesai

| Tes | Simulasi (model) | Bangku (ESP32 + LED, tanpa pompa) | Fisik (air, gelas ukur) |
|---|---|---|---|
| perintah kedaluwarsa ditolak | ✅ ada (`test/aktuator-v03-sim.test.js`) | wajib | — |
| jam belum sinkron ditolak | ✅ | wajib | — |
| id duplikat setelah reboot (cabut daya) | ✅ | **wajib** (NVS nyata) | — |
| putus Wi-Fi/MQTT saat jalan → mati ≤ 30 dtk | ✅ | wajib | wajib |
| E-STOP fisik saat jalan | ✅ (server) | **wajib** (tombol) | wajib |
| kalibrasi/batas hilang → ditolak | ✅ | wajib | — |
| reboot saat jalan → laporan tidak_diketahui | ✅ | wajib | — |
| DOSIS tanpa persetujuan ditolak | ✅ | wajib | — |
| laporan diulang sampai ack, tanpa eksekusi ulang | ✅ | wajib | — |
| akurasi `ml_nyata` vs gelas ukur | — | — | **wajib** (≥ 5 kali per pompa) |
| ISI_AIR per katup sesuai pemetaan | belum dimodelkan | wajib | wajib |
