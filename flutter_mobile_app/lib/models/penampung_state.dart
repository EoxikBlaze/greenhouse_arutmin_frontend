/// Status pengaman dosis satu penampung (baris GET /penampung-states).
///
/// LOCK dipasang otomatis oleh backend (retry habis, jatah kejadian/volume
/// harian habis, bacaan sensor mustahil) dan hanya dibuka admin lewat
/// POST /api/aktuator/penampung/:id/buka-kunci.
class PenampungState {
  const PenampungState({
    required this.idMeja,
    required this.nama,
    required this.terkunci,
    this.alasan,
    this.sejak,
    this.kejadianHari = 0,
    this.volumeAbMl = 0,
    this.volumePhMl = 0,
    this.pemeliharaan = false,
  });

  final String idMeja;
  final String nama;
  final bool terkunci;
  final String? alasan;
  final String? sejak;
  final int kejadianHari;
  final double volumeAbMl;
  final double volumePhMl;
  final bool pemeliharaan;

  static double _angka(dynamic v) {
    if (v is num) return v.toDouble();
    return double.tryParse('${v ?? ''}') ?? 0;
  }

  factory PenampungState.fromMap(Map<String, dynamic> map, String nama) =>
      PenampungState(
        idMeja: '${map['id_meja'] ?? ''}',
        nama: nama,
        terkunci: map['status_lock'] == true,
        alasan: map['lock_alasan']?.toString(),
        sejak: map['lock_sejak']?.toString(),
        kejadianHari: _angka(map['kejadian_dosis_hari']).toInt(),
        volumeAbMl: _angka(map['volume_ab_hari_ml']),
        volumePhMl: _angka(map['volume_ph_hari_ml']),
        pemeliharaan: map['mode_pemeliharaan'] == true,
      );
}

/// Gabungkan baris status dengan nama dari GET /meja (cadangan: "Penampung #id").
List<PenampungState> gabungPenampung(List<dynamic> states, List<dynamic> meja) {
  final nama = <String, String>{
    for (final m in meja.whereType<Map<String, dynamic>>())
      '${m['id_meja']}': '${m['meja'] ?? ''}',
  };
  return states
      .whereType<Map<String, dynamic>>()
      .map((s) {
        final id = '${s['id_meja'] ?? ''}';
        final n = nama[id] ?? '';
        return PenampungState.fromMap(s, n.isEmpty ? 'Penampung #$id' : n);
      })
      .toList(growable: false);
}
