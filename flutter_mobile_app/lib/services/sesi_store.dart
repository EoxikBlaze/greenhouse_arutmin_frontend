import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tempat menyimpan sesi login (token + profil singkat) agar petani tidak perlu
/// mengetik kata sandi setiap membuka aplikasi. Bisa diganti tiruan di unit test.
abstract class PenyimpanSesi {
  Future<String?> baca();
  Future<void> tulis(String? isi);
}

/// Keychain (iOS) / Keystore (Android). Token kedaluwarsa sendiri (12 jam, lihat backend).
class PenyimpanSesiAman implements PenyimpanSesi {
  const PenyimpanSesiAman();

  static const _kunci = 'garap_sesi';
  static const _simpan = FlutterSecureStorage();

  @override
  Future<String?> baca() => _simpan.read(key: _kunci);

  @override
  Future<void> tulis(String? isi) => isi == null
      ? _simpan.delete(key: _kunci)
      : _simpan.write(key: _kunci, value: isi);
}
