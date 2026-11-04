import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/kaca.dart';

/// Saklar aktuator — GET /saklar, PUT /saklar/:kode {aktif}. Hanya admin yang boleh mengubah.
/// OFF = otomasi (preset/jadwal/AI) tidak boleh menyalakannya; Nutrisi Manual tetap boleh (override).
class SaklarPage extends StatefulWidget {
  const SaklarPage({super.key, required this.api});

  final ApiService api;

  @override
  State<SaklarPage> createState() => _SaklarPageState();
}

class _SaklarPageState extends State<SaklarPage> {
  List<Map<String, dynamic>>? _daftar;
  String? _error;
  String? _sibuk;

  bool get _bolehUbah => widget.api.role == 'admin';

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.getJson('/saklar');
      final data = d is Map && d['data'] is List ? d['data'] as List : const [];
      if (!mounted) return;
      setState(() {
        _daftar = data
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _error = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    }
  }

  Future<void> _ubah(String kode, bool aktif) async {
    setState(() => _sibuk = kode);
    try {
      await widget.api.kirimJson('/saklar/$kode', {'aktif': aktif}, put: true);
      await _muat();
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _sibuk = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget isi;
    if (_error != null) {
      isi = ListView(
        padding: const EdgeInsets.all(16),
        children: [ErrorPanel(pesan: _error!, onCoba: _muat)],
      );
    } else if (_daftar == null) {
      isi = const Center(child: CircularProgressIndicator());
    } else {
      isi = RefreshIndicator(
        onRefresh: _muat,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            Panel(
              child: Text(
                'Saklar OFF: otomasi tidak boleh menyalakan aktuator itu. '
                'Halaman Nutrisi Manual tetap boleh (override manual).'
                '${_bolehUbah ? '' : ' Hanya admin yang dapat mengubah saklar.'}',
                style: Tok.kecil,
              ),
            ),
            const SizedBox(height: Tok.sp3),
            for (final s in _daftar!)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Panel(
                  child: Row(
                    children: [
                      Expanded(child: Text('${s['nama']}', style: Tok.h3)),
                      Text(s['aktif'] == true ? 'ON' : 'OFF', style: Tok.kecil),
                      const SizedBox(width: 8),
                      Switch(
                        value: s['aktif'] == true,
                        onChanged: _bolehUbah && _sibuk == null
                            ? (v) => _ubah('${s['kode']}', v)
                            : null,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      );
    }
    return Scaffold(
      appBar: const AppBarGlass(judul: 'Saklar', eyebrow: 'Kendali'),
      body: LatarHalaman(child: isi),
    );
  }
}
