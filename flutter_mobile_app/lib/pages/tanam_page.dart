import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/motion.dart';

/// Tanam saya — GET /tanam (semai, peremajaan, pendewasaan yang berjalan).
class TanamPage extends StatefulWidget {
  const TanamPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

  @override
  State<TanamPage> createState() => _TanamPageState();
}

class _TanamPageState extends State<TanamPage> {
  List<Map<String, dynamic>> _list = const [];
  String? _galat;
  bool _memuat = true;
  String _filter = 'semua';
  String? _sibukKunci;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void didUpdateWidget(covariant TanamPage old) {
    super.didUpdateWidget(old);
    if (!old.aktif && widget.aktif) _muat(senyap: true);
  }

  Future<void> _muat({bool senyap = false}) async {
    if (!senyap) setState(() => _memuat = true);
    try {
      final d = await widget.api.getJson('/tanam');
      if (!mounted) return;
      final l = d is Map && d['list'] is List ? d['list'] as List : null;
      setState(() {
        if (l == null) {
          _galat = 'Respons tanam tidak sesuai kontrak.';
        } else {
          _list = l.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
          _galat = null;
        }
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (!senyap || _list.isEmpty) _galat = e.message;
        _memuat = false;
      });
    }
  }

  Future<void> _selesai(Map<String, dynamic> item) async {
    final tipe = '${item['tipe']}';
    final id = '${item['id']}';
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Selesaikan tahap $tipe?'),
        content: Text('${item['varietas'] ?? 'Batch'} · ${item['meja'] ?? '-'}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Selesaikan'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _sibukKunci = '$tipe-$id');
    try {
      await widget.api.postJson('/tanam/$tipe/$id/selesai');
      if (!mounted) return;
      tampilkanPesan(context, 'Tahap $tipe diselesaikan.');
      await _muat(senyap: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _sibukKunci = null);
    }
  }

  static const _filters = <(String, String)>[
    ('semua', 'Semua'),
    ('semai', 'Semai'),
    ('peremajaan', 'Peremajaan'),
    ('pendewasaan', 'Pendewasaan'),
  ];

  Color _warnaTahap(String t) {
    switch (t) {
      case 'semai':
        return Tok.warning;
      case 'peremajaan':
        return Tok.moss;
      case 'pendewasaan':
        return Tok.navy3;
    }
    return Tok.abu;
  }

  @override
  Widget build(BuildContext context) {
    final tampil = _filter == 'semua'
        ? _list
        : _list.where((e) => e['tipe'] == _filter).toList();
    final bisaSelesai = widget.api.role != 'demo';

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: () => _muat(senyap: true),
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          HeroHeader(
            judul: 'Tanam saya',
            subjudul: '${_list.length} batch sedang berjalan',
            bawah: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final f in _filters)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(f.$2),
                        selected: _filter == f.$1,
                        showCheckmark: false,
                        backgroundColor: Colors.white.withValues(alpha: 0.10),
                        selectedColor: Tok.emas,
                        side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.18),
                        ),
                        labelStyle: TextStyle(
                          color: _filter == f.$1 ? Tok.navy : Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 12.5,
                        ),
                        onSelected: (_) => setState(() => _filter = f.$1),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
            child: _isi(tampil, bisaSelesai),
          ),
        ],
      ),
    );
  }

  Widget _isi(List<Map<String, dynamic>> tampil, bool bisaSelesai) {
    if (_memuat && _list.isEmpty) {
      return const Column(
        children: [
          SkeletonBox(height: 110, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 110, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 110, radius: 14),
        ],
      );
    }
    if (_galat != null && _list.isEmpty) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    if (tampil.isEmpty) {
      return const Panel(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Center(
            child: Column(
              children: [
                Icon(Icons.spa_outlined, size: 40, color: Tok.mint),
                SizedBox(height: 8),
                Text('Belum ada tanaman di tahap ini.', style: Tok.kecil),
              ],
            ),
          ),
        ),
      );
    }

    var i = 0;
    return Column(
      children: [
        for (final item in tampil)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FadeUp(
              key: ValueKey('${item['tipe']}-${item['id']}'),
              delay: FadeUp.urutan(i++),
              child: _KartuTanam(
                item: item,
                warna: _warnaTahap('${item['tipe']}'),
                sibuk: _sibukKunci == '${item['tipe']}-${item['id']}',
                bisaSelesai: bisaSelesai,
                onSelesai: () => _selesai(item),
              ),
            ),
          ),
      ],
    );
  }
}

class _KartuTanam extends StatelessWidget {
  const _KartuTanam({
    required this.item,
    required this.warna,
    required this.sibuk,
    required this.bisaSelesai,
    required this.onSelesai,
  });

  final Map<String, dynamic> item;
  final Color warna;
  final bool sibuk;
  final bool bisaSelesai;
  final VoidCallback onSelesai;

  @override
  Widget build(BuildContext context) {
    final tipe = '${item['tipe']}';
    final hari = hariSejak(item['mulai']?.toString());
    final jumlah = item['jumlah_benih'] ?? item['jumlah_masuk'];
    return Panel(
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: warna,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(Tok.rLg),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${item['varietas'] ?? 'Tanaman'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Tok.h3,
                          ),
                        ),
                        StatusPill(teks: judulKata(tipe), warna: warna),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 14,
                      runSpacing: 4,
                      children: [
                        _Info(Icons.grid_view_rounded, '${item['meja'] ?? '-'}'),
                        _Info(
                          Icons.calendar_today_outlined,
                          tanggalPendek(item['mulai']?.toString()),
                        ),
                        if (hari != null) _Info(Icons.timelapse, 'Hari ke-$hari'),
                        if (jumlah != null) _Info(Icons.numbers, '$jumlah tanaman'),
                      ],
                    ),
                    if (bisaSelesai) ...[
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: sibuk ? null : onSelesai,
                          icon: sibuk
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.check_circle_outline, size: 18),
                          label: const Text('Selesaikan tahap'),
                          style: TextButton.styleFrom(
                            foregroundColor: Tok.mossGelap,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info(this.ikon, this.teks);

  final IconData ikon;
  final String teks;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(ikon, size: 14, color: Tok.abu),
        const SizedBox(width: 5),
        Text(teks, style: Tok.kecil.copyWith(fontSize: 12.5)),
      ],
    );
  }
}
