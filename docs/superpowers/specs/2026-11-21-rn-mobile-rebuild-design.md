# GARAP Mobile — rebuild ke React Native (Expo)

Tanggal: 2026-11-21 · Status: menunggu persetujuan

## Tujuan dan alasan
Mengganti app Flutter (`flutter_mobile_app/`) dengan app React Native yang terasa seperti app native sungguhan, memakai desain baru "Blue Greenhouse v2" (file `.pen`). Pemilik ingin tampilan baru total, konsisten, tidak generik, dan meyakinkan sebagai app nyata.

## Goals
- Semua layar dan keadaan di `.pen` (46 frame: Cek Sesi, Login, Beranda ×5 varian, Sensor ×5, Grafik ×3, Tanam, Detail Batch, Mulai Semai, Konfirmasi ×2, Peringatan ×4, Alat, Saklar, Konfirmasi Perangkat ×3, Kalibrasi, Asisten ×2, Akun, Ganti Sandi, Tentang & Tampilan) dibangun persis: warna, tipografi, radius, jarak, komponen.
- Menyamai fitur Flutter lama yang tidak ada di desain: **Uji Lab, Laporan PDF, CCTV**, dengan layar baru yang dirancang memakai komponen dan token yang sama.
- Responsif sesuai contoh di `.pen`: 320–360dp satu kolom, ≥600dp dua panel, teks 200% tanpa terpotong, lanskap.
- Navigasi sesuai "Peta Alur": Admin = Beranda·Tanam·Alat·Peringatan·Akun; Petani/Demo = Beranda·Tanam·Peringatan·Akun. Banner global berprioritas E-STOP > HP Offline > Mode Demo.

## Non-goals
- Tidak mengubah backend (read-only). Kontrak API mengikuti `docs/API_ROUTES.md`, `docs/KONTRAK_API.md`, dan `flutter_mobile_app/lib/services/api_service.dart`.
- Tidak mengubah `react-web-app/`.
- Tidak memakai NativeWind/Tailwind.

## Anti-goals (gagal walau berjalan)
- Desain melenceng dari `.pen`, atau terlihat seperti template generik.
- Layar bergaya berbeda-beda antar irisan.
- Angka contoh dari desain tampil sebagai data nyata.

## Pendekatan (dipilih: B)
- A. Semua layar sekaligus: tidak ada umpan balik di tengah, risiko arah salah.
- **B. Irisan per alur (dipilih):** fondasi lalu satu alur penuh per irisan, tiap irisan bisa dicoba.
- C. Port layar Flutter satu per satu: struktur lama bertentangan dengan navigasi baru.

## Keputusan teknis (pilihan saya, bisa dikoreksi)
- Folder `greenhouse_arutmin_frontend/react_native_app/`; Flutter tetap sampai paritas, lalu dihapus.
- Expo (TypeScript) + Expo Router; TanStack Query; `expo-secure-store` (sesi); `expo-notifications`; `expo-print` + `expo-sharing` (PDF); `react-native-svg` (grafik).
- Gaya: token dari `.pen` di satu modul TS + `StyleSheet`. Font Inter dan Space Grotesk.
- Token inti: surface `#FFFFFF`, surface-soft `#EEF4F0`, teks `#12211A`/`#556B5E`, aksen `#1E7A55`/`#E4F1EB`, danger `#B3261E`, warn `#8A5A00`, info `#12507F`, border `#D8E3DB`, radius kartu 20, radius input 12, padding layar 16, bg layar `#B7E2F9`.
- Efek yang tidak bisa persis di native (blur, bayangan): pakai padanan terdekat dan dicatat.

## Urutan irisan
0. Fondasi: Expo, token, font, komponen bersama (dari frame "Komponen GARAP"), navigasi 5 tab per peran, klien API, sesi.
1. Masuk dan Beranda (semua varian).
2. Sensor dan Grafik.
3. Tanam (batch, semai, konfirmasi).
4. Peringatan.
5. Alat, Saklar, Konfirmasi Perangkat, Kalibrasi.
6. Asisten dan Akun.
7. Menu baru: Uji Lab, Laporan PDF, CCTV (desain dibuat dulu, ditinjau pemilik, baru dibangun).

## Penempatan menu baru (usulan saya, belum disetujui)
Tab bar tetap lima, tanpa tab "Lainnya".
- Tab **Alat** (admin): baris Uji Lab dan Laporan di samping Saklar dan Kalibrasi.
- **Beranda** (semua peran): baris pintasan CCTV, karena di web CCTV menu umum.
- Laporan hanya admin, sesuai web.
- Perlu dicek lagi terhadap peran di Flutter saat irisan 7.

## Diserahkan ke pembangun
Pilihan library grafik dan detail animasi, selama hasilnya sesuai desain.

## Risiko dan hal yang belum diverifikasi
- Backend tidak mengirim header CORS: tidak berpengaruh di app native, hanya di browser/web preview.
- Format respons API (bagian terenkripsi?) harus dicek di `api_service.dart` saat irisan 0.
- Belum ada perangkat atau emulator Android yang jalan di mesin ini; uji awal lewat Expo Go atau web preview.
