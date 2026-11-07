import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/halaman.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Item peringatan baik dari kondisi alat saat ini (IoT params)
/// maupun riwayat tercatat (GET /alert-logs).
class ItemPeringatan {
  const ItemPeringatan({
    required this.id,
    required this.kode,
    required this.pesan,
    required this.level,
    required this.aktif,
    required this.waktu,
    this.bisaDiack = true,
  });

  final String id;
  final String kode;
  final String pesan;
  /// 'merah' (kritis), 'kuning' (peringatan/perhatian), 'info'
  final String level;
  final bool aktif;
  final String waktu;
  final bool bisaDiack;
}

/// Halaman Peringatan sistem (padanan web: PeringatanPage).
/// Memantau kondisi anomali sensor/alat, menampilkan riwayat alert logs,
/// serta memberikan aksi "Tandai Selesai" dan "Catat permintaan RESET".
class PeringatanPage extends StatefulWidget {
  const PeringatanPage({
    super.key,
    required this.api,
    this.onSelesai,
  });

  final ApiService api;
  final VoidCallback? onSelesai;

  @override
  State<PeringatanPage> createState() => _PeringatanPageState();
}

class _PeringatanPageState extends State<PeringatanPage> {
  static const Color _warnaSukses = Color(0xFF16A34A);

  List<ItemPeringatan> _daftar = [];
  bool _memuat = true;
  bool _sibukReset = false;
  String? _pesanSukses;
  String? _galat;
  int _filter = 0; // 0: Semua, 1: Aktif, 2: Selesai
  final String _waktuBuka = DateTime.now().toIso8601String();

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat({bool senyap = false}) async {
    if (!senyap) setState(() => _memuat = true);
    try {
      // 1. Ambil alert logs dari server
      final res = await widget.api.getJson('/alert-logs?limit=100');
      final rows = (res is Map && res['data'] is List)
          ? (res['data'] as List).whereType<Map<Object?, Object?>>()
          : <Map<Object?, Object?>>[];

      final listDariDb = rows.map((r) {
        final rawId = r['id']?.toString() ?? '0';
        final rawSeverity = r['severity']?.toString().toLowerCase() ?? 'info';
        final level = rawSeverity == 'critical'
            ? 'merah'
            : (rawSeverity == 'warning' ? 'kuning' : 'info');
        final isAck = r['acknowledged'] == true;

        return ItemPeringatan(
          id: 'a-$rawId',
          kode: (r['type']?.toString() ?? 'PERINGATAN').toUpperCase(),
          pesan: r['value']?.toString() ?? 'Peringatan terdeteksi.',
          level: level,
          aktif: !isAck,
          waktu: r['created_at']?.toString() ?? '',
          bisaDiack: true,
        );
      }).toList();

      // 2. Ambil kondisi status alat saat ini (IoT params) jika ada
      final List<ItemPeringatan> listKondisi = [];
      try {
        final iotState = await widget.api.getJson('/iot-v41/state');
        if (iotState is Map && iotState['params'] is Map) {
          final p = iotState['params'] as Map;
          final waktuAcuan = iotState['kondisi'] is Map &&
                  iotState['kondisi']['updated_at'] != null
              ? iotState['kondisi']['updated_at'].toString()
              : _waktuBuka;

          if (p['tahan_dosing'] == true) {
            listKondisi.add(ItemPeringatan(
              id: 'kondisi-tahan',
              kode: 'AIR_DIGANTI',
              pesan: p['tahan_alasan']?.toString() ??
                  'Pemberian nutrisi ditahan otomatis karena perubahan EC/pH yang drastis.',
              level: 'merah',
              aktif: true,
              waktu: waktuAcuan,
              bisaDiack: false,
            ));
          }
          if (p['pemeliharaan'] == true) {
            listKondisi.add(ItemPeringatan(
              id: 'kondisi-pemeliharaan',
              kode: 'MODE_PEMELIHARAAN',
              pesan:
                  'Mode pemeliharaan sedang aktif — semua pompa dimatikan dan hitungan dibekukan.',
              level: 'kuning',
              aktif: true,
              waktu: waktuAcuan,
              bisaDiack: false,
            ));
          }
          if (p['ec_setpoint'] != null && (p['ec_setpoint'] as num) == 0) {
            listKondisi.add(ItemPeringatan(
              id: 'kondisi-tidur',
              kode: 'TARGET_TIDUR',
              pesan:
                  'Target EC bernilai 0 ppm (mode tidur): alat memantau sensor tanpa menyuntik nutrisi.',
              level: 'kuning',
              aktif: true,
              waktu: waktuAcuan,
              bisaDiack: false,
            ));
          }
        }
      } catch (_) {
        // Abaikan galat state IoT, tetap tampilkan riwayat log
      }

      if (!mounted) return;
      setState(() {
        _daftar = [...listKondisi, ...listDariDb];
        _galat = null;
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e.message;
        _memuat = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = 'Gagal memuat daftar peringatan: $e';
        _memuat = false;
      });
    }
  }

