import 'package:flutter/material.dart';

import '../models/meja.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/halaman.dart';
import '../widgets/ikon.dart';
import '../util/format.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Daftar meja — GET /meja (13 kolom, butuh token admin).
class MejaPage extends StatefulWidget {
  const MejaPage({super.key, required this.api});

  final ApiService api;

  @override
  State<MejaPage> createState() => _MejaPageState();
}

class _MejaPageState extends State<MejaPage>
    with AutomaticKeepAliveClientMixin {
  List<Meja>? _items;
  String? _error;
  bool _loading = false;

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
      final items = await widget.api.fetchMeja();
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  String _fmt(num? v, {String satuan = '', int desimal = 1}) {
    if (v == null) return '-';
    final teks = v is int ? v.toString() : v.toStringAsFixed(desimal);
    return satuan.isEmpty ? teks : '$teks$satuan';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    Widget tarikRefresh(List<Widget> anak) => RefreshIndicator(
      color: Tok.moss,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: anak,
      ),
    );

    Widget body;
    if (_loading && _items == null && _error == null) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          SkeletonBox(height: 120, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 120, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 120, radius: 14),
        ],
      );
    } else if (_error != null) {
      body = tarikRefresh([ErrorPanel(pesan: _error!, onCoba: _load)]);
    } else if (_items == null || _items!.isEmpty) {
      body = tarikRefresh(const [
        Panel(child: Text('Belum ada data meja.', style: Tok.kecil)),
      ]);
    } else {
      body = RefreshIndicator(
        color: Tok.moss,
        onRefresh: _load,
        child: ListView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          itemCount: _items!.length + 1,
          itemBuilder: (context, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '${_items!.length} meja terdaftar',
                  style: Tok.kecil,
                ),
              );
            }
            final m = _items![i - 1];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Panel(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Tok.moss.withValues(alpha: 0.16),
                          ),
                          child: Icon(Ikon.meja, size: 18, color: Tok.forest),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            m.meja.isEmpty ? 'Meja #${m.idMeja}' : m.meja,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        if (m.jenisTalang != null)
                          StatusPill(teks: m.jenisTalang!, warna: Tok.moss),
                      ],
                    ),
                    const SizedBox(height: Tok.sp3),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        MiniNilai('Lubang', '${m.jumlahLubang ?? '-'}'),
                        MiniNilai('Talang', '${m.jumlahTalang ?? '-'}'),
                        MiniNilai(
                          'Lubang/talang',
                          '${m.lubangPerTalang ?? '-'}',
                        ),
                        MiniNilai(
                          'Panjang',
                          _fmt(m.panjangTalangM, satuan: ' m'),
                        ),
                        MiniNilai(
                          'Kapasitas',
                          _fmt(m.kapasitasPenampungL, satuan: ' L'),
                        ),
                        MiniNilai(
                          'Laju',
                          _fmt(m.lajuPerTalangLpm, satuan: ' L/m'),
                        ),
                        MiniNilai(
                          'Kenaikan air',
                          _fmt(m.kenaikanAirCm, satuan: ' cm', desimal: 0),
                        ),
                      ],
                    ),
                    if (m.createdAt != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Dibuat ${tanggalPendek(m.createdAt)}',
                        style: Tok.kecil,
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    return Scaffold(
      appBar: const AppBarGlass(judul: 'Daftar meja', eyebrow: 'Data'),
      body: LatarHalaman(child: body),
    );
  }
}
