# Flowchart Backend — Jalur Satu Request

Sumber kebenaran: `backend-nodejs/src/`. Diagram ini **mermaid** — render otomatis di
GitHub/VS Code/Typora. Versi diagram statis: `docs/jalur-backend.html`.

---

## 1. Flowchart utama (pipeline → guard → handler → database)

```mermaid
flowchart TD
    A["🟢 KLIEN<br/>React :5173 · Flutter · ESP32 · Browser"] --> B["Proxy same-origin<br/>Vite dev / nginx :80"]

    B -->|"Sec-Fetch-Mode: navigate"| SPA["index.html SPA<br/>(request TIDAK ke backend)"]
    B -->|"fetch / curl / Postman / ESP32"| M1

    subgraph PIPE ["PIPELINE — src/index.js (berurutan)"]
        M1["1 · express.json 256 KB"] -->|"JSON rusak"| R400["400 Format JSON tidak valid"]
        M1 --> M2["2 · Header keamanan<br/>nosniff · DENY · no-store"]
        M2 --> M3{"3 · GET + Sec-Fetch-Mode:<br/>navigate?"}
        M3 -->|"ya"| R204["204 kosong<br/>(backend tanpa tampilan)"]
        M3 -->|"tidak"| M4{"4 · Rate limit per IP<br/>GET 300 · tulis 60 · login 10"}
        M4 -->|"melebihi batas"| R429["429 + Retry-After"]
        M4 -->|"lolos"| M5["5 · demoPurge()<br/>hapus data demo > 1 jam"]
        M5 --> M6
    end

    M6{"6 · Cocok mount rute?<br/>app.use di index.js:70-87"} -->|"tidak"| R404["404 JSON generik"]
    M6 -->|"ya"| G1

    subgraph GUARD ["LAPISAN PENJAGA (berurutan per rute)"]
        G1{"Rute butuh<br/>autentikasi / API key?"}
        G1 -->|"publik (login, chart-data, latest-sensor)"| HANDLER
        G1 -->|"butuh"| G2{"Token / X-API-KEY<br/>valid?"}
        G2 -->|"tidak"| R401["401 · 403 Unauthorized"]
        G2 -->|"ya"| G3{"Role diizinkan?<br/>all / admin+demo / petani"}
        G3 -->|"tidak"| R403["403 Akses ditolak"]
        G3 -->|"ya"| G4{"demoGuard / cek<br/>req.user.demo?"}
        G4 -->|"demo dilarang aksi tulis"| R403B["403 Mode demo ..."]
        G4 -->|"admin / petani / tambah-data demo"| HANDLER
    end

    subgraph HANDLER ["HANDLER — src/routes/*.js"]
        HANDLER{"Pakai cache?"}
        HANDLER -->|"ya"| CACHE["cache.js<br/>latest 2 dtk · dashboard 5 dtk<br/>thresholds 60 dtk"]
        HANDLER -->|"tidak"| SQL["SQL parameterized<br/>q() / one() — src/db.js"]
        CACHE -->|"miss"| SQL
        CACHE --> RESP
        SQL --> RESP
        SQL -->|"error"| R500["500 generik<br/>(tanpa stack — lihat temuan §6)"]
        HANDLER -->|"error internal"| R500
    end

    RESP["Respons"] --> J["application/json<br/>200 · 201 · 422"]
    RESP --> CSV["text/csv (3 rute saja)<br/>siklus · laporan · monitoring/tarik"]
    RESP --> DB[("PostgreSQL 17<br/>21 tabel · 8 index")]

    classDef ok fill:#064e3b,stroke:#34d399,color:#fff
    classDef err fill:#450a0a,stroke:#fb7185,color:#fff
    classDef db fill:#2e1065,stroke:#a78bfa,color:#fff
    classDef front fill:#083344,stroke:#22d3ee,color:#fff
    class A,B,SPA front
    class R400,R204,R429,R404,R401,R403,R403B,R500 err
    class DB db
    class M1,M2,M3,M4,M5,M6,G1,G2,G3,G4,HANDLER,CACHE,SQL,RESP,J,CSV ok
```

---

## 2. Cabang role (siapa boleh apa)

```mermaid
flowchart LR
    T["Request dengan<br/>Authorization: Bearer TOKEN"] --> L{"Level dari JWT"}
    L -->|"<b>admin</b>"| ADM["Semua rute<br/>CRUD · water control · user · laporan · WA"]
    L -->|"<b>demo</b>"| DEM["Admin read-only<br/>✔ boleh TAMBAH data sementara (expires 1 jam)<br/>✘ edit · hapus · kelola user · kran · uji WA"]
    L -->|"<b>petani</b>"| PET["Hanya: dashboard · monitoring ·<br/>tanam · profil · logout"]
    L -->|"<b>tanpa token</b>"| N401["401 Tidak terautentikasi"]
    K["ESP32 dengan<br/>X-API-KEY"] -->|kunci cocok| ESP["/api/get-thresholds ·<br/>save-sensor · notif-hardware"]
    K -->|kunci salah| N403["403 Unauthorized"]

    classDef ok fill:#064e3b,stroke:#34d399,color:#fff
    classDef err fill:#450a0a,stroke:#fb7185,color:#fff
    class ADM,DEM,PET,ESP ok
    class N401,N403 err
```

---

## 3. Jalur tulis data ESP32 (satu-satunya alur multi-tabel)

```mermaid
flowchart LR
    E["ESP32 kirim<br/>POST /api/save-sensor"] --> K{"X-API-KEY<br/>timing-safe?"}
    K -->|"salah"| X["403"]
    K -->|"cocok"| CTE["1 CTE tunggal<br/>(1 round-trip)"]
    CTE --> D1["cek duplikat<br/>bandingkan baris sensor terakhir"]
    CTE --> D2["INSERT monitorings<br/>kecuali nilainya sama"]
    CTE --> D3["UPDATE water_controls<br/>state katup + reset AUTO"]
    CTE --> D4["balas command ke ESP32<br/>{status, command, mode}"]
    D1 --> R["Response 200"]
    D2 --> R
    D3 --> R
    D4 --> R
    R -.->|"cache latest-sensor 2 dtk<br/>kedaluwarsa"| SPA["Dashboard SPA<br/>memperbarui diri di polling berikutnya"]

    classDef ok fill:#064e3b,stroke:#34d399,color:#fff
    classDef err fill:#450a0a,stroke:#fb7185,color:#fff
    class E,K,CTE,D1,D2,D3,D4,R,SPA ok
    class X err
```

---

## 4. Peta keputusan → file sumber

| Titik keputusan | File : baris |
|---|---|
| navigasi → 204 | `src/index.js:35-40` |
| rate limit 300/60/10 | `src/index.js:45-52` + `src/rateLimit.js` |
| mount & guard per grup | `src/index.js:70-87` |
| JWT / role / demo / API-key | `src/auth.js` |
| cache TTL | `src/cache.js` (`remember(key, ttl, fn)`) |
| query & pool | `src/db.js` |
| 404 / 500 generik | `src/index.js:90-101` |

Cara membaca: **setiap panah merah = respons error yang bisa muncul**, hijau = lolos.
Titik paling sering jadi sumber bug: `M6` (rute tak dikenal) dan `G4` (demo diizinkan/tidak).
