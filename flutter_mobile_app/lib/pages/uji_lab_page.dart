import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/halaman.dart';
import '../widgets/kaca.dart';

/// Isian form → badan `hasil` POST /uji-lab (hanya kolom terisi). Mengembalikan galat atau null.
({List<Map<String, dynamic>> hasil, String? galat}) susunHasilUjiLab(
  Map<String, Map<String, dynamic>> spek,
  Map<String, String> isian,
) {
  final hasil = <Map<String, dynamic>>[];
  for (final e in spek.entries) {
    final mentah = (isian[e.key] ?? '').trim();
    if (mentah.isEmpty) continue;
    final n = double.tryParse(mentah.replaceAll(',', '.'));
    final lo = (e.value['min'] as num?) ?? 0;
    final hi = (e.value['max'] as num?) ?? double.infinity;
    if (n == null || n < lo || n > hi) {
      return (
        hasil: const [],
        galat: '${e.value['nama']} harus angka $lo–$hi.',
      );
    }
    hasil.add({'parameter': e.key, 'nilai': n});
  }
  return (
    hasil: hasil,
    galat: hasil.isEmpty ? 'Isi minimal satu parameter.' : null,
  );
}

/// Uji Lab (bagian Data) — dua opsi: Buah (bawaan Melon) dan Sayur. GET /uji-lab/parameter, GET/POST /uji-lab.
class UjiLabPage extends StatefulWidget {
  const UjiLabPage({super.key, required this.api});

  final ApiService api;

  @override
  State<UjiLabPage> createState() => _UjiLabPageState();
}

class _UjiLabPageState extends State<UjiLabPage> {
  String _kategori = 'buah';
  Map<String, dynamic> _spek = const {};
  List<Map<String, dynamic>> _riwayat = const [];
  final Map<String, TextEditingController> _isian = {};
  String? _pesan;
  bool _sibuk = false;

  bool get _bolehUbah => widget.api.role == 'admin';

  Map<String, Map<String, dynamic>> get _spekKategori {
    final k = _spek[_kategori];
    if (k is! Map) return const {};
    return {
      for (final e in k.entries)
        '${e.key}': Map<String, dynamic>.from(e.value as Map),
    };
  }

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    for (final c in _isian.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _muat() async {
    try {
      final s = await widget.api.getJson('/uji-lab/parameter');
      final r = await widget.api.getJson(
        '/uji-lab?kategori=$_kategori&limit=100',
      );
      if (!mounted) return;
      setState(() {
        _spek = s is Map && s['data'] is Map
            ? Map<String, dynamic>.from(s['data'] as Map)
            : const {};
        _riwayat = r is Map && r['data'] is List
            ? (r['data'] as List)
                  .whereType<Map>()
                  .map((e) => Map<String, dynamic>.from(e))
                  .toList()
            : const [];
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _pesan = e.message);
    }
  }

  Future<void> _simpan() async {
    final h = susunHasilUjiLab(_spekKategori, {
      for (final e in _isian.entries) e.key: e.value.text,
    });
    if (h.galat != null) return setState(() => _pesan = h.galat);
    setState(() {
      _sibuk = true;
      _pesan = null;
    });
    try {
      final d = await widget.api.kirimJson('/uji-lab', {
        'kategori': _kategori,
        'hasil': h.hasil,
      });
      for (final c in _isian.values) {
        c.clear();
      }
      _pesan = d is Map ? '${d['message'] ?? 'Tersimpan.'}' : 'Tersimpan.';
    } on ApiException catch (e) {
      _pesan = e.message;
    } finally {
      if (mounted) setState(() => _sibuk = false);
      await _muat();
    }
  }

  void _pilihKategori(String k) {
    setState(() {
      _kategori = k;
      _pesan = null;
      _riwayat = const [];
    });
    _muat();
  }

  @override
  Widget build(BuildContext context) {
    final spek = _spekKategori;
    return Scaffold(
      appBar: const AppBarGlass(judul: 'Uji Lab', eyebrow: 'Data'),
      body: LatarHalaman(
        child: RefreshIndicator(
          onRefresh: _muat,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              PilPilih(
                label: const ['Buah (Melon)', 'Sayur'],
                pilih: _kategori == 'buah' ? 0 : 1,
                rata: true,
                onPilih: (i) => _pilihKategori(i == 0 ? 'buah' : 'sayur'),
              ),
              const SizedBox(height: Tok.sp3),
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Eyebrow(
                      'Input hasil lab — ${_kategori == 'buah' ? 'Buah' : 'Sayur'}',
                    ),
                    for (final e in spek.entries)
                      TextField(
                        controller: _isian.putIfAbsent(
                          e.key,
                          TextEditingController.new,
                        ),
                        enabled: _bolehUbah,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText:
                              '${e.value['nama']}${(e.value['satuan'] ?? '') == '' ? '' : ' (${e.value['satuan']})'}',
                        ),
                      ),
                    const SizedBox(height: 8),
                    if (_bolehUbah)
                      TombolGradasi(
                        label: 'Simpan hasil',
                        sibuk: _sibuk,
                        onTap: _simpan,
                      )
                    else
                      Text(
                        'Hanya admin yang dapat menyimpan hasil.',
                        style: Tok.kecil,
                      ),
                    if (_pesan != null) ...[
                      const SizedBox(height: 8),
                      Text(_pesan!, style: Tok.kecil),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: Tok.sp3),
              const Eyebrow('Riwayat'),
              const SizedBox(height: 8),
              if (_riwayat.isEmpty)
                Panel(
                  child: Text('Belum ada hasil uji lab.', style: Tok.kecil),
                ),
              for (final r in _riwayat.take(30))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Panel(
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${(spek['${r['parameter']}']?['nama']) ?? r['parameter']}',
                          ),
                        ),
                        Text(
                          '${r['nilai']} ${r['satuan'] ?? ''}',
                          style: Tok.kecil,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${r['tanggal']}'.split('T').first,
                          style: Tok.kecil,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
