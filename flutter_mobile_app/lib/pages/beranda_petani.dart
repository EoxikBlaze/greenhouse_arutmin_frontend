import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/dock.dart';
import '../widgets/ikon.dart';
import '../widgets/motion.dart';
import '../widgets/rute.dart';
import 'asisten_page.dart';

/// Hasil penilaian satu angka sensor terhadap batas amannya.
enum Penilaian { aman, perluDicek, belumAda }

/// Aman bila di dalam [min]–[maks]. Batas yang tidak masuk akal (min ≥ maks, mis. 100–100)
/// atau kosong dianggap belum diatur: angka tidak dihakimi (aman), bukan dipaksa "perlu dicek".
Penilaian nilaiSensor(double? v, double? min, double? maks) {
  if (v == null) return Penilaian.belumAda;
  if (min == null || maks == null || min >= maks) return Penilaian.aman;
  return v < min || v > maks ? Penilaian.perluDicek : Penilaian.aman;
}

/// Beranda petani: satu layar, jawaban cepat "aman atau tidak".
/// Status alat, tiga angka besar (pH, nutrisi, suhu air), dan satu tombol ke Tanam.
class BerandaPetani extends StatefulWidget {
  const BerandaPetani({
    super.key,
    required this.api,
    this.aktif = true,
    this.onBukaTab,
  });

  final ApiService api;
  final bool aktif;
  final void Function(String label)? onBukaTab;

  @override
  State<BerandaPetani> createState() => _BerandaPetaniState();
}

class _BerandaPetaniState extends State<BerandaPetani> {
  Map<String, dynamic>? _data;
  String? _galat;
  bool _memuat = true;
  late final PollTimer _poll;

  @override
  void initState() {
    super.initState();
    _poll = PollTimer(const Duration(seconds: 15), () => _muat(senyap: true));
    _poll.atur(widget.aktif);
    _muat();
  }

  @override
  void didUpdateWidget(covariant BerandaPetani old) {
    super.didUpdateWidget(old);
    if (old.aktif != widget.aktif) {
      _poll.atur(widget.aktif);
      if (widget.aktif) _muat(senyap: true);
    }
  }

  @override
  void dispose() {
    _poll.dispose();
    super.dispose();
  }

  Future<void> _muat({bool senyap = false}) async {
    if (!senyap) setState(() => _memuat = true);
    try {
      final d = await widget.api.getJson('/dashboard');
      if (!mounted) return;
      setState(() {
        _data = d is Map<String, dynamic> ? d : null;
        _galat = _data == null
            ? 'Data belum bisa dibaca. Tarik layar untuk mencoba lagi.'
            : null;
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (!senyap || _data == null) _galat = e.message;
        _memuat = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final nama = judulKata(
      widget.api.user?['username']?.toString() ?? 'Petani',
    );
    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: () => _muat(senyap: true),
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          HeroHeader(
            judul: '${sapaanWaktu()}, $nama',
            subjudul: 'Kondisi kebun sekarang',
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 18, 16, DockNav.ruang(context)),
            child: _isi(),
          ),
        ],
      ),
    );
  }

  Widget _isi() {
    if (_memuat && _data == null) {
      return const Column(
        children: [
          SkeletonBox(height: 110, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 120, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 120, radius: 24),
        ],
      );
    }
    if (_galat != null && _data == null) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    final d = _data!;
    final iot = d['iotStatus'];
    final hidup = iot is Map && iot['online'] == true;
    final sensor = d['latest_sensor'] is Map
        ? d['latest_sensor'] as Map<Object?, Object?>
        : const <Object?, Object?>{};
    final ambang = d['ambang'] is Map
        ? d['ambang'] as Map<Object?, Object?>
        : const <Object?, Object?>{};
    final terakhir = iot is Map ? iot['last_seen']?.toString() : null;

    Widget angka(String label, String kunci, String satuan, int desimal) {
      final batas = ambang[kunci] is Map
          ? ambang[kunci] as Map<Object?, Object?>
          : const <Object?, Object?>{};
      return _KartuAngka(
        label: label,
        nilai: keDouble(sensor[kunci]),
        satuan: satuan,
        desimal: desimal,
        penilaian: nilaiSensor(
          keDouble(sensor[kunci]),
          keDouble(batas['min']),
          keDouble(batas['max']),
        ),
        lama: !hidup,
      );
    }

    return Column(
      children: [
        _KartuAlat(hidup: hidup, terakhir: terakhir),
        const SizedBox(height: 12),
        angka('pH (asam-basa air)', 'ph', '', 2),
        const SizedBox(height: 12),
        angka('Nutrisi (TDS)', 'tds', 'ppm', 0),
        const SizedBox(height: 12),
        angka('Suhu air', 'waterTemp', '°C', 1),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => Navigator.of(context).push(
              RuteHalus<void>(
                builder: (_) => AsistenPage(api: widget.api),
              ),
            ),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 56),
              backgroundColor: Tok.moss,
              foregroundColor: Tok.putih(0.95),
            ),
            icon: const Icon(Ikon.ai, size: 22),
            label: const Text(
              'Tanya Asisten AI GARAP',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ],
    );
  }
}

class _KartuAlat extends StatelessWidget {
  const _KartuAlat({required this.hidup, required this.terakhir});

  final bool hidup;
  final String? terakhir;

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Row(
        children: [
          Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: hidup ? Tok.moss : Tok.error,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(hidup ? 'Alat hidup' : 'Alat mati', style: Tok.h2),
                const SizedBox(height: 2),
                Text(
                  terakhir == null
                      ? 'Belum ada data dari alat.'
                      : hidup
                      ? 'Data terbaru ${waktuRelatif(terakhir)}'
                      : 'Data terakhir ${waktuRelatif(terakhir)}. Angka di bawah adalah bacaan lama.',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.35,
                    color: Tok.abuTeks,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _KartuAngka extends StatelessWidget {
  const _KartuAngka({
    required this.label,
    required this.nilai,
    required this.satuan,
    required this.desimal,
    required this.penilaian,
    required this.lama,
  });

  final String label;
  final double? nilai;
  final String satuan;
  final int desimal;
  final Penilaian penilaian;
  final bool lama;

  @override
  Widget build(BuildContext context) {
    final (teks, warna) = switch (penilaian) {
      Penilaian.aman => ('Aman', Tok.moss),
      Penilaian.perluDicek => ('Perlu dicek', Tok.error),
      Penilaian.belumAda => ('Belum ada data', Tok.abu),
    };
    return Opacity(
      opacity: lama ? 0.6 : 1,
      child: Panel(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(fontSize: 15, color: Tok.abuTeks),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    nilai == null
                        ? '-'
                        : '${nilai!.toStringAsFixed(desimal)}${satuan.isEmpty ? '' : ' $satuan'}',
                    style: Tok.h1.copyWith(fontSize: 38),
                  ),
                ],
              ),
            ),
            StatusPill(
              // data lama: jangan menilai aman/tidak (itu kondisi lalu); abu-abu "Data lama"
              teks: lama && nilai != null ? 'Data lama' : teks,
              warna: lama ? Tok.abu : warna,
            ),
          ],
        ),
      ),
    );
  }
}
