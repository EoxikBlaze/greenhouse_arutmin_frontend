import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Target nutrisi NAIK HARIAN per jenis tanaman —
/// GET /dosing/naik-harian · PUT /dosing/naik-harian/:id_tanaman {ppm_awal, ppm_target, hari_capai}.
/// Sejak pindah netpot (mulai Peremajaan) target ppm penampung naik rata tiap hari sampai target akhir,
/// lalu ditahan sampai panen. Petani cukup isi target akhir; demo hanya melihat.
class NaikHarianPage extends StatefulWidget {
  const NaikHarianPage({super.key, required this.api});

  final ApiService api;

  @override
  State<NaikHarianPage> createState() => _NaikHarianPageState();
}

/// Kenaikan ppm per hari; null bila isian belum lengkap/tidak masuk akal.
@visibleForTesting
double? kenaikanPerHari(num? awal, num? target, num? hari) {
  if (awal == null ||
      target == null ||
      hari == null ||
      hari <= 0 ||
      target < awal) {
    return null;
  }
  return (target - awal) / hari;
}

String _angka(num v) =>
    (v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1)).replaceAll(
      '.',
      ',',
    );
num? _num(Object? v) =>
    v is num ? v : num.tryParse('${v ?? ''}'.replaceAll(',', '.'));

class _NaikHarianPageState extends State<NaikHarianPage> {
  List<Map<String, dynamic>> _list = const [];
  num? _ambangMaks;
  String? _galat;
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.getJson('/dosing/naik-harian');
      if (!mounted) return;
      final l = d is Map && d['data'] is List ? d['data'] as List : null;
      setState(() {
        _list = (l ?? const [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _ambangMaks = d is Map && d['ambang_tds'] is Map
            ? _num((d['ambang_tds'] as Map)['max'])
            : null;
        _galat = l == null ? 'Respons tidak sesuai kontrak.' : null;
        _memuat = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e is ApiException ? e.message : 'Data tidak dapat dibaca.';
        _memuat = false;
      });
    }
  }

