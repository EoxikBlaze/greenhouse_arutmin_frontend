# Tambahan Kontrak MQTT — firmware v6.2.0

Melengkapi Kontrak MQTT Hidro Control v2.0. Topik, login, dan alur `perintah → hasil → ack` **tidak berubah**.
Pesan yang belum dikenal web aman diabaikan, tetapi perintah baru di bawah butuh dukungan web.

## 1. Field baru di `garap/aktuator-01/data`

| Field | Tipe | Arti |
|---|---|---|
| `nutrisi_habis` | bool | `true` = dosing AB dikunci karena ppm tidak naik (botol kosong atau selang lepas) |
| `ota_berjalan` | bool | `true` = program sedang diperbarui, semua pompa OFF |
| `ota_persen` | int 0–100 | hanya ada saat `ota_berjalan` = true |

Nilai baru di `kunci`: **`NUTRISI_HABIS`**. Dibuka dengan perintah `BUKA_KUNCI` atau tombol RESET.

Versi program tetap dibaca dari field `firmware`, contoh `"hidro-v6.2.0"`.

## 2. Perintah `OTA` (update program jarak jauh)

```json
{ "id": 123, "tipe": "OTA",
  "parameter": { "path": "/firmware/hidro-v6.2.1.bin",
                 "sha256": "<64 karakter hex SHA-256 file .bin>" } }
```

Syarat dan perilaku:
- Alat harus **sedang pemeliharaan** (kirim `MULAI_PEMELIHARAAN` dulu) dan tidak ada kegiatan.
- Alat mengunduh `http://<IP Pi>:<port HTTP API><path>` dengan header `X-API-KEY` (kunci yang sama dengan API sensor).
- Server **wajib** mengirim header `Content-Length`.
- `path` diawali `/`, tanpa `..`, dan hanya berisi huruf, angka, dan `/_.-`.

Hasil (`garap/aktuator-01/hasil`, kolom `alasan`):

| alasan | Arti |
|---|---|
| `ota_berhasil_v6.2.x` | dikirim **setelah restart** dengan program baru |
| `mulai_pemeliharaan_dulu` | belum pemeliharaan |
| `sibuk` | ada kegiatan berjalan |
| `ota_parameter_salah_path_sha256` / `ota_parameter_hilang` | parameter tidak sah |
| `ota_server_tidak_ada` | WiFi putus atau IP server Pi belum diketahui |
| `ota_url_salah` | alamat unduhan tidak bisa dibentuk |
| `ota_http_gagal` | server menjawab selain 200, atau tidak bisa dihubungi |
| `ota_ukuran_tidak_diketahui` | tidak ada `Content-Length` |
| `ota_terlalu_besar` | file melebihi slot program |
| `ota_unduh_terputus` | koneksi putus di tengah unduhan |
| `ota_sha256_tidak_cocok` | file rusak atau berbeda: **tidak dipasang** |
| `ota_gagal_dipasang` | gagal menulis ke flash |

Pada semua kegagalan, **program lama tetap berjalan**.

Saran halaman web (khusus admin):
1. Upload `.bin`, lalu hitung SHA-256 di server dan simpan.
2. Tombol "Update Program" hanya aktif saat pemeliharaan.
3. Selama proses, tampilkan `ota_persen`.

## 3. Perintah `KONSOL` (pengganti Serial Monitor)

```json
{ "id": 124, "tipe": "KONSOL", "parameter": { "baris": "status" } }
```

- Hasilnya berupa `alasan` = `konsol_ok`, dengan **`keluaran`** berisi teks yang biasanya muncul di Serial Monitor (maksimal ±900 karakter).
- `baris_kosong` = parameter `baris` kosong.
- `hanya_lewat_kabel_usb` = perintah ditolak dari web. Berlaku untuk `wifi`, `server`, `cari`, `scan`, `kosongkan`, `auto`, `mqtt`.
- Contoh baris yang berguna: `status`, `sensor`, `param`, `help`.
