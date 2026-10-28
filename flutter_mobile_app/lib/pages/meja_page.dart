import 'package:flutter/material.dart';

import '../models/meja.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../util/format.dart';
import '../widgets/kaca.dart';

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
    final scheme = Theme.of(context).colorScheme;

    Widget body;
    if (_loading && _items == null && _error == null) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_error != null) {
      body = ListView(
        padding: const EdgeInsets.all(16),
        children: [ErrorPanel(pesan: _error!, onCoba: _load)],
      );
    } else if (_items == null || _items!.isEmpty) {
      body = const Center(child: Text('Belum ada data meja.'));
    } else {
      body = RefreshIndicator(
        color: scheme.secondary,
        onRefresh: _load,
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _items!.length + 1,
          itemBuilder: (context, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  '${_items!.length} meja terdaftar',
                  style: Theme.of(context).textTheme.bodySmall,
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
                        Icon(
                          Icons.table_restaurant_outlined,
                          size: 18,
                          color: scheme.primary,
                        ),
                        const SizedBox(width: 8),
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
                          Chip(
                            label: Text(m.jenisTalang!),
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 16,
                      runSpacing: 6,
                      children: [
                        _kv('Lubang', '${m.jumlahLubang ?? '-'}'),
                        _kv('Talang', '${m.jumlahTalang ?? '-'}'),
                        _kv('Lubang/talang', '${m.lubangPerTalang ?? '-'}'),
                        _kv('Panjang', _fmt(m.panjangTalangM, satuan: ' m')),
                        _kv(
                          'Kapasitas',
                          _fmt(m.kapasitasPenampungL, satuan: ' L'),
                        ),
                        _kv('Laju', _fmt(m.lajuPerTalangLpm, satuan: ' L/m')),
                        _kv(
                          'Kenaikan air',
                          _fmt(m.kenaikanAirCm, satuan: ' cm', desimal: 0),
                        ),
                      ],
                    ),
                    if (m.createdAt != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Dibuat ${tanggalPendek(m.createdAt)}',
                        style: Theme.of(context).textTheme.bodySmall,
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
      appBar: AppBar(title: const Text('Daftar Meja')),
      body: LatarHalaman(child: body),
    );
  }

  Widget _kv(String label, String nilai) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Tok.abuTeks)),
      Text(
        nilai,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ],
  );
}