  Future<void> _ubah(Map<String, dynamic> t) async {
    final pesan = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (_) => SheetKaca(
        child: _SheetUbah(
          api: widget.api,
          tanaman: t,
          ambangMaks: _ambangMaks,
          petani: widget.api.role == 'petani',
        ),
      ),
    );
    if (pesan == null || !mounted) return;
    tampilkanPesan(context, pesan);
    await _muat();
  }

  @override
  Widget build(BuildContext context) {
    final bisaUbah = widget.api.role != 'demo';
    return Scaffold(
      appBar: const AppBarGlass(
        judul: 'Target nutrisi',
        eyebrow: 'Kebun & sensor',
      ),
      body: LatarHalaman(
        child: RefreshIndicator(
          color: Tok.moss,
          onRefresh: _muat,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              const Text(
                'Cukup isi target akhir tiap tanaman. Mulai hari pindah netpot, target ppm penampung '
                'naik sedikit tiap hari sampai target akhir, lalu ditahan sampai panen. '
                'Tahap semai tetap memakai preset.',
                style: Tok.kecil,
              ),
              const SizedBox(height: 14),
              if (_memuat && _list.isEmpty) ...[
                const SkeletonBox(height: 76, radius: 14),
                const SizedBox(height: 10),
                const SkeletonBox(height: 76, radius: 14),
              ] else if (_galat != null && _list.isEmpty)
                ErrorPanel(pesan: _galat!, onCoba: _muat)
              else
                for (final t in _list)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _Kartu(
                      t: t,
                      ambangMaks: _ambangMaks,
                      onTap: bisaUbah ? () => _ubah(t) : null,
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Kartu extends StatelessWidget {
  const _Kartu({required this.t, required this.ambangMaks, this.onTap});

  final Map<String, dynamic> t;
  final num? ambangMaks;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final awal = _num(t['ppm_awal']);
    final target = _num(t['ppm_target']);
    final hari = _num(t['hari_capai']);
    final perHari = kenaikanPerHari(awal, target, hari);
    final lewatAmbang =
        target != null && ambangMaks != null && target > ambangMaks!;
    return Panel(
      kaca: false,
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${t['nama_tanaman']}', style: Tok.h3),
                const SizedBox(height: 2),
                if (target == null)
                  const Text(
                    'Belum diatur — memakai preset per tahap.',
                    style: Tok.kecil,
                  )
                else ...[
                  Text(
                    '${_angka(awal!)} → ${_angka(target)} ppm',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Tok.tinta,
                    ),
                  ),
                  Text(
                    '${hari ?? '-'} hari · naik ±${perHari == null ? '-' : _angka(perHari)} ppm/hari',
                    style: Tok.kecil,
                  ),
                ],
                if (lewatAmbang)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      'Ambang alert TDS ${_angka(ambangMaks!)} ppm — alert akan muncul.',
                      style: Tok.kecil.copyWith(
                        color: Tok.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (onTap != null) const Icon(Ikon.kanan, color: Tok.abu),
        ],
      ),
    );
  }
}

class _SheetUbah extends StatefulWidget {
  const _SheetUbah({
    required this.api,
    required this.tanaman,
    required this.ambangMaks,
    required this.petani,
  });

  final ApiService api;
  final Map<String, dynamic> tanaman;
  final num? ambangMaks;
  final bool petani;

  @override
  State<_SheetUbah> createState() => _SheetUbahState();
}

class _SheetUbahState extends State<_SheetUbah> {
  late final _target = TextEditingController(text: _isi('ppm_target', ''));
  late final _hari = TextEditingController(text: _isi('hari_capai', ''));
  late final _awal = TextEditingController(text: _isi('ppm_awal', '400'));
  bool _sibuk = false;
  String? _galat;

  String _isi(String k, String bawaan) {
    final v = _num(widget.tanaman[k]);
    return v == null ? bawaan : _angka(v).replaceAll(',', '.');
  }

  @override
  void dispose() {
    _target.dispose();
    _hari.dispose();
    _awal.dispose();
    super.dispose();
  }

  Future<void> _simpan({bool matikan = false}) async {
    setState(() {
      _sibuk = true;
      _galat = null;
    });
    try {
      final d = await widget.api.putJson(
        '/dosing/naik-harian/${widget.tanaman['id_tanaman']}',
        matikan
            ? {'ppm_awal': null, 'ppm_target': null, 'hari_capai': null}
            : {
                'ppm_awal': _num(_awal.text),
                'ppm_target': _num(_target.text),
                'hari_capai': _num(_hari.text),
              },
      );
      if (!mounted) return;
      Navigator.of(context).pop(
        d is Map && d['message'] != null ? '${d['message']}' : 'Tersimpan.',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e is ApiException ? e.message : 'Gagal menyimpan. Coba lagi.';
        _sibuk = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final perHari = kenaikanPerHari(
      _num(_awal.text),
      _num(_target.text),
      _num(_hari.text),
    );
    final target = _num(_target.text);
    final lewatAmbang =
        target != null &&
        widget.ambangMaks != null &&
        target > widget.ambangMaks!;
    final aktif = widget.tanaman['ppm_target'] != null;
    InputDecoration dekor(String label) => InputDecoration(labelText: label);
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Target nutrisi · ${widget.tanaman['nama_tanaman']}',
              style: Tok.h3,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _target,
              enabled: !_sibuk,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: dekor('Target akhir (ppm), mis. 2400'),
              onChanged: (_) => setState(() => _galat = null),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _hari,
              enabled: !_sibuk,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: dekor(
                'Dicapai dalam berapa hari sejak pindah netpot',
              ),
              onChanged: (_) => setState(() => _galat = null),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _awal,
              enabled: !_sibuk,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: dekor('ppm awal saat pindah netpot'),
              onChanged: (_) => setState(() => _galat = null),
            ),
            const SizedBox(height: 12),
            Text(
              perHari == null
                  ? 'Isi ketiga angka untuk melihat kenaikan per hari.'
                  : 'Naik ±${_angka(perHari)} ppm per hari.',
              style: Tok.body.copyWith(fontWeight: FontWeight.w600),
            ),
            if (lewatAmbang) ...[
              const SizedBox(height: 6),
              Text(
                'Ambang alert TDS saat ini ${_angka(widget.ambangMaks!)} ppm — alert "di luar batas" akan muncul. '
                '${widget.petani ? 'Minta admin menaikkan ambang TDS.' : 'Naikkan ambang TDS di web.'}',
                style: Tok.kecil.copyWith(color: Tok.warning),
              ),
            ],
            if (_galat != null) ...[
              const SizedBox(height: 8),
              Text(_galat!, style: Tok.kecil.copyWith(color: Tok.error)),
            ],
            const SizedBox(height: 16),
            TombolGradasi(
              label: 'Simpan',
              sibuk: _sibuk,
              onTap: () => _simpan(),
            ),
            if (aktif)
              TextButton(
                onPressed: _sibuk ? null : () => _simpan(matikan: true),
                child: const Text('Matikan naik harian'),
              ),
          ],
        ),
      ),
    );
  }
}
