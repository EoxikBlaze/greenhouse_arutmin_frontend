import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/navigasi_shell.dart';
import 'naik_harian_page.dart';
import 'setup_wizard_page.dart';
import 'tanam_page.dart';

/// Tab Pantau Semai: ringkasan jumlah semai, usia/progres batch aktif,
/// kontrol eksplisit mode SEMAI di alat (admin), serta daftar & aksi tanam.
class PantauSemaiPage extends StatefulWidget {
  const PantauSemaiPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

  @override
  State<PantauSemaiPage> createState() => _PantauSemaiPageState();
}

class _PantauSemaiPageState extends State<PantauSemaiPage> {
  String? _modeAlat;
  String? _hariSemaiAlat;
  String? _targetPpmAlat;
  bool _alatOnline = false;
  bool _sibuk = false;

  bool get _admin => widget.api.role == 'admin';
  bool get _pengelola => _admin || widget.api.role == 'demo';

  @override
  void initState() {
    super.initState();
    _muatStatusAlat();
  }

  @override
  void didUpdateWidget(covariant PantauSemaiPage old) {
    super.didUpdateWidget(old);
    if (!old.aktif && widget.aktif) _muatStatusAlat();
  }

  Future<void> _muatStatusAlat() async {
    if (!_pengelola) return;
    try {
      final res = await widget.api.getJson('/api/aktuator/status');
      if (!mounted || res is! Map) return;
      final v6 = res['v6'] is Map ? Map<String, dynamic>.from(res['v6'] as Map) : <String, dynamic>{};
      final perangkat = res['perangkat'] is List ? res['perangkat'] as List<dynamic> : <dynamic>[];
      final online = perangkat.whereType<Map<Object?, Object?>>().any((p) => p['online'] == true);
      setState(() {
        _alatOnline = online;
        _modeAlat = v6['mode']?.toString();
        _hariSemaiAlat = v6['hari_semai']?.toString();
        _targetPpmAlat = v6['target_ppm']?.toString();
      });
    } catch (_) {}
  }

  Future<void> _mulaiModeSemaiAlat() async {
    if (!_admin || _sibuk) return;
    final ppmCtrl = TextEditingController(text: '500');
    final phMinCtrl = TextEditingController(text: '5.8');
    final phMaxCtrl = TextEditingController(text: '6.5');

    final konfirmasi = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mulai Mode SEMAI di Alat'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Perintah ini mengaktifkan mode SEMAI di ESP32 v6. Pastikan tandon, kalibrasi, dan uji lab sudah dikonfirmasi.',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 10),
            TextField(controller: ppmCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Target PPM Awal (400–600)')),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: TextField(controller: phMinCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'pH Min'))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: phMaxCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'pH Max'))),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Kirim Perintah SEMAI')),
        ],
      ),
    );

    final targetPpm = int.tryParse(ppmCtrl.text.trim()) ?? 500;
    final phMin = double.tryParse(phMinCtrl.text.replaceAll(',', '.')) ?? 5.8;
    final phMax = double.tryParse(phMaxCtrl.text.replaceAll(',', '.')) ?? 6.5;
    ppmCtrl.dispose();
    phMinCtrl.dispose();
    phMaxCtrl.dispose();

    if (konfirmasi != true || !mounted) return;
    setState(() => _sibuk = true);
    try {
      await widget.api.postJson('/api/aktuator/semai', {
        'target_ppm': targetPpm,
        'ph_min': phMin,
        'ph_max': phMax,
        'alasan': 'Mulai mode SEMAI eksplisit dari Pantau Semai',
      });
      if (!mounted) return;
      tampilkanPesan(context, 'Perintah SEMAI masuk antrean. Menunggu konfirmasi perangkat.');
      await _muatStatusAlat();
    } on ApiException catch (e) {
      if (mounted) tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_pengelola)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
            child: KacaCair(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Ikon.tanam, size: 18, color: Tok.hijauTeks),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Mode Alat v6: ${_modeAlat ?? 'BELUM DILAPORKAN'}'
                          '${_hariSemaiAlat != null && _hariSemaiAlat!.isNotEmpty ? ' · Hari ke-$_hariSemaiAlat' : ''}'
                          '${_targetPpmAlat != null && _targetPpmAlat!.isNotEmpty ? ' · Target $_targetPpmAlat PPM' : ''}',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (_admin && _modeAlat != 'SEMAI')
                        FilledButton.icon(
                          onPressed: _alatOnline && !_sibuk ? _mulaiModeSemaiAlat : null,
                          icon: const Icon(Ikon.siklus, size: 16),
                          label: Text(_alatOnline ? 'Mulai Mode SEMAI' : 'Alat Offline'),
                        ),
                      OutlinedButton.icon(
                        onPressed: () => bukaHalamanApp(
                          context,
                          NaikHarianPage(api: widget.api, tanpaAppBar: true),
                          judul: 'Target Nutrisi',
                        ),
                        icon: const Icon(Ikon.naik, size: 16),
                        label: const Text('Target Nutrisi'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => bukaHalamanApp(
                          context,
                          SetupWizardPage(
                            api: widget.api,
                            langkahAwal: 3,
                            modeUlang: true,
                            tanpaAppBar: true,
                            onSelesai: (_) => NavigasiShellScope.maybeOf(context)?.tutupHalaman(),
                          ),
                          judul: 'Tutorial Semai',
                        ),
                        icon: const Icon(Ikon.info, size: 16),
                        label: const Text('SOP Semai'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        Expanded(
          child: TanamPage(api: widget.api, aktif: widget.aktif),
        ),
      ],
    );
  }
}
