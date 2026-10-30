# Redesign UI/UX GARAP v2 — Glassmorphism (web + APK)

Rencana lengkap: `C:\Users\HYPE AMD\.claude\plans\bahas-1-3-dulu-sprightly-stonebraker.md`.

## Keputusan
- Warna tetap. Glass asli (blur) hanya untuk chrome (topbar, sidebar, dock, modal, toast); kartu glass ringan tanpa blur; tabel/form/tombol/peringatan solid.
- Anggaran blur: maksimal 3 elemen per layar.
- Ikon Lucide (web + Flutter). Latar gradien palet. Font Flutter = web (Inter + Space Grotesk).
- Web dan app dikerjakan per fase bersamaan. Dark mode, backend, fitur baru di luar cakupan.

## Fase
F0 fondasi → F1 navigasi → F2 komponen bersama → F3 halaman (A, B, C) → F4 gerak → F5 pembersihan + audit.

## Restore
`restore/redesign-awal` (HEAD `4149e95`). Rencana tahap 3 diarsipkan di `tasks/archive-tahap3-*.md`.
