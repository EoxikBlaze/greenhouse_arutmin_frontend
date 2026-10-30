import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/dock.dart';
import '../widgets/halaman.dart';
import '../widgets/motion.dart';
import '../widgets/status_penampung.dart';

/// Kontrol air — GET /watercontrol/status, POST fill / stop / setMode.
class WaterControlPage extends StatefulWidget {
  const WaterControlPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

  @override
  State<WaterControlPage> createState() => _WaterControlPageState();
}

/// Backend menolak semua perintah kontrol air (503 kontrol_air_nonaktif) sampai jalur antrean aktif.
const bool _kontrolAktif = false;

class _WaterControlPageState extends State<WaterControlPage> {
  Map<String, dynamic>? _data;
  String? _galat;
  bool _memuat = true;
  bool _kerja = false;
  late final PollTimer _poll;

  /// Waktu fetch status sukses terakhir; [_putus] = fetch terbaru gagal, data lama tampil.
  DateTime? _sukses;
  bool _putus = false;
  final _penampung = GlobalKey<StatusPenampungPanelState>();

  @override
  void initState() {
    super.initState();
    _poll = PollTimer(
      const Duration(seconds: 5),
      () => _muat(senyap: true, segarkanMeja: false),
    );
    _poll.atur(widget.aktif);
    _muat();
  }

