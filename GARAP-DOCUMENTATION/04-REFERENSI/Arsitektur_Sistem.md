# Arsitektur Sistem GARAP

| Atribut | Isi |
|---|---|
| Nomor dokumen | GARAP-REF-01 |
| Versi | 1.0 |
| Tanggal | 12 November 2026 |

## 1. Gambaran Lapisan

```mermaid
flowchart TB
  subgraph L1["Lapisan lapangan"]
    ESP["ESP32 gabungan aktuator-01<br/>firmware gabungan-0.6"]
  end
  subgraph L2["Lapisan server lokal (Raspberry Pi)"]
    NG["nginx :80/:443"]
    API["GARAP API Node.js 127.0.0.1:8000"]
    MQ["Mosquitto :1883"]
    DB[("PostgreSQL")]
    OL["Ollama (AI lokal)"]
  end
  subgraph L3["Lapisan pengguna"]
    WEB["Website React"]
    MOB["Aplikasi Flutter"]
  end
  ESP <--> MQ
  ESP -.-> NG
  MQ <--> API
  NG --> API
  API <--> DB
  API --> OL
  WEB --> NG
  MOB --> NG
```

## 2. Aliran Data Sensor

```mermaid
sequenceDiagram
  participant ESP as ESP32
  participant MQ as Mosquitto
  participant API as API
  participant DB as PostgreSQL
  ESP->>MQ: garap/aktuator-01/data (tiap 5 dtk, hanya saat pompa diam)
  MQ->>API: teruskan (cek peran & API key per pesan)
  API->>API: batas fisik → tolak 422 bila mustahil
  API->>DB: simpan monitorings (id_meja)
  API->>API: bandingkan ambang → alert_logs
  Note over API: bacaan > 120 dtk = basi
```

## 3. Aliran Perintah ke Aktuator

```mermaid
sequenceDiagram
  participant U as Pengguna (admin)
  participant API as API
  participant MQ as Mosquitto
  participant ESP as ESP32
  U->>API: STOP / E-STOP / (uji pompa, dikunci)
  API->>API: DOSIS langsung → 423 ditolak
  API->>MQ: garap/aktuator-01/perintah {id, tipe, parameter}
  MQ->>ESP: perintah
  ESP->>ESP: cek E-STOP, sibuk, detak server segar, pelampung, batas mL/durasi
  ESP->>MQ: garap/aktuator-01/hasil (diulang tiap 3 dtk)
  MQ->>API: hasil
  API->>MQ: garap/aktuator-01/ack
  loop tiap 5 dtk
    API->>MQ: garap/server/status {online, estop}
  end
  Note over ESP: tanpa detak > 30 dtk → semua output OFF
```

Tipe perintah yang diterima firmware gabungan: `DOSIS`, `ISI_AIR`, `UJI_POMPA`, `KALIBRASI`, `BALIK_KALIBRASI`, `STOP`, `STOP_DARURAT`. `BILAS` dan `SAMPLING` ditolak (`tipe_tak_dikenal`). Server tidak mengirim `DOSIS` karena gerbang dosis tertutup.

## 4. Lapisan Pengaman

| Lapis | Lokasi | Pengaman |
|---|---|---|
| 1 | Tombol E-STOP fisik | Memutus bus 12 V aktuator |
| 2 | Firmware | Fail-safe 30 dtk, batas mL/suntikan & per jam, batas durasi, satu pekerjaan, watchdog, output OFF saat boot, pelampung |
| 3 | Broker | Tanpa anonim, ACL per perangkat |
| 4 | Backend | Batas fisik & kewajaran sensor, saklar izin, gerbang dosis (`EKSEKUSI_DIIZINKAN = false`), parameter wajib SIAP, kunci penampung, audit |
| 5 | Antarmuka | Peran admin/petani/demo, konfirmasi aksi, demo baca-saja |
| 6 | AI | Hanya teks; tidak punya jalur ke aktuator; penyaring pesan & keluaran |

## 5. Model Data Utama (ringkas)

| Tabel | Isi |
|---|---|
| `monitorings` | Bacaan sensor (ph, tds, waterTemp, airTemp, humidity, id_meja) |
| `alert_logs` | Peringatan |
| `mejas`, `tanamen` | Meja/penampung dan jenis tanaman |
| `semais` dan tabel tahap | Model tahap yang dipakai antarmuka |
| `siklus_budidaya`, `siklus_lot`, `siklus_transisi`, `permintaan_konfirmasi` | Siklus budidaya baru (API saja) |
| `dosing_events`, `persetujuan_dosing`, `dosing_rounds`, `dosing_transisi` | Alur persetujuan dosing (API saja) |
| `preset_nutrisi`, `preset_versi` | Preset bervesi |
| `konfigurasi_dosis`, `timing_operasi` | Parameter dengan status validasi |
| `saklar_aktuator` | Saklar izin |
| `perintah_aktuator` | Antrean perintah ke ESP32 |
| `kalibrasi_sensor`, `kalibrasi_log` | Kalibrasi |
| `audit_logs`, `users` | Audit dan akun |

Sumber: `backend-nodejs/src/*`, migrasi `backend-nodejs/database/migrations/`.
