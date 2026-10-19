/// Model baris tabel `mejas`.
///
/// Kontrak backend (GET /meja) mengembalikan 13 kolom per baris:
/// 1 PK + 9 kolom tulis + 3 stempel waktu — daftar lengkap ada di [Meja.columns]
/// dan dipertegas oleh `test/api_service_test.dart`.
class Meja {
  const Meja({
    required this.idMeja,
    required this.meja,
    this.jumlahLubang,
    this.jenisTalang,
    this.kapasitasPenampungL,
    this.jumlahTalang,
    this.lubangPerTalang,
    this.panjangTalangM,
    this.lajuPerTalangLpm,
    this.kenaikanAirCm,
    this.createdAt,
    this.updatedAt,
    this.expiresAt,
  });

  final String idMeja;
  final String meja;
  final int? jumlahLubang;
  final String? jenisTalang;
  final num? kapasitasPenampungL;
  final int? jumlahTalang;
  final int? lubangPerTalang;
  final num? panjangTalangM;
  final num? lajuPerTalangLpm;
  final int? kenaikanAirCm;
  final String? createdAt;
  final String? updatedAt;
  final String? expiresAt;

  /// Urutan kolom sesuai hasil SELECT backend (13 kolom).
  static const List<String> columns = [
    'id_meja',
    'meja',
    'jumlah_lubang',
    'jenis_talang',
    'kapasitas_penampung_l',
    'jumlah_talang',
    'lubang_per_talang',
    'panjang_talang_m',
    'laju_per_talang_lpm',
    'kenaikan_air_cm',
    'created_at',
    'updated_at',
    'expires_at',
  ];

  static int? _asInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString());
  }

  static num? _asNum(dynamic v) {
    if (v == null) return null;
    if (v is num) return v;
    return num.tryParse(v.toString());
  }

  static String? _asString(dynamic v) => v?.toString();

  factory Meja.fromMap(Map<String, dynamic> map) => Meja(
        idMeja: (map['id_meja'] ?? '').toString(),
        meja: (map['meja'] ?? '').toString(),
        jumlahLubang: _asInt(map['jumlah_lubang']),
        jenisTalang: _asString(map['jenis_talang']),
        kapasitasPenampungL: _asNum(map['kapasitas_penampung_l']),
        jumlahTalang: _asInt(map['jumlah_talang']),
        lubangPerTalang: _asInt(map['lubang_per_talang']),
        panjangTalangM: _asNum(map['panjang_talang_m']),
        lajuPerTalangLpm: _asNum(map['laju_per_talang_lpm']),
        kenaikanAirCm: _asInt(map['kenaikan_air_cm']),
        createdAt: _asString(map['created_at']),
        updatedAt: _asString(map['updated_at']),
        expiresAt: _asString(map['expires_at']),
      );
}
