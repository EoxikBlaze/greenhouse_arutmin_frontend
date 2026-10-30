# Setup Report — GARAP (macOS)

Tanggal: 2026-10-14

## 1) Kondisi environment saat ini (hasil cek)

| Tool | Status | Versi / Catatan |
|---|---|---|
| PHP | OK | PHP 8.5.11 (Homebrew) |
| Composer | OK | Composer 2.10.3 |
| Node.js | OK | v26.7.0 |
| npm | OK | 11.19.0 |
| Homebrew | OK | 7.0.9 |
| Flutter | BELUM ADA | `flutter: command not found` |
| Xcode | BELUM ADA | `xcodebuild` butuh Xcode (saat ini hanya CommandLineTools) |
| CocoaPods | BELUM ADA | `pod: command not found` |
| Java (Android) | BELUM ADA | JRE tidak ditemukan |
| adb (Android) | BELUM ADA | `adb` tidak ditemukan |

## 2) Instalasi yang disarankan (Homebrew)

> Catatan: Xcode wajib install via App Store (manual), tidak via Homebrew.

### Web (React)

```bash
brew install pnpm
```

### Flutter SDK

```bash
brew install --cask flutter
flutter --version
flutter doctor -v
```

### iOS (wajib untuk build iOS)

1. Install **Xcode** dari App Store (manual)
2. Setelah itu jalankan:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
brew install cocoapods
pod --version
flutter doctor -v
```

### Android

```bash
brew install openjdk@17
brew install --cask android-studio
```

Set `JAVA_HOME` (zsh):

```bash
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@17"' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
java -version
```

Lalu buka Android Studio → install SDK + platform tools (adb), kemudian:

```bash
adb version
flutter doctor -v
```

## 3) Catatan penting untuk project ini

- Mockups/wireframe HTML yang tersedia saat ini berada di:
  - `/Users/rizki/Project/Vertoniksmartfarm/mockups/uiux/*.html`
- Backend Laravel yang ada saat ini berada di:
  - `/Users/rizki/Documents/Vertonik-Smart-Farm`
- Routes yang terdeteksi (wajib dipertahankan namanya) ada di `routes/web.php` & `routes/api.php`.

## 4) Next steps (otomatis di folder project)

- React web SPA: dibuat di `/Users/rizki/Project/Vertoniksmartfarm/react-web-app`
- Flutter mobile: akan dibuat setelah Flutter terpasang.
