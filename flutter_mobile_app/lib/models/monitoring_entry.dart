/// Model satu baris riwayat monitoring (GET /monitoring/chart-data).
class MonitoringEntry {
  const MonitoringEntry({
    this.id,
    this.idMeja,
    this.waterTemp,
    this.ph,
    this.tds,
    this.airTemp,
    this.humidity,
    this.ecMsCm,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String? idMeja;
  final num? waterTemp;
  final num? ph;
  final num? tds;
  final num? airTemp;
  final num? humidity;
  final num? ecMsCm;
  final String? createdAt;
  final String? updatedAt;

  static num? _asNum(dynamic v) {
    if (v == null) return null;
    if (v is num) return v;
    return num.tryParse(v.toString());
  }

  static String? _asString(dynamic v) => v?.toString();

  factory MonitoringEntry.fromMap(Map<String, dynamic> map) => MonitoringEntry(
    id: _asString(map['id']),
    idMeja: _asString(map['id_meja']),
    waterTemp: _asNum(map['waterTemp']),
    ph: _asNum(map['ph']),
    tds: _asNum(map['tds']),
    airTemp: _asNum(map['airTemp']),
    humidity: _asNum(map['humidity']),
    ecMsCm: _asNum(map['ec_ms_cm']),
    createdAt: _asString(map['created_at']),
    updatedAt: _asString(map['updated_at']),
  );
}
