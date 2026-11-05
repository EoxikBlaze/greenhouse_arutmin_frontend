# ESP32_API — Panduan Endpoint untuk Perangkat ESP32

Panduan lengkap autentikasi, daftar endpoint, contoh `curl` siap salin, snippet
firmware Arduino (C++), troubleshooting, dan catatan arsitektur.

> **Sumber kebenaran (kode):** endpoint ESP32 **bukan** di `src/routes/esp32.js`
> (file itu tidak ada), melainkan di **`src/routes/monitoring.js`** (`api` router,
> di-mount di `src/index.js` → `app.use('/api', monitoring.api)`), guard autentikasi
> di **`src/auth.js` → `requireApiKey()`**. Dokumen ini ditulis dari pembacaan kode
> tersebut dan diverifikasi langsung terhadap server yang berjalan (lihat §6).
> Dokumen terkait: `docs/KONTRAK_API.md`, `docs/API_ROUTES.md`,
> `docs/ARSITEKTUR_PI_2ESP32.md`.

---

## 1. Autentikasi `X-API-KEY`

| Hal | Fakta |
|---|---|
| Nama header | `X-API-KEY` (case-insensitive; server membaca `x-api-key`) |
| Alternatif | field body JSON `api_key` (diterima, tapi **disarankan pakai header**) |
| Jumlah kunci | **TUNGGAL** — 1 variabel `ESP32_API_KEY` di `.env` untuk SEMUA perangkat |
| Nilai | bebas string; disarankan `openssl rand -hex 32` (64 karakter hex) |
| Penyimpanan di Pi | `backend-nodejs/.env` (tidak pernah di-commit, tidak pernah dibalas ke client) |
| Cara cek | `grep -c '^ESP32_API_KEY=' backend-nodejs/.env` (hasil `1` = ada) |
| Perbandingan | `crypto.timingSafeEqual` (timing-safe, anti timing-attack) |
| Salah / hilang | **HTTP 403** `{"status":false,"msg":"Unauthorized"}` — bukan 401 |
| Fallback bahaya | `src/config.js`: `esp32ApiKey = ESP32_API_KEY \|\| 'HARVEST123'` — kalau `.env` kosong, kunci jadi `HARVEST123`. **Pastikan `ESP32_API_KEY` ada di `.env`.** |

**Simpan & pakai (jangan pernah tulis kunci manual di tengah perintah):**

```bash
cd /home/pi/Vertoniksmartfarm/backend-nodejs        # di Mac: ~/Project/Vertoniksmartfarm/backend-nodejs
KEY=$(grep -E '^ESP32_API_KEY=' .env | cut -d= -f2-)
echo "panjang key: ${#KEY}"                          # hanya panjang — jangan cetak nilainya
```

`$KEY` dipakai di semua contoh `curl` di bawah. `ESP32_API_KEY` juga dibaca
otomatis oleh server saat start, jadi **setiap perubahan kunci butuh restart
service backend** (`sudo systemctl restart vertonik-api` di Pi) — tanpa restart
server tetap memakai kunci lama di memori.

---

## 2. Daftar endpoint ESP32

| # | Method | Path | Header | Ringkas |
|---|---|---|---|---|
| 1 | GET | `/api/latest-sensor` | tanpa key (publik) | baris sensor terakhir + status online/anomali |
| 2 | GET | `/api/get-thresholds` | `X-API-KEY` | ambang min/max 5 sensor |
| 3 | POST | `/api/save-sensor` | `X-API-KEY` | tulis data sensor + balas `command` katup |
| 4 | POST | `/api/notif-hardware` | `X-API-KEY` | catat alert perangkat (cooldown) |
| 5 | POST | `/monitoring/saveSensor` | `X-API-KEY` | alias kompatibilitas CI4 = #3 |
| 6 | POST | `/monitoring/saveAlert` | `X-API-KEY` | alias kompatibilitas CI4 = alert |
| — | GET | `/api/get-command` | — | **TIDAK ADA (404)** — lihat §2.6 |

Catatan umum:
- **Rate limit:** tulis (POST/PUT/PATCH/DELETE) **60/menit per IP**, baca (GET)
  **300/menit per IP** (override env `RATE_LIMIT_WRITE` / `RATE_LIMIT_VIEW` bila diset; default di kode 60/300).
  Kirim tiap 5 detik = 12/menit → aman, bahkan untuk 2 ESP32 di IP yang sama.
  Kena limit → **429** `{"message":"Terlalu banyak permintaan. Coba lagi dalam N detik."}`