  Future<void> _tandaiSelesai(ItemPeringatan item) async {
    final cleanId = item.id.replaceFirst(RegExp(r'^a-'), '');
    try {
      await widget.api.postJson('/alert-logs/$cleanId/ack');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Peringatan ditandai selesai.'),
          duration: Duration(seconds: 2),
        ),
      );
      widget.onSelesai?.call();
      await _muat(senyap: true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          backgroundColor: Tok.error,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _kirimReset() async {
    setState(() {
      _sibukReset = true;
      _pesanSukses = null;
      _galat = null;
    });
    try {
      final res = await widget.api.postJson('/iot-v41/reset-peringatan');
      final msg = res is Map && res['message'] != null
          ? res['message'].toString()
          : 'Permintaan reset dicatat di server.';
      if (!mounted) return;
      setState(() {
        _pesanSukses = msg;
        _sibukReset = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          duration: const Duration(seconds: 4),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e.message;
        _sibukReset = false;
      });
    } finally {
      if (mounted) setState(() => _sibukReset = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.api.role;
    final bolehUbah = role == 'admin';

    final totalAktif = _daftar.where((a) => a.aktif).length;
    final totalSemua = _daftar.length;

    // Filter list
    final terfilter = _daftar.where((a) {
      if (_filter == 1) return a.aktif;
      if (_filter == 2) return !a.aktif;
      return true;
    }).toList();

    return Scaffold(
      appBar: const AppBarGlass(
        judul: 'Peringatan',
        eyebrow: 'Sistem',
      ),
      body: LatarHalaman(
        child: RefreshIndicator(
          onRefresh: () => _muat(senyap: true),
          child: ListView(
            padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.paddingOf(context).bottom + 32),
            children: [
              FadeUp(
                child: PageTop(
                  eyebrow: 'Sistem',
                  judul: 'Peringatan',
                  status: StatusPill(
                    warna: totalAktif > 0 ? Tok.error : _warnaSukses,
                    teks: totalAktif > 0
                        ? '$totalAktif Peringatan Aktif'
                        : 'Semua Normal',
                    berdenyut: totalAktif > 0,
                  ),
                ),
              ),
              const SizedBox(height: Tok.sp3),
              FadeUp(
                delay: FadeUp.urutan(1),
                child: Text(
                  'Kondisi yang perlu diperhatikan beserta tingkat keparahannya (merah mengalahkan kuning pada lampu pilot).',
                  style: Tok.kecil.copyWith(color: Tok.abuTeks, height: 1.4),
                ),
              ),
              const SizedBox(height: Tok.sp6),

              if (_pesanSukses != null) ...[
                FadeUp(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: _warnaSukses.withValues(alpha: Tok.gelap ? 0.2 : 0.12),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _warnaSukses.withValues(alpha: Tok.gelap ? 0.5 : 0.3),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check_circle_rounded, color: _warnaSukses, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _pesanSukses!,
                            style: TextStyle(
                              fontSize: 13,
                              color: Tok.gelap ? Colors.white : Tok.tinta,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: Tok.sp4),
              ],

              if (_galat != null) ...[
                FadeUp(
                  child: ErrorPanel(
                    pesan: _galat!,
                    onCoba: () => _muat(),
                  ),
                ),
                const SizedBox(height: Tok.sp4),
              ],

              // Ringkasan Peringatan
              FadeUp(
                delay: FadeUp.urutan(2),
                child: Panel(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _StatMini(
                              label: 'Peringatan aktif',
                              nilai: '$totalAktif',
                              keterangan: 'Merah mengalahkan kuning',
                              warnaNilai: totalAktif > 0 ? Tok.error : _warnaSukses,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _StatMini(
                              label: 'Total tercatat',
                              nilai: '$totalSemua',
                              keterangan: '100 terbaru ditampilkan',
                              warnaNilai: Tok.tinta,
                            ),
                          ),
                        ],
                      ),
                      if (bolehUbah) ...[
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Aksi Kontrol Sistem',
                                    style: TextStyle(
                                      fontFamily: Tok.fontJudul,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: Tok.tinta,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'RESET hanya dicatat di server dan tidak menghapus riwayat.',
                                    style: TextStyle(fontSize: 11.5, color: Tok.abuTeks, height: 1.3),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              onPressed: _sibukReset ? null : _kirimReset,
                              icon: _sibukReset
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : const Icon(Icons.restart_alt_rounded, size: 16),
                              label: Text(_sibukReset ? 'Mencatat...' : 'RESET'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Tok.warning,
                                side: BorderSide(
                                  color: Tok.warning.withValues(alpha: 0.6),
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: Tok.sp6),

              // Filter Segmen
              FadeUp(
                delay: FadeUp.urutan(3),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Eyebrow('Daftar Peringatan'),
                    PilPilih(
                      label: const ['Semua', 'Aktif', 'Selesai'],
                      pilih: _filter,
                      onPilih: (i) => setState(() => _filter = i),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Tok.sp3),

              // Daftar Item Peringatan
              if (_memuat) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ] else if (terfilter.isEmpty) ...[
                FadeUp(
                  child: Panel(
                    padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle_outline_rounded,
                          size: 46,
                          color: _warnaSukses.withValues(alpha: 0.8),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _filter == 1
                              ? 'Tidak ada peringatan aktif.'
                              : (_filter == 2
                                  ? 'Belum ada peringatan yang selesai.'
                                  : 'Riwayat peringatan kosong.'),
                          style: TextStyle(
                            fontFamily: Tok.fontJudul,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Tok.tinta,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Semua sensor dan alat greenhouse terpantau normal.',
                          style: TextStyle(fontSize: 12.5, color: Tok.abuTeks),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                for (var i = 0; i < terfilter.length; i++) ...[
                  FadeUp(
                    delay: FadeUp.urutan(i % 10),
                    child: _KartuPeringatan(
                      item: terfilter[i],
                      bolehUbah: bolehUbah,
                      onTandaiSelesai: () => _tandaiSelesai(terfilter[i]),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatMini extends StatelessWidget {
  const _StatMini({
    required this.label,
    required this.nilai,
    required this.keterangan,
    required this.warnaNilai,
  });

  final String label;
  final String nilai;
  final String keterangan;
  final Color warnaNilai;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Tok.isiKaca(0.5, 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Tok.tepiKaca),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Tok.abuTeks),
          ),
          const SizedBox(height: 4),
          Text(
            nilai,
            style: TextStyle(
              fontFamily: Tok.fontJudul,
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: warnaNilai,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            keterangan,
            style: TextStyle(fontSize: 11, color: Tok.abuTeks),
          ),
        ],
      ),
    );
  }
}

class _KartuPeringatan extends StatelessWidget {
  const _KartuPeringatan({
    required this.item,
    required this.bolehUbah,
    required this.onTandaiSelesai,
  });

  final ItemPeringatan item;
  final bool bolehUbah;
  final VoidCallback onTandaiSelesai;

  static const Color _warnaSukses = Color(0xFF16A34A);
  static const Color _warnaInfo = Color(0xFF2563EB);

  Color get _warnaLevel {
    switch (item.level) {
      case 'merah':
        return Tok.error;
      case 'kuning':
        return Tok.warning;
      case 'info':
      default:
        return _warnaInfo;
    }
  }

  String get _labelLevel {
    switch (item.level) {
      case 'merah':
        return 'KRITIS';
      case 'kuning':
        return 'PERHATIAN';
      case 'info':
      default:
        return 'INFORMASI';
    }
  }

  IconData get _ikonLevel {
    switch (item.level) {
      case 'merah':
        return Icons.error_outline_rounded;
      case 'kuning':
        return Icons.warning_amber_rounded;
      case 'info':
      default:
        return Icons.info_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final warna = _warnaLevel;
    final aktif = item.aktif;

    return Panel(
      warnaTepi: aktif ? warna.withValues(alpha: 0.35) : null,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                decoration: BoxDecoration(
                  color: warna.withValues(alpha: Tok.gelap ? 0.22 : 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: warna.withValues(alpha: 0.35),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_ikonLevel, size: 12.5, color: warna),
                    const SizedBox(width: 4),
                    Text(
                      _labelLevel,
                      style: TextStyle(
                        fontFamily: Tok.fontJudul,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: warna,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                decoration: BoxDecoration(
                  color: Tok.isiKaca(0.5, 0.6),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  item.kode,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Tok.tinta,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                decoration: BoxDecoration(
                  color: aktif
                      ? Tok.error.withValues(alpha: 0.12)
                      : _warnaSukses.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: aktif
                        ? Tok.error.withValues(alpha: 0.3)
                        : _warnaSukses.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  aktif ? 'aktif' : 'selesai',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: aktif ? Tok.error : _warnaSukses,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            item.pesan,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              color: Tok.tinta,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.schedule_rounded, size: 13, color: Tok.abuTeks),
              const SizedBox(width: 4),
              Text(
                item.waktu.isNotEmpty ? waktuPendek(item.waktu) : '-',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11.5,
                  color: Tok.abuTeks,
                ),
              ),
              const Spacer(),
              if (aktif && bolehUbah && item.bisaDiack)
                InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: onTandaiSelesai,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.done_all_rounded,
                          size: 14,
                          color: _warnaSukses,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'tandai selesai',
                          style: const TextStyle(
                            fontFamily: Tok.fontJudul,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: _warnaSukses,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
