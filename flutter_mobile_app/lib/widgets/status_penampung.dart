import 'package:flutter/material.dart';

import '../models/penampung_state.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import 'brand.dart';
import 'motion.dart';

/// Status LOCK tiap penampung (GET /penampung-states + nama dari GET /meja).
///
/// [bolehBuka] = admin sungguhan; demo hanya melihat (server juga menolak 403).
class StatusPenampungPanel extends StatefulWidget {
  const StatusPenampungPanel({
    super.key,
    required this.api,
    required this.bolehBuka,
  });

  final ApiService api;
  final bool bolehBuka;

  @override
  State<StatusPenampungPanel> createState() => StatusPenampungPanelState();
}

class StatusPenampungPanelState extends State<StatusPenampungPanel> {
  List<PenampungState>? _daftar;
  String? _galat;
  String? _membuka;

  @override
  void initState() {
    super.initState();
    muat();
  }

  /// Muat ulang (dipanggil juga oleh polling & tarik-segarkan halaman induk).
  Future<void> muat() async {
    try {
      final hasil = await Future.wait([
        widget.api.getJson('/penampung-states'),
        widget.api.getJson('/meja'),
      ]);
      if (!mounted) return;
      final states = hasil[0];
      final meja = hasil[1];
      setState(() {
        _daftar = gabungPenampung(
          states is List ? states : const [],
          meja is List ? meja : const [],
        );
        _galat = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _galat = e.message);
    }
  }

  Future<void> _bukaKunci(PenampungState p) async {
    if (_membuka != null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text('Buka kunci ${p.nama}?'),
        content: Text(
          'Periksa penyebab LOCK dulu (${p.alasan ?? 'tanpa alasan'}): '
          'selang, pompa, stok larutan, dan sensor. '
          'Hitungan dosis hari ini tidak direset.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Buka kunci'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _membuka = p.idMeja);
    try {
      await widget.api.postJson(
        '/api/aktuator/penampung/${p.idMeja}/buka-kunci',
      );
      if (!mounted) return;
      tampilkanPesan(context, 'LOCK ${p.nama} dibuka.');
      await muat();
    } on ApiException catch (e) {
      if (!mounted) return;
      tampilkanPesan(context, e.message, galat: true);
      await muat();
    } finally {
      if (mounted) setState(() => _membuka = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final daftar = _daftar;
    if (daftar == null) {
      if (_galat != null) return ErrorPanel(pesan: _galat!, onCoba: muat);
      return const SkeletonBox(height: 120, radius: 14);
    }
    if (daftar.isEmpty) {
      return const Panel(
        child: Text('Belum ada data penampung.', style: Tok.kecil),
      );
    }
    return Column(
      children: [
        for (final p in daftar) ...[
          _Baris(
            p: p,
            bolehBuka: widget.bolehBuka,
            sibuk: _membuka == p.idMeja,
            onBuka: _membuka == null ? () => _bukaKunci(p) : null,
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _Baris extends StatelessWidget {
  const _Baris({
    required this.p,
    required this.bolehBuka,
    required this.sibuk,
    required this.onBuka,
  });

  final PenampungState p;
  final bool bolehBuka;
  final bool sibuk;
  final VoidCallback? onBuka;

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(p.nama, style: Tok.h3)),
              StatusPill(
                teks: p.terkunci ? 'LOCK' : 'Aman',
                warna: p.terkunci ? Tok.error : Tok.moss,
              ),
            ],
          ),
          if (p.terkunci) ...[
            const SizedBox(height: 6),
            Text(
              '${p.alasan ?? 'Tanpa alasan'} · sejak ${waktuPendek(p.sejak)}',
              style: Tok.kecil.copyWith(color: Tok.error),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            'Hari ini: ${p.kejadianHari} kejadian · '
            'AB ${fmtAngka(p.volumeAbMl)} mL · pH ${fmtAngka(p.volumePhMl)} mL'
            '${p.pemeliharaan ? ' · pemeliharaan' : ''}',
            style: Tok.kecil,
          ),
          if (p.terkunci && bolehBuka) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: sibuk ? null : onBuka,
              icon: sibuk
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.lock_open_outlined, size: 18),
              label: const Text('Buka kunci'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Tok.mossGelap,
                side: const BorderSide(color: Tok.mossGelap),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(Tok.rSm),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