- Body wajib `Content-Type: application/json`.
- Body non-objek (angka/teks) → **422** `{"message":"Data tidak valid.","errors":{"body":["Body harus berupa objek JSON."]}}`.
- JSON rusak → **400** `{"message":"Format JSON tidak valid."}`.

### 2.1 `GET /api/latest-sensor` — publik, TANPA kunci

Dipakai SPA/Flutter untuk polling. Tidak perlu `X-API-KEY` (dikirim pun tidak
apa-apa). Respons di-cache **2 detik**.

```bash
curl -s http://127.0.0.1:8000/api/latest-sensor
# dari luar Pi: ganti 127.0.0.1 dengan IP Pi / http://IP-PI/api/latest-sensor
```

Sukses **200**:

```json
{
  "is_online": false,
  "seconds_ago": 511752,
  "anomalies": [{"sensor":"tds","value":1200,"min":50,"max":1000}],
  "sensor": {
    "id": "100012", "waterTemp": 26.9, "ph": 6.5, "tds": 1200,
    "airTemp": 31, "humidity": 66,
    "created_at": "2026-10-14T22:43:58.000Z",
    "updated_at": "2026-10-14T22:43:58.000Z",
    "id_meja": null, "ec_ms_cm": null
  },
  "water_control": {"mode":"MANUAL","valve_state":"OFF","command":"AUTO",
                    "updated_at":"2026-10-20T13:56:40.000Z"}
}
```

- `is_online=true` ⇔ data terakhir ≤ **120 detik** lalu.
- `sensor=null` bila belum pernah ada data.
- `water_control.command` adalah **perintah katup pending** (lihat §2.6).
- **`id_meja` selalu `null`** untuk data yang masuk lewat `/api/save-sensor`
  (kolom ada di tabel `monitorings`, tetapi endpoint ini tidak membacanya).

### 2.2 `GET /api/get-thresholds` — wajib `X-API-KEY`

```bash
curl -s -H "X-API-KEY: $KEY" http://127.0.0.1:8000/api/get-thresholds
```

Sukses **200** (cache 60 detik):

```json
{"status":true,
 "thresholds":{"ph":{"min":5,"max":7},
               "waterTemp":{"min":5,"max":40},
               "airTemp":{"min":20,"max":40},
               "humidity":{"min":50,"max":90},
               "tds":{"min":50,"max":1000}},
 "fetched_at":"2026-10-20T20:53:30.950Z"}
```

Gagal:
- **403** `{"status":false,"msg":"Unauthorized"}` — tanpa key / key salah.
- **429** — terlalu sering (limit GET 300/menit/IP).

### 2.3 `POST /api/save-sensor` — tulis data sensor (inti firmware)

```bash
curl -s -X POST http://127.0.0.1:8000/api/save-sensor \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $KEY" \
  -d '{"waterTemp":26.9,"ph":6.5,"tds":1200,"airTemp":31,"humidity":66}'
```

**Field payload** (semua OPSIONAL kecuali minimal 1 field — body `{}` = 400):

| Field | Tipe | Contoh | Keterangan |
|---|---|---|---|
| `waterTemp` | number (atau string numerik) | `26.9` | suhu air °C |
| `ph` | number | `6.5` | pH air |
| `tds` | number | `1200` | TDS ppm |
| `airTemp` | number | `31` | suhu udara °C |
| `humidity` | number | `66` | kelembapan % (`0` VALID, jangan dianggap kosong) |
| `water_level` | — | — | **DIHAPUS** (rancangan FINAL hanya memakai float switch). Bila masih dikirim, diabaikan server |
| `solenoid_state` | string (`"ON"`/`"OFF"`) | `"ON"` | gerakkan katup saat mode MANUAL |

- Field angka boleh `null` / `""` / tidak dikirim (diabaikan). String numerik
  (`"6.5"`) diterima. Kirim field tambahan yang tidak dikenal (mis. `id_meja`,
  `device`) **diabaikan — tidak menyimpan apa pun** (tidak ada kolom device di
  jalur tulis ini; lihat §5).
- **Anti-duplikat:** kalau SELURUH nilai identik dengan baris terakhir, server
  **tidak membuat baris baru** (tetap 200 + `command`). Ini normal, bukan error.
- Sisi efek: `water_controls` ikut di-update (state katup & `command`).

Sukses **200**:

```json
{"status":"ok","command":"AUTO","mode":"MANUAL","server_time":"2026-10-20T20:53:09.789Z"}
```

- `command`: `AUTO` | `FORCE_STOP` (| `FORCE_FILL`) — inilah yang dieksekusi firmware.
- `mode`: mode water control saat ini (`AUTO`/`MANUAL`).

