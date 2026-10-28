import 'package:flutter/material.dart';

import '../models/monitoring_entry.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/dock.dart';
import '../widgets/charts.dart';
import '../widgets/halaman.dart';
import '../widgets/kpi.dart';
import '../widgets/motion.dart';

/// Sensor realtime — polling /api/latest-sensor (5 detik) dan riwayat grafik.
class SensorPage extends StatefulWidget {
  const SensorPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

  @override
  State<SensorPage> createState() => _SensorPageState();
}

class _SensorPageState extends State<SensorPage> {
  Map<String, dynamic>? _terbaru;
  List<MonitoringEntry> _riwayat = const [];
  String? _galat;
  bool _memuat = true;
  String _pilih = 'ph';

  /// Waktu fetch sukses terakhir; [_putus] = fetch terbaru gagal, data lama ditampilkan.
  DateTime? _sukses;
  bool _putus = false;

  late final PollTimer _pollTerbaru;
  late final PollTimer _pollRiwayat;

  @override
  void initState() {
    super.initState();
    _pollTerbaru = PollTimer(const Duration(seconds: 5), () => _muatTerbaru());
    _pollRiwayat = PollTimer(const Duration(seconds: 30), () => _muatRiwayat());
    _pollTerbaru.atur(widget.aktif);
    _pollRiwayat.atur(widget.aktif);
    _muatTerbaru();
    _muatRiwayat();
  }

  @override
  void didUpdateWidget(covariant SensorPage old) {
    super.didUpdateWidget(old);
    if (old.aktif != widget.aktif) {
      _pollTerbaru.atur(widget.aktif);
      _pollRiwayat.atur(widget.aktif);
      if (widget.aktif) {
        _muatTerbaru();
        _muatRiwayat();
      }
    }
  }

  @override
  void dispose() {
    _pollTerbaru.dispose();
    _pollRiwayat.dispose();
    super.dispose();
  }

  Future<void> _muatTerbaru() async {
    try {
      final d = await widget.api.fetchLatestSensor();
      if (!mounted) return;
      setState(() {
        _terbaru = d;
        _galat = null;
        _memuat = false;
        _sukses = DateTime.now();
        _putus = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (_terbaru == null) {
          _galat = e.message;
        } else {
          _putus = true;
        }
        _memuat = false;
      });
    }
  }

  Future<void> _muatRiwayat() async {
    try {
      final r = await widget.api.fetchMonitoring();
      if (!mounted) return;
      setState(() => _riwayat = r);
    } on ApiException {
      // Grafik opsional: kegagalan riwayat tidak menutup kartu sensor.
    }
  }

  Future<void> _segarkan() async {
    await Future.wait([_muatTerbaru(), _muatRiwayat()]);
  }

  static const _sensor = <_Def>[
    _Def('ph', 'pH', '', 0, 14, Tok.moss, 2),
    _Def('waterTemp', 'Suhu air', '°C', 10, 40, Tok.navy3, 1),
    _Def('tds', 'TDS', 'ppm', 0, 2000, Tok.olive, 0),
    _Def('airTemp', 'Suhu udara', '°C', 10, 45, Tok.warning, 1),
    _Def('humidity', 'Kelembapan', '%', 0, 100, Color(0xFF3A86A8), 0),
  ];

