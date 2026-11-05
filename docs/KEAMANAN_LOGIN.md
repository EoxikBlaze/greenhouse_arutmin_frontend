# Audit Keamanan Login — GARAP

Tanggal: 2026-10-15 · Verifikasi live terhadap jalur web (:5173 → backend).

## Kesimpulan: LOGIN SUDAH AMAN ✅

| Lapisan | Pengamanan | Bukti uji live |
|---|---|---|
| Password di server | bcrypt cost 12 (kompatibel hash `$2y$` Laravel) | hash `$2b$12$...` di DB, plaintext tak pernah tersimpan |
| Pengiriman | HTTPS siap (dev: same-origin proxy, backend tak terlihat) | domain backend 0× di bundle |
| Brute force | rate limit **10 login/menit per IP** → `429` + `Retry-After` | 12× tebak → 429 di percobaan ke-8 |
| User enumeration | pesan generik "Username / Password salah." untuk semua kasus | user tak ada vs password salah → pesan identik |
| Kebocoran rahasia | response tak pernah berisi password/hash | keys user: id, username, email, level, is_demo |
| Token sesi | JWT HS256, **kedaluwarsa 12 jam**, klaim minimal (tanpa rahasia) | payload: sub, username, level, demo, exp |
| Otorisasi | Bearer token wajib di semua API | tanpa token → 401; token benar → 200 |
| CSRF | token di header (bukan cookie) → tidak bisa dipalsukan lintas situs | desain |
| XSS | password tidak pernah disimpan di storage; token di sessionStorage (hilang saat tab ditutup) | kode |
| Salah kata sandi | tetap di /login + banner error, tidak redirect | E2E browser PASS |
| Login benar | redirect sesuai role (`/dashboard`, petani → `/tanam`) | E2E browser PASS |

## Hasil uji otomatis (8/8 + E2E)

1. login sukses via proxy web ✓
2. /profil + token → 200 ✓
3. /profil tanpa token → 401 ✓
4. /dashboard tanpa token → 401 ✓
5. /dashboard + token → 200 JSON ✓
6. navigasi browser → halaman SPA (bukan API) ✓
7. login salah → 422 pesan generik ✓
8. brute force → 429 ✓
9. E2E browser: salah password ditolak, benar → /dashboard ✓

## Bug yang ditemukan saat audit ini

- **Proxy dev Vite tidak meneruskan API JSON** untuk rute ganda (/dashboard,
  /profil, dst.) — request API mendapat HTML SPA. **Diperbaiki**: aturan proxy
  membedakan navigasi browser vs fetch (sama dengan nginx produksi).

## Rekomendasi lanjutan (opsional)

- Di produksi: aktifkan HTTPS (certbot) — flag `HTTPS=1` sudah tersedia.
- Pertimbangkan refresh token bila sesi > 12 jam dibutuhkan.