Gagal (diverifikasi langsung, §6):

| Kode | Kondisi | Body |
|---|---|---|
| **403** | key salah / header hilang / spasi | `{"status":false,"msg":"Unauthorized"}` |
| **400** | body kosong `{}` | `{"status":"error","message":"No payload"}` |
| **400** | field angka berisi teks | `{"status":"error","message":"Data sensor tidak valid.","errors":{"waterTemp":["Field waterTemp harus berupa angka."]}}` |
| **422** | body bukan objek JSON (mis. `5`) | `{"message":"Data tidak valid.","errors":{"body":["Body harus berupa objek JSON."]}}` |
| **400** | JSON rusak | `{"message":"Format JSON tidak valid."}` |
| **429** | rate limit tulis 60/menit | `{"message":"Terlalu banyak permintaan. Coba lagi dalam N detik."}` |

> ⚠️ **Koreksi penting:** yang sering ditulis "401 salah key, 422 payload salah"
> **tidak sesuai kode**. Faktanya: key salah = **403**, payload tipe salah =
> **400**, 422 hanya untuk body non-objek. Firmware harus menangani **403** dan
> **400**, jangan menunggu 401/422.

### 2.4 `POST /api/notif-hardware` — alert dari perangkat

```bash
curl -s -X POST http://127.0.0.1:8000/api/notif-hardware \
  -H "Content-Type: application/json" -H "X-API-KEY: $KEY" \
  -d '{"type":"solenoid","value":"ON"}'
```

| Field | Tipe | Aturan |
|---|---|---|
| `type` | string ≤ 50 karakter, wajib | mis. `solenoid`, `water_level` |
| `value` | string ≤ 100 karakter, wajib | mis. `ON`, `Penuh` |

Sukses: `200` `{"status":true,"type":"solenoid","value":"ON"}`
Cooldown (alert sama berulang): `200` `{"status":"cooldown"}` — `solenoid` 60 dtk,
tipe lain 600 dtk.
Gagal: **403** tanpa/salah key; **400** `{"status":false,"msg":"type dan value wajib"}`
atau `{"status":false,"msg":"type maksimal 50 karakter."}`.

### 2.5 Alias kompatibilitas CI4 (guard sama persis)

- `POST /monitoring/saveSensor` — payload & respons identik §2.3.
- `POST /monitoring/saveAlert` — `{"type":...,"value":...}` → `{"status":"ok"}`.

```bash
curl -s -X POST http://127.0.0.1:8000/monitoring/saveSensor \
  -H "Content-Type: application/json" -H "X-API-KEY: $KEY" \
  -d '{"ph":6.5,"tds":1200}'
```

### 2.6 `GET /api/get-command` — **TIDAK ADA**

Endpoint ini **tidak ada di kode** (404 `{"message":"The route /api/get-command could not be found."}`).
Perintah katup diambil dengan dua cara:

1. **Balasan `POST /api/save-sensor`** → field `command` (paling mudah, gratis —
   sudah dikirim tiap 5 detik).
2. **`GET /api/latest-sensor`** → `water_control.command` (untuk polling terpisah).

`command` bernilai `AUTO`, `FORCE_STOP`, atau `FORCE_FILL`; firmware menahan
perintah lama sampai server menggantinya.

---

## 3. Snippet firmware ESP32 (Arduino C++, `WiFi.h` + `HTTPClient`)

### 3.1 Bagian konfigurasi

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ── KONFIGURASI — ubah 4 baris ini saja ─────────────────────────────
const char* WIFI_SSID  = "Pokjar Permata";          // nama WiFi
const char* WIFI_PASS  = "isi-password-wifi";       // password WiFi
const char* SERVER_URL = "http://192.168.1.10/";    // IP Pi — JANGAN 127.0.0.1!
const char* API_KEY    = "tempel-nilai-ESP32_API_KEY-dari-.env";
// ────────────────────────────────────────────────────────────────────

const unsigned long INTERVAL_KIRIM = 5000;          // 5 detik
unsigned long terakhirKirim = 0;
```

> **Soal `SERVER_URL`:** `127.0.0.1` = alamat loopback — dari ESP32 itu berarti
> ESP32 itu sendiri, jadi selalu timeout. Pakai **IP Pi di jaringan lokal**
> (mis. `192.168.1.10`, lihat `hostname -I` di Pi), atau nama `http://vertonik`
> bila mode hotspot aktif. Di produksi Pi menjalankan **nginx di :80** yang
> meneruskan ke backend `127.0.0.1:8000`, jadi `http://IP-PI/` (port 80) adalah
> URL yang benar; backend sendiri memang sengaja hanya `bind 127.0.0.1`.

