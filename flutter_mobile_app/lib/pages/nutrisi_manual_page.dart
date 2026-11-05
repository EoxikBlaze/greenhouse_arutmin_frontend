import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/kaca.dart';

const _zat = <String, String>{
  'nutrisi_a': 'Nutrisi A',
  'nutrisi_b': 'Nutrisi B',
  'ph_up': 'pH Up',
  'ph_down': 'pH Down',
};

/// Teks status untuk petani: berjalan / selesai / gagal / dibatalkan.
String labelStatusDosing(String? hasil) => switch (hasil) {
  'berjalan' => 'berjalan',
  'sukses' => 'selesai',
  'dibatalkan' => 'dibatalkan',
  _ => 'gagal',
};

/// Nutrisi Manual — POST /iot-v41/dosing-manual {zat, volume_ml}, riwayat GET /iot-v41/dosing-manual/riwayat.
/// Tidak terpengaruh saklar. Eksekusi pompa dari aplikasi masih DIKUNCI server: permintaan dicatat gagal.
class NutrisiManualPage extends StatefulWidget {
  const NutrisiManualPage({super.key, required this.api});

  final ApiService api;

  @override
  State<NutrisiManualPage> createState() => _NutrisiManualPageState();
}

class _NutrisiManualPageState extends State<NutrisiManualPage> {
  final _volume = TextEditingController(text: '10');
  String _pilih = 'nutrisi_a';
  List<Map<String, dynamic>> _riwayat = const [];
  Map<String, dynamic>? _batas;
  String? _pesan;
  bool _sibuk = false;

  bool get _bolehUbah => widget.api.role == 'admin';

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    _volume.dispose();
    super.dispose();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.getJson('/iot-v41/dosing-manual/riwayat');
      if (!mounted || d is! Map) return;
      setState(() {
        _riwayat = (d['data'] is List ? d['data'] as List : const [])
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _batas = d['batas'] is Map
            ? Map<String, dynamic>.from(d['batas'] as Map)
            : null;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _pesan = e.message);
    }
  }

  double? get _ml => double.tryParse(_volume.text.replaceAll(',', '.'));

  String? get _salah {
    final v = _ml;
    if (v == null || v <= 0) return 'Isi volume lebih dari 0 mL.';
    final maks = (((_batas?['zat'] as Map?)?[_pilih]) as Map?)?['maks_ml'];
    if (maks is num && v > maks) {
      return 'Melebihi batas $maks mL per sekali dosing.';
    }
    return null;
  }

  Future<void> _kirim(Map<String, dynamic> body) async {
    setState(() {
      _sibuk = true;
      _pesan = null;
    });
    try {
      final d = await widget.api.kirimJson('/iot-v41/dosing-manual', body);
      final teks = d is Map ? '${d['message'] ?? 'Diterima.'}' : 'Diterima.';
      if (mounted) setState(() => _pesan = teks);
    } on ApiException catch (e) {
      if (mounted) setState(() => _pesan = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
      await _muat();
    }
  }

  @override
  Widget build(BuildContext context) {
    final salah = _salah;
    return Scaffold(
      appBar: const AppBarGlass(judul: 'Nutrisi Manual', eyebrow: 'Kendali'),
      body: LatarHalaman(
        child: RefreshIndicator(
          onRefresh: _muat,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Dosing manual', style: Tok.h3),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _pilih,
                      decoration: const InputDecoration(labelText: 'Zat'),
                      items: [
                        for (final e in _zat.entries)
                          DropdownMenuItem(value: e.key, child: Text(e.value)),
                      ],
                      onChanged: _bolehUbah
                          ? (v) => setState(() => _pilih = v ?? _pilih)
                          : null,
                    ),
                    TextField(
                      controller: _volume,
                      enabled: _bolehUbah,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Volume (mL)',
                        errorText: salah,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Fail-safe, LOCK, batas per dosing, jeda minimum, dan jatah harian tetap berlaku. '
                      'Pompa dari aplikasi masih dikunci: permintaan dicatat gagal.',
                      style: Tok.kecil,
                    ),
                    const SizedBox(height: 8),
                    if (_bolehUbah)
                      Wrap(
                        spacing: 8,
                        children: [
                          FilledButton(
                            onPressed: _sibuk || salah != null
                                ? null
                                : () =>
                                      _kirim({'zat': _pilih, 'volume_ml': _ml}),
                            child: const Text('Dosing'),
                          ),
                          OutlinedButton(
                            onPressed: _sibuk
                                ? null
                                : () => _kirim({'aksi': 'stop'}),
                            child: const Text('Batal / STOP darurat'),
                          ),
                        ],
                      )
                    else
                      Text(
                        'Hanya admin yang dapat memberi dosis.',
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
              Text('Riwayat dosing manual', style: Tok.h3),
              const SizedBox(height: 8),
              if (_riwayat.isEmpty)
                Panel(
                  child: Text('Belum ada dosing manual.', style: Tok.kecil),
                ),
              for (final r in _riwayat.take(10))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Panel(
                    child: Row(
                      children: [
                        Expanded(
                          child: Text('${r['alasan'] ?? 'Dosing manual'}'),
                        ),
                        Text(
                          labelStatusDosing(r['hasil']?.toString()),
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
