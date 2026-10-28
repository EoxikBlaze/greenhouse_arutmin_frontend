import 'package:flutter/material.dart';

import '../models/monitoring_entry.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import 'brand.dart';
import 'halaman.dart';
import 'motion.dart';

/// Grafik batang tren sensor (padanan `TrenBatang` di web): GET /monitoring/chart-data,
/// 14 bacaan terakhir, tab pH / Suhu air / TDS. Batang terbaru emas-hijau, sisanya
/// hijau tua; tinggi dinormalisasi ke rentang data agar perubahan kecil tetap terlihat.
class TrenBatang extends StatefulWidget {
  const TrenBatang({super.key, required this.api, this.versi = 0});

  final ApiService api;

  /// Naikkan nilainya untuk memuat ulang (mis. saat tarik-untuk-segarkan).
  final int versi;

  @override
  State<TrenBatang> createState() => _TrenBatangState();
}

class _Param {
  const _Param(this.label, this.ambil, this.satuan, this.desimal);

  final String label;
  final num? Function(MonitoringEntry) ambil;
  final String satuan;
  final int desimal;
}

class _TrenBatangState extends State<TrenBatang> {
  static const _jumlah = 14;
  static final _param = <_Param>[
    _Param('pH', (e) => e.ph, '', 2),
    _Param('Suhu air', (e) => e.waterTemp, ' °C', 1),
    _Param('TDS', (e) => e.tds, ' ppm', 0),
  ];

  List<MonitoringEntry> _data = const [];
  bool _memuat = true;
  String? _galat;
  int _pilih = 0;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void didUpdateWidget(covariant TrenBatang old) {
    super.didUpdateWidget(old);
    if (old.versi != widget.versi) _muat();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.fetchMonitoring();
      if (!mounted) return;
      setState(() {
        _data = d;
        _galat = null;
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (_data.isEmpty) _galat = e.message;
        _memuat = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _param[_pilih];
    final titik = <({String iso, double y})>[
      for (final e in _data)
        if (e.createdAt != null && p.ambil(e) != null)
          (iso: e.createdAt!, y: p.ambil(e)!.toDouble()),
    ];
    final batang = titik.length > _jumlah
        ? titik.sublist(titik.length - _jumlah)
        : titik;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(child: Eyebrow('Tren sensor')),
              PilPilih(
                label: [for (final x in _param) x.label],
                pilih: _pilih,
                onPilih: (i) => setState(() => _pilih = i),
              ),
            ],
          ),
          const SizedBox(height: Tok.sp3),
          if (_memuat && _data.isEmpty)
            const SkeletonBox(height: 170, radius: 14)
          else if (_galat != null || batang.isEmpty)
            SizedBox(
              height: 170,
              child: Center(
                child: Text(
                  _galat ?? 'Belum ada bacaan untuk ditampilkan.',
                  textAlign: TextAlign.center,
                  style: Tok.kecil,
                ),
              ),
            )
          else
            _Batang(key: ValueKey(_pilih), batang: batang, param: p),
        ],
      ),
    );
  }
}

class _Batang extends StatelessWidget {
  const _Batang({super.key, required this.batang, required this.param});

  final List<({String iso, double y})> batang;
  final _Param param;

  @override
  Widget build(BuildContext context) {
    final ys = [for (final b in batang) b.y];
    final min = ys.reduce((a, b) => a < b ? a : b);
    final max = ys.reduce((a, b) => a > b ? a : b);
    final span = max - min == 0 ? 1.0 : max - min;
    final kurangiGerak = MediaQuery.disableAnimationsOf(context);
    final akhir = batang.last;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 170,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (var i = 0; i < batang.length; i++)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2.5),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween<double>(
                        begin: 0,
                        end: 0.22 + ((batang[i].y - min) / span) * 0.78,
                      ),
                      duration: kurangiGerak
                          ? Duration.zero
                          : Duration(milliseconds: 420 + i * 40),
                      curve: Tok.ease,
                      builder: (context, v, _) => Align(
                        alignment: Alignment.bottomCenter,
                        child: FractionallySizedBox(
                          heightFactor: v,
                          widthFactor: 1,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: i == batang.length - 1
                                    ? const [Color(0xFFF0D660), Tok.moss]
                                    : const [Tok.olive, Tok.forest],
                              ),
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(8),
                                topRight: Radius.circular(8),
                                bottomLeft: Radius.circular(3),
                                bottomRight: Radius.circular(3),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              waktuPendek(batang.first.iso),
              style: Tok.kecil.copyWith(fontSize: 11),
            ),
            Text(
              waktuPendek(akhir.iso),
              style: Tok.kecil.copyWith(fontSize: 11),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            style: Tok.kecil,
            children: [
              const TextSpan(text: 'Terbaru: '),
              TextSpan(
                text:
                    '${akhir.y.toStringAsFixed(param.desimal)}${param.satuan}',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Tok.tinta,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
