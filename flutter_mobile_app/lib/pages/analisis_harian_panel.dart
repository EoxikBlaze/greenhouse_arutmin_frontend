import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/kaca.dart';

/// Analisis AI harian (07.00 WIB) — GET /api/ai/analisis-harian[/terbaru|/:tanggal],
/// POST /jalankan (admin). Laporan deterministik dari server; rekomendasi saja, tidak menjalankan alat.
class AnalisisHarianPanel extends StatefulWidget {
  const AnalisisHarianPanel({super.key, required this.api});

  final ApiService api;

  @override
  State<AnalisisHarianPanel> createState() => _AnalisisHarianPanelState();
}

class _AnalisisHarianPanelState extends State<AnalisisHarianPanel> {
  static const _url = '/api/ai/analisis-harian';

  Map<String, dynamic>? _lap;
  List<Map<String, dynamic>> _daftar = const [];
  bool _memuat = true;
  bool _menjalankan = false;
  String? _galat;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat([String? tanggal]) async {
    setState(() {
      _memuat = true;
      _galat = null;
    });
    try {
      final hasil = await Future.wait([
        widget.api.getJson(
          tanggal == null ? '$_url/terbaru' : '$_url/$tanggal',
        ),
        widget.api.getJson(_url),
      ]);
      if (!mounted) return;
      final l = hasil[0] is Map ? (hasil[0] as Map)['data'] : null;
      final d = hasil[1] is Map ? (hasil[1] as Map)['data'] : null;
      setState(() {
        _lap = l is Map ? Map<String, dynamic>.from(l) : null;
        _daftar = d is List
            ? d
                  .whereType<Map<Object?, Object?>>()
                  .map(Map<String, dynamic>.from)
                  .toList()
            : const [];
      });
    } catch (e) {
      if (mounted) {
        setState(
          () =>
              _galat = e is ApiException ? e.message : 'Gagal memuat analisis.',
        );
      }
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _jalankan() async {
    setState(() {
      _menjalankan = true;
      _galat = null;
    });
    try {
      await widget.api.postJson(
        '$_url/jalankan',
        null,
        const Duration(seconds: 60),
      );
      await _muat();
    } catch (e) {
      if (mounted) {
        setState(
          () => _galat = e is ApiException
              ? e.message
              : 'Gagal menjalankan analisis.',
        );
      }
    } finally {
      if (mounted) setState(() => _menjalankan = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lap = _lap;
    final tanggal = lap?['tanggal']?.toString();
    return RefreshIndicator(
      onRefresh: () => _muat(tanggal),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: DropdownButton<String>(
                  key: const Key('analisis-tanggal'),
                  isExpanded: true,
                  value: _daftar.any((d) => d['tanggal'] == tanggal)
                      ? tanggal
                      : null,
                  hint: Text('Belum ada', style: TextStyle(color: Tok.abu)),
                  items: [
                    for (final d in _daftar)
                      DropdownMenuItem(
                        value: d['tanggal'].toString(),
                        child: Text(
                          '${d['tanggal']} · ${d['prioritas'] ?? '-'}',
                        ),
                      ),
                  ],
                  onChanged: _memuat ? null : (t) => _muat(t),
                ),
              ),
              if (widget.api.role == 'admin') ...[
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: _menjalankan ? null : _jalankan,
                  child: Text(
                    _menjalankan ? 'Menganalisis…' : 'Jalankan sekarang',
                  ),
                ),
              ],
            ],
          ),
          if (_galat != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_galat!, style: TextStyle(color: Tok.errorTeks)),
            ),
          const SizedBox(height: 12),
          if (_memuat && lap == null)
            const Center(child: CircularProgressIndicator())
          else if (lap == null && _galat == null)
            Text(
              'Belum ada analisis. Analisis otomatis dibuat setiap pukul 07.00 WIB.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Tok.abu),
            )
          else if (lap != null)
            _IsiLaporan(lap),
        ],
      ),
    );
  }
}

class _IsiLaporan extends StatelessWidget {
  const _IsiLaporan(this.lap);

  final Map<String, dynamic> lap;

  @override
  Widget build(BuildContext context) {
    final isi = lap['isi'] is Map
        ? lap['isi'] as Map<Object?, Object?>
        : const <Object?, Object?>{};
    final prioritas = '${isi['prioritas'] ?? 'rendah'}';
    final bagian = isi['bagian'] is List
        ? (isi['bagian'] as List).whereType<Map<Object?, Object?>>()
        : const <Map<Object?, Object?>>[];
    final warna = switch (prioritas) {
      'tinggi' => Tok.errorTeks,
      'sedang' => Tok.warningTeks,
      _ => Tok.hijauTeks,
    };
    return KacaCair(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PRIORITAS ${prioritas.toUpperCase()} · ${lap['pemicu'] == 'jadwal' ? 'Terjadwal 07.00 WIB' : 'Manual'}',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: warna,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${isi['judul'] ?? 'Analisis harian'}',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Tok.tinta,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${isi['ringkasan_utama'] ?? ''}',
            style: TextStyle(color: Tok.tinta),
          ),
          for (final b in bagian) ...[
            const SizedBox(height: 14),
            Text(
              '${b['judul']}'.toUpperCase(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Tok.abu,
              ),
            ),
            const SizedBox(height: 4),
            for (final t
                in (b['butir'] is List ? b['butir'] as List : const []))
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  '$t',
                  style: TextStyle(fontSize: 14, color: Tok.tinta, height: 1.4),
                ),
              ),
          ],
          const SizedBox(height: 12),
          Text(
            'Rekomendasi saja — analisis ini tidak menjalankan alat apa pun.',
            style: TextStyle(fontSize: 12, color: Tok.abu),
          ),
        ],
      ),
    );
  }
}
