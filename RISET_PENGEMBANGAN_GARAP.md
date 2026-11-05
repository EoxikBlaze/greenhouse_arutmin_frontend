# Laporan Riset: Pengembangan Berikutnya untuk Backend GARAP

**Koreksi rujukan:** RFC 9749 **bukan** refresh token — RFC 9749 = *"Use of VAPID in JMAP Web Push"* (Maret 2025). Rujukan refresh token yang benar: RFC 9700 §4.14.2, draft OAuth 2.1 §4.3.1, dan draft-ietf-oauth-browser-based-apps §4/§8.

## (a) Empat teknologi

| Aspek | Pilihan | Alternatif | Alasan + sumber |
|---|---|---|---|
| Test | **node:test (bawaan Node) + supertest**, DB test pakai PostgreSQL terpisah | Jest, Vitest | Node punya test runner bawaan (nol dependensi, `node --test`) — https://nodejs.org/api/test.html; benchmark overhead terendah milik built-in runner — https://github.com/artemave/node-test-runners-performance-comparison; State of JS 2025: Vitest menyalip Jest, tapi keduanya menambah dependensi berat — https://2025.stateofjs.com/en-US/libraries/testing/. supertest menjalankan server HTTP in-process pada port acak: cepat, deterministik, tanpa skrip start/kill — https://www.npmjs.com/package/supertest. Server sungguhan cukup 1–2 smoke test di CI. |
| Migrasi skema | **node-pg-migrate** | dbmate, golang-migrate, knex, umzug | Khusus Postgres, murni JS, satu devDependency, jalan via `npm run migrate up` + `DATABASE_URL`; pengarangnya menyebut fokus PG membuat tool "jauh lebih sederhana" — https://github.com/salsita/node-pg-migrate. dbmate (CLI Go mandiri, SQL murni, transaksional, versi timestamp) bagus bila tak mau dependensi Node — https://github.com/amacneil/dbmate. golang-migrate (https://github.com/golang-migrate/migrate) setara dbmate. Knex = query builder yang mendekati ORM; umzug butuh keduanya butuh kabelan dialek → terlalu berat untuk proyek tanpa ORM. |
| Validasi input | **Zod** untuk body **dan** `req.params`/`req.query` (middleware `zod-express-middleware` atau helper kecil) | ajv, Joi | Zod: nol dependensi inti, ±2 KB, inferensi TypeScript + konversi JSON Schema bawaan → skema dipakai validasi **dan** dokumentasi OpenAPI — https://zod.dev/; https://www.npmjs.com/package/zod-express-middleware. Studi kasus: Ajv lebih cepat tetapi tanpa inferensi TS, Joi warisan era pra-TypeScript — https://johal.in/war-story-we-cut-api-validation-errors-80. |
| Logging | **pino** (+ `pino-http`, redaction token/password) | Winston | Logger JSON murni, child logger, redaction, proses transport terpisah agar event loop tidak tersendat — https://github.com/pinojs/pino; throughput ~7 juta baris/detik vs Winston — https://dev.to/axiom_agent/nodejs-structured-logging-in-production-pino-correlation-ids-and-log-aggregation-262m. Aman untuk API JSON-only: satu baris JSON per log, mudah diparse di Raspberry Pi. |

## (b) Perbandingan 3 pola autentikasi perangkat (ESP32)

| Pola | Usaha ESP32 | Keamanan | Dasar |
|---|---|---|---|
| API key per device (`device_id` + rahasia unik di header) | **S** — kirim konstanta dari NVS | Sedang; statis, sekali bocor berlaku terus, tanpa anti-replay | OWASP ISVS mewajibkan identitas unik per perangkat (2.1.10) dan kredensial tak-hardcoded (2.1.9) — https://github.com/OWASP/IoT-Security-Verification-Standard-ISVS/blob/master/en/V2-User_Space_Application_Requirements.md. Kunci tunggal seperti sekarang melanggar 2.1.10. |
| **HMAC + timestamp** (atas `method\|path\|ts\|body`, jendela ±60 dtk, di atas HTTPS) | **M** — SHA-256 per request; Espressif menyediakan peripheral HMAC dengan pre-shared key — https://docs.espressif.com/projects/esp-idf/en/stable/esp32c5/api-reference/peripherals/hmac.html | Tinggi untuk skala ini: autentikasi + integritas + anti-replay | ISVS 4.1.1 mewajibkan proteksi replay bawaan kanal komunikasi — https://owasp.org/IoT-Security-Verification-Standard-ISVS/en/V4-Communication_Requirements.html |
| mTLS (sertifikat per device) | **L** — CA, provisioning, rotasi, penyimpanan key di flash; ESP-TLS mendukung `clientcert_buf`/`clientkey_buf` dan PSK — https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/protocols/esp_tls.html | Paling kuat (zero-shared-secret) | Espressif menyarankan TLS untuk semua komunikasi eksternal — https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/security.html; OWASP ISVS 4.1.1 merekomendasikan autentikasi berbasis sertifikat & mutual auth. |

