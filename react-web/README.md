# React Web (SPA) — GARAP

Lokasi project: `Project/Vertoniksmartfarm/react-web-app`

## Jalankan

```bash
cd /Users/rizki/Project/Vertoniksmartfarm/react-web-app
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Buka:
- http://127.0.0.1:5173/dashboard

## Token tema (Arutmin Light — palette hijau)

Sumber token:
- `tailwind.config.js`
- `src/index.css` (base + komponen util)

Warna utama:
- forest `#2D452F`
- olive `#4C6A4B`
- moss `#6B9D4A`
- mint `#CFE2CE`
- page bg `#F4F7F2`
- card `#FFFFFF`
- border `#E2E8DD` / `#D7E0D2`

Font:
- Inter (body) via `@fontsource/inter`
- Space Grotesk (heading) via `@fontsource/space-grotesk`

## Routing (sementara scaffold)

- `/login` → LoginPage (wireframe)
- `/dashboard` → DashboardPage (wireframe)
- lainnya → Placeholder

## API base URL

File: `src/lib/api.ts`

Default:
- `VITE_API_BASE_URL=http://127.0.0.1:8000`

Buat file `.env.local` (opsional):

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

> Catatan: backend Laravel saat ini dominan Blade (return view). Untuk SPA/mobile perlu endpoint JSON yang setara.
