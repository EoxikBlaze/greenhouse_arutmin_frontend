# RN Mobile — Irisan 0 (Fondasi) + Login + Beranda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** App Expo di `react_native_app/` dengan token desain `.pen`, klien API + sesi, Login, navigasi 5 tab per peran, dan Beranda Admin sesuai desain.

**Architecture:** Expo Router (file-based). `src/theme` memegang token, `src/api` klien + sesi, `src/ui` komponen bersama, `src/features/<alur>` layar. Data lewat TanStack Query.

**Tech Stack:** Expo (TypeScript), expo-router, @tanstack/react-query, expo-secure-store, expo-font + @expo-google-fonts/inter & space-grotesk, lucide-react-native + react-native-svg, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-21-rn-mobile-rebuild-design.md`

## Global Constraints
- Token persis dari `.pen`: surface `#FFFFFF`, surface-soft `#EEF4F0`, text-primary `#12211A`, text-secondary `#556B5E`, accent `#1E7A55`, accent-soft `#E4F1EB`, danger `#B3261E`, danger-soft `#FBEAE8`, warn `#8A5A00`, warn-soft `#FFF3DC`, info `#12507F`, info-soft `#E3F0F9`, border `#D8E3DB`, bg-screen `#B7E2F9`; radius kartu 20, input 12; padding layar 16.
- Font: Space Grotesk (judul/angka), Inter (isi). Bayangan kartu `#0B2A1B` alpha 0x14, y2 blur14.
- Tab: Admin = Beranda·Tanam·Alat·Peringatan·Akun; Petani/Demo = tanpa Alat. Dock melayang radius 31, tinggi 62.
- Backend read-only. Tidak ada angka contoh `.pen` sebagai data.
- Base URL dari `EXPO_PUBLIC_API_BASE` (default `http://127.0.0.1:8000`).

## Review Focus
- Token JWT kedaluwarsa saat pulih sesi (margin 300 dtk) → kembali ke Login.
- Backend tak terjangkau → pesan "Sistem tidak terjangkau…", bukan crash.
- Respons 401 → sesi dibersihkan.
- Role demo menolak request tulis di klien (kecuali /login, /logout).
- `latest-sensor` `is_online=false` → Beranda tampil "HP/perangkat offline" dan kartu "Data basi", bukan nilai segar.

### Task 1: Scaffold + token + font
**Files:** Create `react_native_app/` (create-expo-app), `src/theme/tokens.ts`, `src/theme/fonts.ts`, `__tests__/tokens.test.ts`
**Produces:** `colors`, `radius`, `space`, `fonts`, `shadowCard` dari `src/theme/tokens.ts`.
- [ ] Test `tokens.test.ts`: `colors.accent === '#1E7A55'`, `radius.card === 20`, `space.screen === 16`.
- [ ] Jalankan, harus gagal; implement `tokens.ts`; jalankan, harus lulus.
- [ ] Commit.

### Task 2: Klien API + sesi
**Files:** `src/api/client.ts`, `src/api/session.ts`, `src/api/types.ts`, `__tests__/client.test.ts`
**Produces:** `class ApiClient { login(u,p): Promise<User>; get<T>(path): Promise<T>; role: 'admin'|'petani'|'demo'|null; restore(): Promise<boolean>; logout(): Promise<void>; onUnauthorized }`, `class ApiError { status: number|null; message: string }`, `roleOf(user)`.
- [ ] Test: 401 → `onUnauthorized` dipanggil + token dibersihkan; fetch melempar → `ApiError(null, 'Sistem tidak terjangkau…')`; `restore` menolak token exp < now+300s; demo POST selain /login → ApiError 403 tanpa fetch.
- [ ] Implement dengan `fetch` + `expo-secure-store` (injeksi storage agar bisa dites).
- [ ] Commit.

### Task 3: Komponen bersama
**Files:** `src/ui/{Card,Button,Field,SectionTitle,EmptyState,Banner,Dock,Header,MetricCard}.tsx`, tes render `__tests__/ui.test.tsx`
**Produces:** props mengikuti frame `.pen` (Kartu Metrik: `label, value, status, tone, icon`; Banner: `tone: 'info'|'warn'|'danger'`).
- [ ] Tes render: MetricCard tanpa nilai menampilkan "Belum ada data"; Button menyala `onPress`.
- [ ] Implement, lulus, commit.

### Task 4: Navigasi + Login
**Files:** `app/_layout.tsx`, `app/login.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/{index,tanam,alat,peringatan,akun}.tsx`, `src/features/auth/AuthProvider.tsx`
**Consumes:** `ApiClient`.
- [ ] Gerbang: tanpa sesi → `/login`; Alat disembunyikan untuk non-admin.
- [ ] Login sesuai S02 (Wordmark, input, saklar Ingat saya, banner galat, tombol Masuk).
- [ ] Tes: tab Alat tidak ada untuk petani.
- [ ] Commit.

### Task 5: Beranda Admin
**Files:** `src/features/beranda/{BerandaScreen,useSensor}.tsx`, `app/(tabs)/index.tsx`
**Consumes:** `GET /api/latest-sensor` → `{is_online, seconds_ago, anomalies[], sensor{ph,tds,waterTemp,airTemp,created_at}}`.
- [ ] Layout S10: Header, "Sensor", 4 kartu (pH, Nutrisi/TDS ppm, Suhu air, Suhu udara), meta, "Peringatan terbaru", "Kegiatan tanam", tombol Asisten.
- [ ] `is_online=false` → banner offline + status kartu "Data basi".
- [ ] Commit.

### Task 6: Verifikasi
- [ ] `npx tsc --noEmit`, `npx jest` lulus.
- [ ] `npx expo start --web`, login admin, tangkap layar, bandingkan dengan `.pen`.