  @override
  void didUpdateWidget(covariant WaterControlPage old) {
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

  Future<void> _muat({bool senyap = false, bool segarkanMeja = true}) async {
    if (!senyap) setState(() => _memuat = true);
    _penampung.currentState?.muat(segarkanMeja: segarkanMeja);
    try {
      final d = await widget.api.getJson('/watercontrol/status');
      if (!mounted) return;
      setState(() {
        _data = d is Map<String, dynamic> ? d : null;
        _galat = _data == null
            ? 'Respons kontrol air tidak sesuai kontrak.'
            : null;
        _memuat = false;
        if (_data != null) {
          _sukses = DateTime.now();
          _putus = false;
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (!senyap || _data == null) _galat = e.message;
        if (_data != null) _putus = true;
        _memuat = false;
      });
    }
  }

  Future<void> _aksi(String path, [Map<String, dynamic>? body]) async {
    if (!_kontrolAktif || _kerja) return;
    setState(() => _kerja = true);
    try {
      await widget.api.postJson(path, body);
      if (!mounted) return;
      await _muat(senyap: true);
      if (!mounted) return;
      tampilkanPesan(context, 'Perintah terkirim.');
    } on ApiException catch (e) {
      if (!mounted) return;
      tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _kerja = false);
    }
  }

  Future<void> _konfirmasiIsi() async {
    if (!_kontrolAktif) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Buka katup pengisian?'),
        content: const Text(
          'Air akan mengalir ke penampung sampai dihentikan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Buka katup'),
          ),
        ],
      ),
    );
    if (ok == true) await _aksi('/watercontrol/fill');
  }

  Future<void> _konfirmasiMode(bool otomatis) async {
    if (!_kontrolAktif) return;
    final ok = await konfirmasi(
      context,
      judul: otomatis ? 'Ganti ke mode otomatis?' : 'Ganti ke mode manual?',
      isi: otomatis
          ? 'Sistem akan mengisi air sesuai level sensor.'
          : 'Katup tidak lagi diatur otomatis; Anda mengendalikannya sendiri.',
      labelYa: 'Ya, ganti',
    );
    if (!ok) return;
    await _aksi('/watercontrol/setMode', {
      'mode': otomatis ? 'AUTO' : 'MANUAL',
    });
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    final mode = '${d?['mode'] ?? '-'}'.toUpperCase();
    final katup = '${d?['valve_state'] ?? '-'}'.toUpperCase();
    final buka = katup == 'OPEN' || katup == 'ON';

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: () => _muat(senyap: true),
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          PageTop(
            eyebrow: 'Kebun & sensor',
            judul: 'Kontrol air',
            status: d == null
                ? null
                : StatusPill(
                    terang: true,
                    berdenyut: buka,
                    warna: buka ? Tok.moss : Tok.abu,
                    teks: buka ? 'Katup terbuka' : 'Katup tertutup',
                  ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, DockNav.ruang(context)),
            child: _isi(mode, buka),
          ),
        ],
      ),
    );
  }

  Widget _isi(String mode, bool buka) {
    if (_memuat && _data == null) {
      return const Column(
        children: [
          SkeletonBox(height: 330, radius: 28),
          SizedBox(height: 12),
          SkeletonBox(height: 120, radius: 24),
        ],
      );
    }
    if (_galat != null && _data == null) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    final otomatis = mode == 'AUTO';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!_kontrolAktif) ...[
          const BannerNonaktif(
            'Kontrol air dinonaktifkan sementara. Perangkat belum menerima maupun mengonfirmasi perintah dari aplikasi. '
            'Gunakan katup atau saklar fisik. Status di bawah tetap ditampilkan.',
          ),
          const SizedBox(height: Tok.sp3),
        ],
        if (_putus && _sukses != null) ...[
          BannerBasi(sejak: _sukses!),
          const SizedBox(height: Tok.sp3),
        ],
        FadeUp(
          child: HeroKartu(
            child: Column(
              children: [
                _Tetes(buka: buka),
                const SizedBox(height: Tok.sp3),
                Text(
                  buka ? 'Air sedang mengalir' : 'Katup tertutup',
                  style: Tok.h2,
                ),
                const SizedBox(height: 2),
                Text(
                  otomatis
                      ? 'Sistem mengisi air sesuai level sensor.'
                      : 'Anda mengendalikan katup sendiri.',
                  textAlign: TextAlign.center,
                  style: Tok.kecil,
                ),
                const SizedBox(height: Tok.sp4),
                PilPilih(
                  rata: true,
                  label: const ['Otomatis', 'Manual'],
                  pilih: otomatis ? 0 : 1,
                  onPilih: _kerja || !_kontrolAktif
                      ? null
                      : (i) {
                          if ((i == 0) != otomatis) _konfirmasiMode(i == 0);
                        },
                ),
                const SizedBox(height: Tok.sp4),
                Row(
                  children: [
                    Expanded(
                      child: TombolGradasi(
                        label: 'Isi air',
                        ikon: Ikon.tetes,
                        sibuk: _kerja,
                        onTap: _kontrolAktif ? _konfirmasiIsi : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 50,
                        child: OutlinedButton.icon(
                          onPressed: _kerja || !_kontrolAktif
                              ? null
                              : () => _aksi('/watercontrol/stop'),
                          icon: const Icon(Ikon.berhenti, size: 18),
                          label: const Text('Hentikan'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Tok.error,
                            backgroundColor: Colors.white.withValues(
                              alpha: 0.55,
                            ),
                            side: const BorderSide(color: Tok.error),
                            shape: const StadiumBorder(),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: Tok.sp4),
        Text(
          'Akun demo hanya dapat melihat status; perintah akan ditolak server.',
          style: Tok.kecil,
        ),
        const SizedBox(height: Tok.sp6),
        FadeUp(
          delay: FadeUp.urutan(1),
          child: const Eyebrow('Status penampung'),
        ),
        const SizedBox(height: Tok.sp3),
        FadeUp(
          delay: FadeUp.urutan(2),
          child: StatusPenampungPanel(
            key: _penampung,
            api: widget.api,
            bolehBuka: widget.api.role == 'admin',
          ),
        ),
      ],
    );
  }
}

/// Ikon tetes air yang bergoyang halus saat katup terbuka.
class _Tetes extends StatefulWidget {
  const _Tetes({required this.buka});

  final bool buka;

  @override
  State<_Tetes> createState() => _TetesState();
}

class _TetesState extends State<_Tetes> with SingleTickerProviderStateMixin {
  AnimationController? _c;

  @override
  void initState() {
    super.initState();
    if (animasiLoopAktif) {
      _c = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1600),
      )..repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final warna = widget.buka ? Tok.moss : Tok.abu;
    Widget isi(double t) {
      final naik = widget.buka ? -6 * t : 0.0;
      return Transform.translate(
        offset: Offset(0, naik),
        child: Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: warna.withValues(alpha: 0.12),
            border: Border.all(color: warna.withValues(alpha: 0.35), width: 2),
            boxShadow: widget.buka
                ? [
                    BoxShadow(
                      color: warna.withValues(alpha: 0.25 * (1 - t)),
                      blurRadius: 24 + 12 * t,
                      spreadRadius: 4 * t,
                    ),
                  ]
                : null,
          ),
          child: Icon(Ikon.tetes, size: 40, color: warna),
        ),
      );
    }

    final c = _c;
    if (c == null) return isi(0);
    return AnimatedBuilder(
      animation: c,
      builder: (context, _) => isi(Curves.easeInOut.transform(c.value)),
    );
  }
}
