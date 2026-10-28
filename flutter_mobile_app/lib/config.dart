/// Konfigurasi backend — satu sumber kebenaran untuk alamat API.
///
/// Alamat bisa diganti TANPA mengubah kode lewat `--dart-define`:
///
/// * Mesin lokal (default)      : `flutter run` → `http://127.0.0.1:8000`
/// * Di Raspberry Pi            : `flutter run --dart-define=API_BASE=http://192.168.x.x:8000`
/// * Android emulator (AVD)     : `--dart-define=API_BASE=http://10.0.2.2:8000`
///   (127.0.0.1 di AVD menunjuk ke AVD itu sendiri, bukan komputer host)
/// * Android/iOS fisik di LAN   : `--dart-define=API_BASE=http://<IP-host>:8000`
///
/// iOS Simulator / macOS: `127.0.0.1` menunjuk ke mesin host, jadi cukup
/// `flutter run` tanpa parameter tambahan.
library;

/// Alamat backend. Nilai default dipakai bila `API_BASE` tidak diberikan.
const String apiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'http://127.0.0.1:8000',
);

/// Batas waktu tunggu tiap request API (detik).
const int apiTimeoutSeconds = 10;
