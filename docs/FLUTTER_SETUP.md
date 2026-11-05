# Setup Flutter + iOS Simulator di Mac (GARAP)

Tutorial klik-per-klik untuk menjalankan aplikasi Flutter di **iOS Simulator**
pada Mac Apple Silicon. Semua command siap salin.

---

## Langkah 0 — Prasyarat

| Kebutuhan | Versi minimum | Cek |
|---|---|---|
| macOS | Ventura+ | `sw_vers` |
| Flutter SDK | 3.47+ | `flutter --version` |
| Xcode | 26+ (App Store) | `xcodebuild -version` |
| CocoaPods | 1.15+ | `pod --version` |
| Disk kosong | ±25 GB (untuk Xcode + runtime) | `df -h /` |

---

## Langkah 1 — Install Xcode (±15 GB, butuh waktu)

1. Buka **App Store** → cari **Xcode** → klik **GET / Install**
   (atau jalankan: `open "macappstore://apps.apple.com/app/xcode/id497799835"`)
2. Tunggu unduhan selesai (bisa 30–60 menit tergantung internet).
3. **Buka Xcode sekali** dari Launchpad → setujui lisensi →
   bila diminta "Additional Components", klik **Install**.

Alternatif CLI (butuh password Mac saat diminta):
```bash
mas get 497799835
```

---

## Langkah 2 — Aktifkan toolchain Xcode

```bash
# arahkan xcode-select ke Xcode (bukan CommandLineTools)
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# setuju lisensi + first launch
sudo xcodebuild -runFirstLaunch

# verifikasi
xcodebuild -version
```
Harus keluar: `Xcode 26.x` + `Build version ...`.

---

## Langkah 3 — Download iOS Simulator runtime

```bash
xcodebuild -downloadPlatform iOS
```
(±3–7 GB; sekali saja.) Verifikasi:
```bash
xcrun simctl list runtimes
# harus ada: iOS 26.x (Simulator)
```

---

## Langkah 4 — Install CocoaPods

```bash
brew install cocoapods
pod --version
```

---

## Langkah 5 — Cek kesehatan toolchain

```bash
flutter doctor
```
Target: **Xcode** dan **CocoaPods** hijau `[✓]`.
(Android boleh merah — tidak dipakai untuk simulator iOS.)

---

## Langkah 6 — Siapkan Simulator iPhone

```bash
# lihat device yang tersedia
xcrun simctl list devices available

# boot simulator iPhone (contoh: iPhone 17)
xcrun simctl boot "iPhone 17" 2>/dev/null || true
open -a Simulator
```
Jika daftar kosong, buat dari Xcode: **Xcode → Window → Devices and Simulators → +**.

---

## Langkah 7 — Jalankan aplikasi

```bash
cd ~/Project/Vertoniksmartfarm/flutter_mobile_app
flutter pub get
flutter run -d "iPhone 17"
```
Tekan `q` untuk berhenti, `r` hot reload, `R` hot restart.

---

## Koneksi ke backend lokal

App memanggil `http://127.0.0.1:8000/api/latest-sensor`.
Di iOS Simulator, `127.0.0.1` = Mac itu sendiri — jadi:

1. Pastikan backend Node.js hidup:
   ```bash
   cd ~/Project/Vertoniksmartfarm/backend-nodejs && node src/index.js
   ```
2. Simulator otomatis bisa mengaksesnya (tanpa konfigurasi).
3. Untuk **HP asli** nanti: ganti `apiBase` di `lib/main.dart`
   dengan IP Mac di jaringan LAN (mis. `http://192.168.1.5:8000`) —
   dan jalankan backend dengan `HOST=0.0.0.0 node src/index.js`.

Catatan keamanan: `ios/Runner/Info.plist` sudah berisi
`NSAllowsLocalNetworking` — hanya mengizinkan HTTP ke host lokal,
bukan HTTP sembarangan.

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `xcode-select: error ... CommandLineTools` | Ulang Langkah 2 |
| `CocoaPods not installed` | `brew install cocoapods` lalu `cd ios && pod install` |
| `Unable to boot device in current state: Booted` | Device sudah nyala — abaikan, lanjut `flutter run` |
| Simulator tidak muncul di `flutter devices` | Buka Xcode sekali (first launch) lalu `flutter doctor` |
| App tampil "Backend tidak terjangkau" | Backend belum jalan — cek `curl http://127.0.0.1:8000/api/latest-sensor` |
| Build iOS lama pertama kali | Normal (±2–5 menit) |
