/// Konfigurasi backend GARAP — satu sumber kebenaran untuk alamat API.
///
/// Di iOS Simulator / macOS, `127.0.0.1` menunjuk ke mesin host sehingga
/// tidak perlu konfigurasi tambahan.
library;

const String apiBase = 'http://127.0.0.1:8000';

/// Batas waktu tunggu tiap request API (detik).
const int apiTimeoutSeconds = 10;
