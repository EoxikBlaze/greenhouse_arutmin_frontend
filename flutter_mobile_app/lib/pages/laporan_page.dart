import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../services/api_service.dart';
import '../services/laporan_pdf.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/halaman.dart';
import '../widgets/ikon.dart';

/// Rentang periode laporan → (dari, sampai) 'YYYY-MM-DD'; null = semua data.
({String? dari, String? sampai, String label}) rentangPeriode(
  int pilih,
  DateTime kini,
) {
  String iso(DateTime d) => d.toIso8601String().substring(0, 10);
  final hari = DateTime(kini.year, kini.month, kini.day);
  switch (pilih) {
    case 0:
      return (
        dari: iso(hari.subtract(const Duration(days: 6))),
        sampai: iso(hari),
        label: '7 hari terakhir',
      );
    case 1:
      return (
        dari: iso(hari.subtract(const Duration(days: 29))),
        sampai: iso(hari),
        label: '30 hari terakhir',
      );
    case 2:
      return (
        dari: iso(DateTime(kini.year, kini.month)),
        sampai: iso(hari),
        label: 'Bulan ini',
      );
    default:
      return (dari: null, sampai: null, label: 'Semua data');
  }
}

String _kueri(String? dari, String? sampai) => [
  if (dari != null) 'dari=$dari',
  if (sampai != null) 'sampai=$sampai',
].join('&');

/// Laporan & ekspor: perkiraan panen, saran nutrisi dari tren, unduh PDF, ekspor CSV.
class LaporanPage extends StatefulWidget {
  const LaporanPage({super.key, required this.api, this.kini});

  final ApiService api;

  /// Jam acuan (disuntik saat tes).
  final DateTime? kini;

  @override
  State<LaporanPage> createState() => _LaporanPageState();
}

class _LaporanPageState extends State<LaporanPage> {
  int _periode = 1;
  bool _memuat = true;
  String? _galat;
  String? _sibuk; // 'pdf' | jenis CSV yang sedang diunduh
  Map<Object?, Object?> _ringkasan = const {};
  List<Map<Object?, Object?>> _saran = const [];
  String _catatan = '';

  ({String? dari, String? sampai, String label}) get _rentang =>
      rentangPeriode(_periode, widget.kini ?? DateTime.now());

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat() async {
    setState(() {
      _memuat = true;
      _galat = null;
    });
    final r = _rentang;
    try {
      final hasil = await Future.wait([
        widget.api.getJson(
          '/api/analitik/ringkasan?${_kueri(r.dari, r.sampai)}',
        ),
        widget.api.getJson('/api/analitik/saran-dosis?jam=6'),
      ]);
      if (!mounted) return;
      final ringkasan = hasil[0] is Map
          ? hasil[0] as Map<Object?, Object?>
          : const <Object?, Object?>{};
      final saranRes = hasil[1] is Map
          ? hasil[1] as Map<Object?, Object?>
          : const <Object?, Object?>{};
      setState(() {
        _ringkasan = ringkasan;
        _saran =
            (saranRes['saran'] is List
                    ? saranRes['saran'] as List
                    : const <Object?>[])
                .whereType<Map<Object?, Object?>>()
                .toList();
        _catatan = saranRes['catatan']?.toString() ?? '';
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e.message;
        _memuat = false;
      });
    }
  }

