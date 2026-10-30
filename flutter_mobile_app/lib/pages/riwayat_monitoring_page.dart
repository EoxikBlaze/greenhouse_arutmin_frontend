import 'package:flutter/material.dart';

import '../models/monitoring_entry.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/halaman.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Riwayat monitoring — GET /monitoring/chart-data (butuh token).
class RiwayatMonitoringPage extends StatefulWidget {
  const RiwayatMonitoringPage({super.key, required this.api});

  final ApiService api;

  @override
  State<RiwayatMonitoringPage> createState() => _RiwayatMonitoringPageState();
}

class _RiwayatMonitoringPageState extends State<RiwayatMonitoringPage>
    with AutomaticKeepAliveClientMixin {
  /// Server mengirim sampai 288 baris sekaligus; tampilkan bertahap.
  static const _halaman = 30;

  List<MonitoringEntry>? _items;
  String? _error;
  bool _loading = false;
  int _tampil = _halaman;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await widget.api.fetchMonitoring();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
        _loading = false;
        _tampil = _halaman;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  String _fmt(num? v, {int desimal = 1}) {
    if (v == null) return '-';
    return v is int ? v.toString() : v.toStringAsFixed(desimal);
  }

  /// Daftar yang bisa ditarik untuk refresh walau isinya pendek / kosong.
  Widget _tarikRefresh(List<Widget> anak) => RefreshIndicator(
    color: Tok.moss,
    onRefresh: _load,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: anak,
    ),
  );

  @override
  Widget build(BuildContext context) {
    super.build(context);
    Widget body;
    if (_loading && _items == null && _error == null) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBox(height: 96, radius: 14),
          SizedBox(height: Tok.sp3),
          SkeletonBox(height: 96, radius: 14),
          SizedBox(height: Tok.sp3),
          SkeletonBox(height: 96, radius: 14),
        ],
      );
    } else if (_error != null) {
      body = _tarikRefresh([ErrorPanel(pesan: _error!, onCoba: _load)]);
    } else if (_items == null || _items!.isEmpty) {
      body = _tarikRefresh(const [
        Panel(child: Text('Belum ada data monitoring.', style: Tok.kecil)),
      ]);
    } else {
      final semua = _items!;
      final tampil = semua.length < _tampil ? semua.length : _tampil;
      final adaLagi = semua.length > tampil;
      body = RefreshIndicator(
        color: Tok.moss,
        onRefresh: _load,
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          itemCount: tampil + 1 + (adaLagi ? 1 : 0),
          itemBuilder: (context, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  'Menampilkan $tampil dari ${semua.length} catatan sensor terbaru',
                  style: Tok.kecil,
                ),
              );
            }
            if (i > tampil) {
              final sisa = semua.length - tampil;
              final tambah = sisa < _halaman ? sisa : _halaman;
              return Center(
                child: TextButton(
                  onPressed: () => setState(() => _tampil += _halaman),
                  child: Text('Tampilkan $tambah lagi'),
                ),
              );
            }
            final e = semua[i - 1];
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Panel(
                padding: const EdgeInsets.all(Tok.sp4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Tok.moss.withValues(alpha: 0.16),
                          ),
                          child: Icon(Ikon.sensor, size: 16, color: Tok.forest),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            waktuPendek(e.createdAt),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        if (e.idMeja != null)
                          Text('Meja ${e.idMeja}', style: Tok.kecil),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MiniNilai('pH', _fmt(e.ph, desimal: 2)),
                        MiniNilai('Suhu air', '${_fmt(e.waterTemp)} °C'),
                        MiniNilai('TDS', '${_fmt(e.tds, desimal: 0)} ppm'),
                        MiniNilai('Suhu udara', '${_fmt(e.airTemp)} °C'),
                        MiniNilai(
                          'Kelembapan',
                          '${_fmt(e.humidity, desimal: 0)} %',
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: const AppBarGlass(judul: 'Riwayat monitoring', eyebrow: 'Data'),
      body: LatarHalaman(child: body),
    );
  }
}