### 3.2 Loop: POST JSON tiap 5 detik

```cpp
void kirimSensor() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(SERVER_URL) + "api/save-sensor");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-KEY", API_KEY);             // ← autentikasi
  http.setTimeout(5000);

  StaticJsonDocument<256> doc;
  doc["waterTemp"]   = bacaSuhuAir();               // number
  doc["ph"]          = bacaPH();                    // number
  doc["tds"]         = bacaTDS();                   // number
  doc["airTemp"]     = bacaSuhuUdara();             // number
  doc["humidity"]    = bacaKelembapan();            // number
  doc["water_level"] = String(bacaLevelTandon());   // string

  String body;
  serializeJson(doc, body);

  int kode = http.POST(body);
  if (kode > 0) {
    if (kode == 200) {
      // {"status":"ok","command":"AUTO","mode":"...","server_time":"..."}
      String balasan = http.getString();
      // TODO: parse "command" → eksekusi solenoid (FORCE_STOP / FORCE_FILL / AUTO)
      Serial.println(balasan);
    } else if (kode == 403) {
      Serial.println("X-API-KEY ditolak — cek API_KEY / spasi di .env");
    } else if (kode == 400 || kode == 422) {
      Serial.printf("Payload ditolak (%d): %s\n", kode, http.getString().c_str());
    } else if (kode == 429) {
      Serial.println("Rate limit — naikkan interval kirim");
    }
  } else {
    Serial.printf("Koneksi gagal: %s\n", http.errorToString(kode).c_str());
    // di sini antre lokal (LittleFS/SD) sesuai docs/ARSITEKTUR_PI_2ESP32.md §3
  }
  http.end();
}

void loop() {
  if (millis() - terakhirKirim >= INTERVAL_KIRIM) {
    terakhirKirim = millis();
    kirimSensor();
  }
  // baca perintah cadangan bila perlu: GET api/get-thresholds (X-API-KEY)
}
```

Ambang untuk alarm lokal diambil via `GET /api/get-thresholds` (respons
`thresholds.ph.min` dll., cache 60 detik di server).

### 3.3 Dua ESP32 (2 greenhouse)

**Fakta saat ini:** semua perangkat memakai **kunci yang sama** `ESP32_API_KEY`
dan payload `save-sensor` **TIDAK punya field meja/device yang diproses** —
mengirim `"id_meja":1` atau `"device":"esp32-a"` **diabaikan** (kolom `id_meja`
di tabel `monitorings` tetap `NULL`). Konsekuensinya:

- Data kedua ESP32 **tercampur jadi satu grafik** (`GET /api/latest-sensor`
  selalu mengembalikan baris terakhir SEMUA data, tanpa filter).
- Perintah `water_controls` juga **satu baris** → perintah ESP32-A & ESP32-B
  saling menimpa.
- Firmware cukup disalin apa adanya; **bedakan perangkat lewat pembacaan sensor /
  penamaan di sisi firmware, bukan lewat payload** (tidak ada bedanya di server).

Skema per-kunci (`ESP32_KEY_A` / `ESP32_KEY_B`, header beda, field `device` di
payload, `?device=` di latest-sensor) adalah **USULAN backlog** — belum ada di
kode. Rinciannya di `docs/ARSITEKTUR_PI_2ESP32.md` §4.

---

## 4. Troubleshooting

| Gejala | Penyebab paling mungkin | Perbaikan |
|---|---|---|
| **403** `{"status":false,"msg":"Unauthorized"}` | key salah, spasi/kutip ikut tersimpan, atau `.env` belum punya `ESP32_API_KEY` (server memakai fallback `HARVEST123`) | `grep -E '^ESP32_API_KEY=' .env` lalu bandingkan **panjangnya** `${#KEY}` dengan yang ada di firmware; buang spasi; pastikan baris `ESP32_API_KEY=...` ada. **Server harus di-restart** setelah `.env` diubah. *(Bukan 401 — backend memang membalas 403.)* |
| **400** `Data sensor tidak valid.` | field angka berisi teks (mis. `"bukan-angka"`) atau body `{}` (`No payload`) | kirim number JSON asli (`"ph":6.5` bukan `"ph":"enam"`); minimal 1 field |
| **422** `Body harus berupa objek JSON` | body berupa angka/teks tunggal, bukan `{...}` | balut payload dalam `{ }` |
| **400** `Format JSON tidak valid` | koma hilang, tanda kutip nyasar | cek format JSON |
| **429** | kirim terlalu cepat (limit tulis 60/menit/IP) | interval ≥ 10 detik, atau naikkan `RATE_LIMIT_WRITE` |
| **Timeout / tidak ada balasan** | IP salah, pakai `127.0.0.1`, Pi ≠ di jaringan WiFi sama, nginx belum jalan | pakai IP Pi (`hostname -I`), tes dari laptop: `curl http://IP-PI/api/latest-sensor`; di Pi cek `sudo systemctl status nginx vertonik-api`; mode darurat: `http://vertonik` (hotspot 10.42.0.1) |
| **200 tapi data tak muncul** | (a) baris identik → anti-duplikat, (b) cache 2 detik, (c) SPA baca `latest-sensor` | ubah salah satu nilai sensor; tunggu ≤ 2 dtk; tes: `curl -s http://IP-PI/api/latest-sensor` lalu cek `sensor.created_at` & `seconds_ago` |
| **Tampil tapi `is_online:false`** | data terakhir > 120 detik lalu | kirim tiap ≤ 120 dtk; cek jam Pi/NTP & koneksi WiFi ESP32 |
| Data campur antar greenhouse | 1 kunci + tanpa field device (§5) | normal untuk arsitektur saat ini |