  void _pesan(String teks, {bool galat = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(teks), backgroundColor: galat ? Tok.error : null),
    );
  }

  Future<void> _unduhPdf() async {
    setState(() => _sibuk = 'pdf');
    try {
      final bytes = await buatPdfLaporan(
        _ringkasan,
        saran: _saran,
        periode: _rentang.label,
      );
      final nama =
          'laporan-garap-${_rentang.dari ?? 'awal'}_${_rentang.sampai ?? 'kini'}.pdf';
      await Printing.sharePdf(bytes: bytes, filename: nama);
    } catch (e) {
      _pesan('PDF gagal dibuat: $e', galat: true);
    } finally {
      if (mounted) setState(() => _sibuk = null);
    }
  }

  Future<void> _unduhCsv(String jenis) async {
    setState(() => _sibuk = jenis);
    final r = _rentang;
    try {
      final bytes = await widget.api.getBytes(
        '/api/analitik/ekspor/$jenis.csv?${_kueri(r.dari, r.sampai)}',
        batas: const Duration(seconds: 60),
      );
      final nama = '$jenis-${r.dari ?? 'awal'}_${r.sampai ?? 'kini'}.csv';
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile.fromData(bytes, mimeType: 'text/csv', name: nama)],
          fileNameOverrides: [nama],
          subject: 'Data $jenis GARAP',
        ),
      );
    } on ApiException catch (e) {
      _pesan('Ekspor gagal: ${e.message}', galat: true);
    } catch (e) {
      _pesan('Ekspor gagal: $e', galat: true);
    } finally {
      if (mounted) setState(() => _sibuk = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final batch =
        (_ringkasan['batch_berjalan'] is List
                ? _ringkasan['batch_berjalan'] as List
                : const <Object?>[])
            .whereType<Map<Object?, Object?>>()
            .toList();
    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: _muat,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
        children: [
          PilPilih(
            label: const ['7 hari', '30 hari', 'Bulan ini', 'Semua'],
            pilih: _periode,
            gulir: true,
            onPilih: (i) {
              setState(() => _periode = i);
              _muat();
            },
          ),
          const SizedBox(height: Tok.sp4),
          if (_galat != null)
            ErrorPanel(pesan: _galat!, onCoba: _muat)
          else if (_memuat)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            )
          else ...[
            const Eyebrow('Unduh laporan'),
            const SizedBox(height: Tok.sp3),
            TombolGradasi(
              label: 'Unduh PDF (${_rentang.label})',
              ikon: Ikon.unduh,
              sibuk: _sibuk == 'pdf',
              onTap: _sibuk == null ? _unduhPdf : null,
            ),
            const SizedBox(height: Tok.sp6),
            const Eyebrow('Perkiraan panen'),
            const SizedBox(height: Tok.sp3),
            _DaftarPrediksi(batch: batch),
            const SizedBox(height: Tok.sp6),
            const Eyebrow('Saran nutrisi dari tren'),
            const SizedBox(height: Tok.sp3),
            _KartuSaran(saran: _saran, catatan: _catatan),
            const SizedBox(height: Tok.sp6),
            const Eyebrow('Ekspor data (CSV)'),
            const SizedBox(height: Tok.sp3),
            for (final (jenis, label) in const [
              ('sensor', 'Data sensor'),
              ('peringatan', 'Riwayat peringatan'),
              ('panen', 'Data panen'),
            ])
              Padding(
                padding: const EdgeInsets.only(bottom: Tok.sp2),
                child: Panel(
                  onTap: _sibuk == null ? () => _unduhCsv(jenis) : null,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  child: Row(
                    children: [
                      Icon(Ikon.unduh, size: 18, color: Tok.hijauTeks),
                      const SizedBox(width: Tok.sp3),
                      Expanded(child: Text(label, style: Tok.body)),
                      if (_sibuk == jenis)
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      else
                        Icon(Ikon.kanan, size: 18, color: Tok.abu),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _DaftarPrediksi extends StatelessWidget {
  const _DaftarPrediksi({required this.batch});

  final List<Map<Object?, Object?>> batch;

  @override
  Widget build(BuildContext context) {
    if (batch.isEmpty) {
      return Panel(
        child: Text('Tidak ada batch yang sedang berjalan.', style: Tok.kecil),
      );
    }
    return Column(
      children: [
        for (final b in batch.take(8))
          Padding(
            padding: const EdgeInsets.only(bottom: Tok.sp2),
            child: Panel(
              child: Row(
                children: [
                  Icon(Ikon.panen, size: 20, color: Tok.hijauTeks),
                  const SizedBox(width: Tok.sp3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${b['varietas'] ?? 'Tanaman'} · ${b['meja'] ?? '-'}',
                          style: Tok.body,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          _keterangan(b),
                          style: Tok.kecil,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  if (b['prediksi'] is Map)
                    _pilStatus((b['prediksi'] as Map)['status']?.toString()),
                ],
              ),
            ),
          ),
      ],
    );
  }

  static String _keterangan(Map<Object?, Object?> b) {
    final p = b['prediksi'];
    if (p is! Map) return 'Tahap ${b['tipe']} · durasi siklus belum diatur';
    final sisa = p['sisa_hari'];
    final kapan = sisa is num && sisa < 0
        ? 'lewat ${-sisa} hari'
        : '$sisa hari lagi';
    return 'Tahap ${b['tipe']} · panen ±${p['tgl_prediksi']} ($kapan)';
  }

  static Widget _pilStatus(String? s) => switch (s) {
    'segera' => StatusPill(teks: 'Segera', warna: Tok.warning),
    'terlambat' => StatusPill(teks: 'Lewat', warna: Tok.error),
    _ => StatusPill(teks: 'Sesuai', warna: Tok.moss),
  };
}

class _KartuSaran extends StatelessWidget {
  const _KartuSaran({required this.saran, required this.catatan});

  final List<Map<Object?, Object?>> saran;
  final String catatan;

  @override
  Widget build(BuildContext context) {
    Color warna(String? s) => switch (s) {
      'di_luar' => Tok.error,
      'perhatian' => Tok.warning,
      'aman' => Tok.moss,
      _ => Tok.abu,
    };
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (saran.isEmpty)
            Text('Belum ada data sensor untuk dibaca.', style: Tok.kecil),
          for (final s in saran)
            Padding(
              padding: const EdgeInsets.only(bottom: Tok.sp3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Icon(
                      Icons.circle,
                      size: 10,
                      color: warna(s['status']?.toString()),
                    ),
                  ),
                  const SizedBox(width: Tok.sp2),
                  Expanded(
                    child: Text(s['saran']?.toString() ?? '-', style: Tok.body),
                  ),
                ],
              ),
            ),
          if (catatan.isNotEmpty) Text(catatan, style: Tok.kecil),
        ],
      ),
    );
  }
}