  double? _ambil(MonitoringEntry e, String k) {
    switch (k) {
      case 'ph':
        return e.ph?.toDouble();
      case 'waterTemp':
        return e.waterTemp?.toDouble();
      case 'tds':
        return e.tds?.toDouble();
      case 'airTemp':
        return e.airTemp?.toDouble();
      case 'humidity':
        return e.humidity?.toDouble();
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final t = _terbaru;
    final online = t?['is_online'] == true;

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: _segarkan,
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          PageTop(
            eyebrow: 'Kebun & sensor',
            judul: 'Sensor realtime',
            status: t == null
                ? null
                : StatusPill(
                    terang: true,
                    berdenyut: online,
                    warna: online ? Tok.moss : Tok.warning,
                    teks: online ? 'Online' : 'Offline',
                  ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, DockNav.ruang(context)),
            child: _isi(),
          ),
        ],
      ),
    );
  }

  /// '5 detik lalu' dari selisih detik yang dilaporkan server.
  String _lalu(double detik) => waktuRelatifDari(
    DateTime.now().subtract(Duration(seconds: detik.round())),
  );

  static const _ikon = <String, IconData>{
    'ph': Ikon.tetes,
    'waterTemp': Ikon.kalibrasi,
    'tds': Ikon.dosing,
    'airTemp': Ikon.sensor,
    'humidity': Ikon.air,
  };

  Widget _isi() {
    if (_memuat && _terbaru == null) {
      return const Column(
        children: [
          SkeletonBox(height: 128, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 128, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 240, radius: 24),
        ],
      );
    }
    if (_galat != null && _terbaru == null) {
      return ErrorPanel(
        pesan: _galat!,
        onCoba: () {
          setState(() => _memuat = true);
          _muatTerbaru();
        },
      );
    }

    final t = _terbaru!;
    final online = t['is_online'] == true;
    final ago = keDouble(t['seconds_ago']);
    final s = t['sensor'] is Map ? t['sensor'] as Map : const {};
    final anom = t['anomalies'] is List ? t['anomalies'] as List : const [];
    final bermasalah = <String>{
      for (final a in anom.whereType<Map>()) '${a['sensor']}',
    };

    final def = _sensor.firstWhere(
      (d) => d.kunci == _pilih,
      orElse: () => _sensor.first,
    );
    final deret = <double>[
      for (final e in _riwayat)
        if (_ambil(e, def.kunci) != null) _ambil(e, def.kunci)!,
    ];
    final tampil = deret.length > 96 ? deret.sublist(deret.length - 96) : deret;
    final terakhir = tampil.isEmpty
        ? '—'
        : '${fmtAngka(tampil.last, desimal: def.desimal)}'
              '${def.satuan.isEmpty ? '' : ' ${def.satuan}'}';

    final kpi = <Kpi>[
      for (final d in _sensor)
        Kpi(
          d.label,
          _ikon[d.kunci] ?? Ikon.sensor,
          keDouble(s[d.kunci]),
          d.desimal,
          d.satuan.isEmpty ? '' : ' ${d.satuan}',
          bermasalah.contains(d.kunci) ? 'di luar batas' : 'normal',
          d.kunci == 'ph'
              ? Sorot.hijau
              : d.kunci == 'tds'
              ? Sorot.emas
              : Sorot.kaca,
        ),
      Kpi(
        'Perangkat',
        online ? Ikon.online : Ikon.offline,
        null,
        0,
        '',
        ago == null ? '' : _lalu(ago),
        Sorot.kaca,
        teks: online ? 'Online' : 'Offline',
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_putus && _sukses != null) ...[
          BannerBasi(sejak: _sukses!),
          const SizedBox(height: 16),
        ],
        if (anom.isNotEmpty) ...[
          FadeUp(
            child: Panel(
              warnaTepi: Tok.warning,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Ikon.peringatan, color: Tok.warning),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${anom.length} nilai di luar batas',
                          style: Tok.h3,
                        ),
                        const SizedBox(height: 4),
                        for (final a in anom.whereType<Map>())
                          Text(
                            '${a['sensor']}: ${fmtAngka(a['value'], desimal: 2)} '
                            '(batas ${fmtAngka(a['min'], desimal: 1)}–${fmtAngka(a['max'], desimal: 1)})',
                            style: Tok.kecil,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
        FadeUp(
          delay: FadeUp.urutan(1),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              mainAxisExtent: 128,
            ),
            itemCount: kpi.length,
            itemBuilder: (_, i) => KartuKpi(
              kpi[i],
              terpilih: i < _sensor.length && _sensor[i].kunci == _pilih,
              onTap: i < _sensor.length
                  ? () => setState(() => _pilih = _sensor[i].kunci)
                  : null,
            ),
          ),
        ),
        const SizedBox(height: Tok.sp2),
        const Text('Ketuk kartu untuk melihat grafiknya.', style: Tok.kecil),
        const SizedBox(height: Tok.sp4),
        FadeUp(
          delay: FadeUp.urutan(2),
          child: Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Eyebrow('Grafik riwayat'),
                          Text(
                            '${def.label} · ${tampil.length} titik',
                            style: Tok.kecil,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      terakhir,
                      style: const TextStyle(
                        fontFamily: Tok.fontJudul,
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: Tok.forest,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: Tok.sp3),
                PilPilih(
                  gulir: true,
                  label: [for (final d in _sensor) d.label],
                  pilih: _sensor.indexWhere((d) => d.kunci == _pilih),
                  onPilih: (i) => setState(() => _pilih = _sensor[i].kunci),
                ),
                const SizedBox(height: Tok.sp3),
                LineChart(
                  key: ValueKey('${def.kunci}-${tampil.length}'),
                  nilai: tampil,
                  warna: def.warna,
                  tinggi: 170,
                  deskripsi: tampil.isEmpty
                      ? null
                      : 'Grafik ${def.label}, ${tampil.length} titik, terakhir $terakhir',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Def {
  const _Def(
    this.kunci,
    this.label,
    this.satuan,
    this.min,
    this.max,
    this.warna,
    this.desimal,
  );

  final String kunci;
  final String label;
  final String satuan;
  final double min;
  final double max;
  final Color warna;
  final int desimal;
}
