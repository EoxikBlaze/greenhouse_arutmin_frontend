import 'package:flutter/material.dart';

import '../models/monitoring_entry.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/charts.dart';
import '../widgets/motion.dart';

/// Sensor realtime — polling /api/latest-sensor (5 dtk) dan riwayat grafik.
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
    final ago = keDouble(t?['seconds_ago']);

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: _segarkan,
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          HeroHeader(
            judul: 'Sensor realtime',
            subjudul: 'Diperbarui otomatis tiap 5 detik',
            bawah: t == null
                ? null
                : StatusPill(
                    terang: true,
                    berdenyut: online,
                    warna: online ? Tok.moss : Tok.warning,
                    teks: online
                        ? 'Online${ago == null ? '' : ' · ${ago.round()} dtk lalu'}'
                        : 'Offline${ago == null ? '' : ' · ${_durasi(ago)}'}',
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
            child: _isi(),
          ),
        ],
      ),
    );
  }

  String _durasi(double s) {
    if (s < 60) return '${s.round()} dtk';
    if (s < 3600) return '${(s / 60).round()} mnt';
    if (s < 86400) return '${(s / 3600).round()} jam';
    return '${(s / 86400).round()} hari';
  }

  Widget _isi() {
    if (_memuat && _terbaru == null) {
      return const Column(
        children: [
          SkeletonBox(height: 150, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 150, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 190, radius: 14),
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
                  const Icon(Icons.warning_amber_rounded, color: Tok.warning),
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
          child: Panel(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    for (final d in _sensor.take(3))
                      RingGauge(
                        nilai: keDouble(s[d.kunci]),
                        min: d.min,
                        max: d.max,
                        label: d.label,
                        satuan: d.satuan.isEmpty ? 'pH' : d.satuan,
                        warna: d.warna,
                        desimal: d.desimal,
                        ukuran: 92,
                        bahaya: bermasalah.contains(d.kunci),
                      ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    for (final d in _sensor.skip(3))
                      RingGauge(
                        nilai: keDouble(s[d.kunci]),
                        min: d.min,
                        max: d.max,
                        label: d.label,
                        satuan: d.satuan,
                        warna: d.warna,
                        desimal: d.desimal,
                        ukuran: 92,
                        bahaya: bermasalah.contains(d.kunci),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 22),
        FadeUp(delay: FadeUp.urutan(2), child: const Eyebrow('Grafik riwayat')),
        const SizedBox(height: 10),
        FadeUp(
          delay: FadeUp.urutan(3),
          child: Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final d in _sensor)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(d.label),
                            selected: d.kunci == _pilih,
                            showCheckmark: false,
                            selectedColor: Tok.mossGelap,
                            labelStyle: TextStyle(
                              color: d.kunci == _pilih
                                  ? Colors.white
                                  : Tok.tinta,
                              fontWeight: FontWeight.w600,
                              fontSize: 12.5,
                            ),
                            onSelected: (_) => setState(() => _pilih = d.kunci),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                LineChart(
                  key: ValueKey('${def.kunci}-${tampil.length}'),
                  nilai: tampil,
                  warna: def.warna,
                  tinggi: 150,
                  deskripsi: tampil.isEmpty
                      ? null
                      : 'Grafik ${def.label}, ${tampil.length} titik, '
                            'terakhir ${fmtAngka(tampil.last, desimal: def.desimal)} ${def.satuan}',
                ),
                const SizedBox(height: 6),
                Text(
                  tampil.isEmpty
                      ? 'Menunggu data riwayat'
                      : 'Terakhir ${fmtAngka(tampil.last, desimal: def.desimal)} ${def.satuan}'
                            ' · ${tampil.length} titik',
                  style: Tok.kecil,
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