**Rekomendasi:** untuk 2 ESP32 → kunci unik per device + HMAC timestamp (usaha M, menutup celah kunci bersama); mTLS ditunda sampai skala/kebutuhan sertifikasi naik.

## (c) Refresh token (RFC resmi)

- **RFC 9700 §4.14.2** (BCP OAuth 2.0, Jan 2025): server **MUST** mendeteksi pemakaian-ulang refresh token klien publik lewat *sender-constrained* (DPoP/mTLS) **atau** rotasi satu-kali — https://www.rfc-editor.org/rfc/rfc9700.html
- **draft-ietf-oauth-v2-1-16 §4.3.1**: rotasi = token baru setiap refresh, lama dicabut, pemakaian token lama = indikasi kebocoran — https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-16.txt
- **draft-ietf-oauth-browser-based-apps §4/§8**: jika SPA diberi refresh token → **MUST** rotasi + batas lifetime; alternatifnya sah: tidak memberi refresh token sama sekali — https://www.ietf.org/archive/id/draft-ietf-oauth-browser-based-apps-10.txt

**Kesimpulan:** JWT 12 jam tanpa refresh *dapat* diterima untuk aplikasi greenhidroponik first-party (re-login 1×/hari), tetapi biayanya: token curian berlaku penuh 12 jam dan tak dapat dicabut. Refresh token layak dilakukan **setelah** fondasi test & migrasi ada — biaya utamanya di klien React + Flutter, bukan di backend.

## (d) Prioritaskan: 5 pengembangan

| # | Pengembangan | Manfaat | Usaha | Risiko | Alasan + sumber |
|---|---|---|---|---|---|
| 1 | Fondasi pengujian (node:test + supertest + DB test) disertai pino logging | Sangat tinggi | M | Rendah | Tim baru mulai unit test; tanpa jaring pengaman, 3 agent paralel saling menabrak. nodejs.org/api/test.html; pinojs/pino |
| 2 | Tool migrasi berversi (node-pg-migrate) + kolom `device_id` | Tinggi | S–M | Rendah | Skema manual = drift antar dev/CI/Pi; prasyarat wajib untuk #4. github.com/salsita/node-pg-migrate |
| 3 | Validasi Zod body & path param + error handler 400 terstruktur | Tinggi | S–M | Rendah | Menghapus 500 tak terduga dari input tak valid & menyelaraskan OpenAPI. zod.dev |
| 4 | Autentikasi perangkat: kunci unik per device + HMAC/timestamp, hentikan kunci bersama | Sangat tinggi | M | Sedang | OWASP ISVS 2.1.10 & 4.1.1; satu kunci bersama = satu kebocoran membuka semua perangkat. github.com/OWASP/IoT-Security-Verification-Standard-ISVS |
| 5 | Refresh token rotasi (RFC 9700 / OAuth 2.1) | Sedang | M | Sedang | Menutup jendela 12 jam tanpa dapat dicabut; biaya terbesar di klien React+Flutter. rfc-editor.org/rfc/rfc9700.html |

## (e) Sumber
1. https://nodejs.org/api/test.html
2. https://github.com/artemave/node-test-runners-performance-comparison
3. https://2025.stateofjs.com/en-US/libraries/testing/
4. https://www.npmjs.com/package/supertest
5. https://github.com/salsita/node-pg-migrate
6. https://github.com/amacneil/dbmate
7. https://github.com/golang-migrate/migrate
8. https://zod.dev/
9. https://johal.in/war-story-we-cut-api-validation-errors-80
10. https://github.com/pinojs/pino
11. https://github.com/OWASP/IoT-Security-Verification-Standard-ISVS/blob/master/en/V2-User_Space_Application_Requirements.md
12. https://owasp.org/IoT-Security-Verification-Standard-ISVS/en/V4-Communication_Requirements.html
13. https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/protocols/esp_tls.html
14. https://docs.espressif.com/projects/esp-idf/en/stable/esp32c5/api-reference/peripherals/hmac.html
15. https://docs.espressif.com/projects/esp-idf/en/latest/esp32/security/security.html
16. https://www.rfc-editor.org/rfc/rfc9700.html
17. https://www.ietf.org/archive/id/draft-ietf-oauth-v2-1-16.txt
18. https://www.ietf.org/archive/id/draft-ietf-oauth-browser-based-apps-10.txt
19. https://www.rfc-editor.org/info/rfc9749