**Cek cepat "apakah endpoint utuh":**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/latest-sensor   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H "X-API-KEY: $KEY" \
       http://127.0.0.1:8000/api/get-thresholds                                    # 200
```

---

## 5. Catatan arsitektur (apa adanya vs usulan)

**Yang berlaku sekarang (fakta kode):**
1. **SATU kunci global** `ESP32_API_KEY` di `.env` — dipakai semua ESP32,
   dibandingkan timing-safe di `requireApiKey`.
2. **Satu aliran data**: tabel `monitorings` tanpa kolom `device` (field
   `id_meja` ada tapi **tidak pernah diisi** oleh jalur save-sensor) → semua
   perangkat tercampur.
3. `water_controls` **1 baris dominan** → perintah katup bersama.
4. `sensor_thresholds` global per `sensor` → ambang sama untuk semua alat.
5. `GET /api/latest-sensor` selalu baris terakhir **semua** data (tanpa `?device=`).
6. Alias CI4 (`/monitoring/saveSensor|saveAlert`) dipertahankan dengan guard sama.

**Backlog USULAN (belum ada di kode — jangan diandalkan firmware):**
- `ESP32_KEY_A` / `ESP32_KEY_B` (multi-key per device), validasi ke tabel `devices`.
- Kolom `device_id` di `monitorings` & `alert_logs`, `?device=` di latest-sensor
  & get-thresholds, `device` opsional di payload save-sensor.
- Rate limit khusus `POST /api/save-sensor` minimal 12 detik/kirim.

Rujukan: `docs/ARSITEKTUR_PI_2ESP32.md` §4 (gap & migrasi), `docs/KONTRAK_API.md`.

**Rotasi kunci:** `backend-nodejs/scripts/generate-apikey.sh` (lihat §6).
Setelah rotasi WAJIB: (1) restart backend, (2) ganti `API_KEY` di firmware SEMUA
ESP32, (3) jalankan `generate-apikey.sh --check`.

---

## 6. Hasil verifikasi LIVE (server berjalan, 2026-10-21)

| Uji | Perintah | Hasil |
|---|---|---|
| Baca dengan key | `GET /api/latest-sensor` + `X-API-KEY` | **200**, payload sesuai §2.1 |
| Key salah | `GET /api/get-thresholds` key palsu | **403** `{"status":false,"msg":"Unauthorized"}` |
| Tanpa key | `POST /api/save-sensor` | **403**, tidak menulis baris |
| Tipe salah | `POST {"waterTemp":"bukan-angka"}` | **400** + `errors.waterTemp`, tidak menulis |
| Body skalar | `POST -d '5'` | **422** `Body harus berupa objek JSON` |
| Tulis data uji | `POST {"waterTemp":24.6,"ph":6.66,"tds":666,"airTemp":26.6,"humidity":55.5,"water_level":"UJI-ESPID"}` | **200** `{"status":"ok","command":"AUTO","mode":"MANUAL",...}`, baris `100020` tercatat (12 → 13) |
| Key benar | `GET /api/get-thresholds` | **200**, 5 ambang + `fetched_at` |
| **Restore baseline** | `DELETE` baris uji + kembalikan `water_controls.updated_at` | `monitorings` kembali **12**, `water_control` = `MANUAL/OFF/AUTO @ 2026-10-20 13:56:40`, baris uji 0, `GET` tetap **200** |

Kunci **tidak pernah dicetak** di mana pun dalam pengujian ini.
