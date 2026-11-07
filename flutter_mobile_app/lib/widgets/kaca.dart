import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../theme/tema.dart';
import '../theme/tokens.dart';
import '../util/performa.dart';

/// Permukaan "Liquid Glass" untuk Flutter (padanan blok Liquid Glass v5–v7 di web).
///
/// Flutter tidak punya `.glassEffect()` seperti SwiftUI, jadi ini versi buatan sendiri
/// dengan prinsip yang sama (lihat liquid-glass.md):
///  * dua tingkat material: [KacaVarian.chrome] ("regular", lapisan navigasi yang
///    mengambang: dock, app bar) dan kaca konten ([panel] / [bening]) yang lebih tembus;
///  * rim cahaya terarah ([RimKaca]): terang kiri-atas, redup kanan-bawah, pendar putih
///    di tepi, bayangan dalam di bawah untuk kesan tebal (netral, tanpa warna);
///  * kaca konten memakai [BackdropFilter.grouped]: semua panel di bawah satu [BackdropGroup]
///    berbagi SATU blur latar (padanan `GlassEffectContainer`), jauh lebih ringan dari
///    puluhan blur terpisah. Chrome tidak ikut grup karena menimpa konten (aturan engine:
///    filter yang tumpang-tindih tidak boleh berbagi kunci);
///  * efek tekan HANYA bila [onTap] diisi, dan diam bila pengguna mematikan animasi;
///  * mode Pekat ([PreferensiKaca]) dan kontras tinggi sistem → permukaan solid tanpa blur.
enum KacaVarian { chrome, panel, bening, solid }

/// Pilihan transparansi pengguna (padanan pilihan "Tampilan kaca" di web).
enum ModeKaca { jernih, standar, pekat }

/// Penyimpanan satu nilai teks; bisa diganti tiruan di unit test.
abstract class PenyimpanNilai {
  Future<String?> baca();
  Future<void> tulis(String nilai);
}

class PenyimpanKacaAman implements PenyimpanNilai {
  const PenyimpanKacaAman();

  static const _kunci = 'garap_kaca';
  static const _simpan = FlutterSecureStorage();

  @override
  Future<String?> baca() => _simpan.read(key: _kunci);

  @override
  Future<void> tulis(String nilai) => _simpan.write(key: _kunci, value: nilai);
}

/// Mode kaca aktif untuk seluruh aplikasi. [muat] sekali di `main()`, [atur] dari halaman Akun.
class PreferensiKaca {
  PreferensiKaca._();

  static final ValueNotifier<ModeKaca> mode = ValueNotifier(ModeKaca.standar);
  static PenyimpanNilai penyimpan = const PenyimpanKacaAman();

  static Future<void> muat() async {
    try {
      final v = await penyimpan.baca();
      mode.value = ModeKaca.values.firstWhere(
        (m) => m.name == v,
        orElse: () => ModeKaca.standar,
      );
    } catch (_) {
      // penyimpanan tidak bisa dibaca: tetap "standar"
    }
  }

  static Future<void> atur(ModeKaca m) async {
    mode.value = m;
    try {
      await penyimpan.tulis(m.name);
    } catch (_) {
      // tidak tersimpan, tetap berlaku sampai aplikasi ditutup
    }
  }
}

/// Menyebarkan [ModeKaca] dan status [ringan] ke permukaan kaca di bawahnya. Tanpa scope → standar.
class KacaScope extends InheritedWidget {
  const KacaScope({
    super.key,
    required this.mode,
    this.performaRingan,
    required super.child,
  });

  final ModeKaca mode;
  final bool? performaRingan;

  static ModeKaca of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<KacaScope>()?.mode ??
      ModeKaca.standar;

  /// Apakah sistem render sedang dalam mode ringan (tanpa blur berat, hemat CPU/GPU)?
  static bool ringan(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<KacaScope>()?.performaRingan ??
      PerformaRender.ringan;

  /// Permukaan harus solid: mode Pekat atau kontras tinggi dari sistem.
  static bool solid(BuildContext context) =>
      of(context) == ModeKaca.pekat || MediaQuery.of(context).highContrast;

  /// Pengali alpha tint: Jernih lebih tembus.
  static double k(BuildContext context) =>
      of(context) == ModeKaca.jernih ? 0.72 : 1.0;

  @override
  bool updateShouldNotify(KacaScope oldWidget) =>
      oldWidget.mode != mode || oldWidget.performaRingan != performaRingan;
}

class KacaCair extends StatefulWidget {
  const KacaCair({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = Tok.rKartu,
    this.gelap = false,
    this.blur = false,
    this.buram = true,
    this.varian = KacaVarian.panel,
    this.warna,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  /// true = kaca navy tanpa blur (panel gelap), false = kaca terang.
  /// Diabaikan oleh [KacaVarian.chrome] dan [KacaVarian.solid].
  final bool gelap;

  /// Lama: true = sama dengan `varian: KacaVarian.chrome`.
  final bool blur;

  /// Kaca konten ikut mengaburkan latar. Matikan untuk daftar sangat panjang.
  final bool buram;

  final KacaVarian varian;

  /// Tint kustom (kiri-atas → kanan-bawah), mis. KPI hijau/emas atau hero.
  /// Alpha diskalakan mode Jernih; di mode solid warnanya dibuat pekat.
  final List<Color>? warna;

  /// Bila diisi, kaca ikut efek tekan seperti pegas.
  final VoidCallback? onTap;

  @override
  State<KacaCair> createState() => _KacaCairState();
}

class _KacaCairState extends State<KacaCair> {
  bool _turun = false;

  void _atur(bool v) {
    if (_turun != v) setState(() => _turun = v);
  }

  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(widget.radius);
    final solidMode = KacaScope.solid(context);
    final ringanMode = KacaScope.ringan(context);
    final k = KacaScope.k(context);
    final chrome = widget.varian == KacaVarian.chrome || widget.blur;
    final solid = widget.varian == KacaVarian.solid;
    final gelap = widget.gelap && !solid && !chrome;

    final Widget isi = Padding(padding: widget.padding, child: widget.child);

    Widget kaca;
    if (solid || solidMode) {
      // Permukaan solid (sheet, form, mode Pekat, kontras tinggi): tanpa blur.
      final warna = widget.warna;
      kaca = DecoratedBox(
        decoration: BoxDecoration(
          color: warna == null ? (gelap ? Tok.navy : Tok.permukaan) : null,
          gradient: warna == null
              ? null
              : LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [for (final c in warna) c.withValues(alpha: 1)],
                ),
          borderRadius: r,
          border: Border.all(
            color: solidMode && !solid
                ? (gelap ? Colors.white70 : Tok.navy.withValues(alpha: 0.35))
                : Tok.garis,
          ),
        ),
        child: isi,
      );
    } else {
      // Tint kaca diselaraskan dengan Liquid Glass v7 di website (index.css + tema-gelap.css).
      // Pada mode ringan (CPU lambat / 20x slower CPU), alpha dinaikkan sedikit agar
      // tetap kontras dan jernih walau tanpa BackdropFilter blur.
      final List<Color> dasar =
          widget.warna ??
          (gelap
              ? [
                  Tok.navy.withValues(alpha: ringanMode ? 0.86 : 0.72),
                  Tok.navy2.withValues(alpha: ringanMode ? 0.76 : 0.54),
                ]
              : chrome
              ? Tok.tintChrome
              : Tok.tintKartu);
      final pengaliRingan = ringanMode ? 1.18 : 1.0;
      final permukaan = Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: const Alignment(-0.85, -1.0),
            end: const Alignment(0.85, 1.0),
            colors: [
              for (final c in dasar)
                c.withValues(
                  alpha: (c.a * k * pengaliRingan).clamp(0.0, 0.96),
                ),
            ],
          ),
          borderRadius: r,
        ),
        // kilau spekular di kiri atas (padanan --lg-spec di website); dimatikan di mode ringan
        foregroundDecoration: ringanMode
            ? null
            : BoxDecoration(
                borderRadius: r,
                gradient: RadialGradient(
                  center: const Alignment(-0.72, -1.05),
                  radius: 1.3,
                  colors: [
                    Colors.white.withValues(
                      alpha: gelap || Tok.gelap ? 0.16 : 0.46,
                    ),
                    Colors.white.withValues(alpha: 0),
                  ],
                ),
              ),
        child: CustomPaint(
          foregroundPainter: RimKaca(
            radius: widget.radius,
            gelap: gelap,
            kecil: ringanMode,
          ),
          child: isi,
        ),
      );
      final pakaiBlur = !ringanMode && (chrome || (widget.buram && !gelap));
      final sigma = chrome ? 24.0 : 14.0;
      final filter = pakaiBlur
          ? ImageFilter.blur(sigmaX: sigma, sigmaY: sigma)
          : null;
      kaca = ClipRRect(
        borderRadius: r,
        child: !pakaiBlur
            ? permukaan
            : chrome
            ? BackdropFilter(filter: filter!, child: permukaan)
            : BackdropFilter.grouped(filter: filter!, child: permukaan),
      );
    }

    final bayang = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        boxShadow: ringanMode
            ? const [
                BoxShadow(
                  color: Color(0x18141E28),
                  blurRadius: 8,
                  offset: Offset(0, 3),
                ),
              ]
            : [
                const BoxShadow(
                  color: Color(0x14141E28),
                  blurRadius: 2,
                  offset: Offset(0, 1),
                ),
                BoxShadow(
                  color: Color(chrome ? 0x52141E28 : 0x40141E28),
                  blurRadius: chrome ? 46 : 36,
                  spreadRadius: chrome ? -16 : -14,
                  offset: Offset(0, chrome ? 18 : 12),
                ),
              ],
      ),
      child: kaca,
    );

    // Terisolasi agar blur/animasi di dalamnya tidak melukis ulang halaman.
    if (widget.onTap == null) return RepaintBoundary(child: bayang);
    final diam = MediaQuery.disableAnimationsOf(context) || ringanMode;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _atur(true),
      onTapUp: (_) => _atur(false),
      onTapCancel: () => _atur(false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _turun && !diam ? 0.96 : 1,
        duration: diam ? Duration.zero : const Duration(milliseconds: 220),
        curve: _turun ? Curves.easeOut : Curves.easeOutBack,
        child: RepaintBoundary(child: bayang),
      ),
    );
  }
}

/// Rim cahaya kaca (padanan --lg-rim web, yang di CSS memakai inset box-shadow):
///  1. garis tepi bergradasi: terang di kiri-atas, hampir hilang di tengah, sedang di kanan-bawah;
///  2. pendar dalam putih di sepanjang tepi (kesan tepi kaca yang membulat);
///  3. bayangan dalam tipis di bawah (ketebalan).
/// Semua netral (putih/abu-gelap): tanpa pendar warna agar kaca tidak berwarna biru.
/// Dipakai juga oleh elemen kecil tanpa blur ([kecil] = garis lebih tipis, tanpa pendar warna).
class RimKaca extends CustomPainter {
  const RimKaca({required this.radius, this.gelap = false, this.kecil = false});

  final double radius;
  final bool gelap;
  final bool kecil;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rect = Offset.zero & size;
    final rr = RRect.fromRectAndRadius(rect, Radius.circular(radius));
    final f = gelap || Tok.gelap ? 0.5 : 1.0;

    canvas.save();
    canvas.clipRRect(rr);

    if (!kecil) {
      // pendar dalam putih
      canvas.drawRRect(
        rr,
        Paint()
          ..color = Colors.white.withValues(alpha: 0.38 * f)
          ..maskFilter = const MaskFilter.blur(BlurStyle.inner, 7),
      );
      // dispersi cahaya Glisse di tepi kiri (sian lembut) & kanan (mawar lembut) seperti --lg-dispersi di web
      canvas.drawRRect(
        rr.deflate(0.8),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6
          ..shader = LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              const Color(0xFF78C8FF).withValues(alpha: 0.28 * f),
              Colors.transparent,
              Colors.transparent,
              const Color(0xFFFF96D2).withValues(alpha: 0.20 * f),
            ],
            stops: const [0.0, 0.18, 0.82, 1.0],
          ).createShader(rect),
      );
      // ketebalan: bayangan dalam di bagian bawah
      canvas.drawRRect(
        rr,
        Paint()
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x00141E28), Color(0x26141E28)],
            stops: [0.55, 1],
          ).createShader(rect)
          ..maskFilter = const MaskFilter.blur(BlurStyle.inner, 10),
      );
    }

    // garis tepi bergradasi
    final lebar = kecil ? 1.0 : 1.4;
    canvas.drawRRect(
      rr.deflate(lebar / 2),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = lebar
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.95 * f),
            Colors.white.withValues(alpha: 0.2 * f),
            Colors.white.withValues(alpha: 0.14 * f),
            Colors.white.withValues(alpha: 0.6 * f),
          ],
          stops: const [0, 0.42, 0.6, 1],
        ).createShader(rect),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(RimKaca old) =>
      old.radius != radius ||
      old.gelap != gelap ||
      old.kecil != kecil ||
      Tok.gelap;
}

/// Latar untuk ditaruh DI BELAKANG kaca: pemandangan pegunungan & rumah tanam yang
/// diperkaya lapisan atmosfer baru (`_KabutAuroraPainter` — padanan `.app-latar` +
/// `.vsf-kabut` di website) sehingga kartu Liquid Glass di atasnya membiaskan
/// cahaya emas, zamrud, dan biru langit yang seragam antara mode terang (White Mode)
/// dan mode gelap (Black Mode).
class LatarCair extends StatelessWidget {
  const LatarCair({super.key});

  @override
  Widget build(BuildContext context) {
    final ringan = KacaScope.ringan(context);
    final lebarCache = ringan ? 640 : 1280;
    if (ringan) {
      return RepaintBoundary(
        child: IgnorePointer(
          child: Stack(
            fit: StackFit.expand,
            children: [
              ColoredBox(
                color: Tok.gelap
                    ? const Color(0xFF061322)
                    : const Color(0xFF4B9BDC),
              ),
              Image.asset(
                Tok.gelap
                    ? 'assets/latar/bg-malam.jpg'
                    : 'assets/latar/bg-lanskap.jpg',
                fit: BoxFit.cover,
                alignment: Alignment.center,
                cacheWidth: lebarCache,
                gaplessPlayback: true,
                excludeFromSemantics: true,
              ),
              CustomPaint(
                painter: _KabutAuroraPainter(gelap: Tok.gelap, ringan: true),
              ),
            ],
          ),
        ),
      );
    }
    return RepaintBoundary(
      child: IgnorePointer(
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: Color(0xFF4B9BDC)),
            Image.asset(
              'assets/latar/bg-lanskap.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.center,
              cacheWidth: lebarCache,
              gaplessPlayback: true,
              excludeFromSemantics: true,
            ),
            // foto malam memudar masuk di atas foto siang
            AnimatedOpacity(
              opacity: Tok.gelap ? 1 : 0,
              duration: MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 700),
              curve: Tok.ease,
              child: Image.asset(
                'assets/latar/bg-malam.jpg',
                fit: BoxFit.cover,
                alignment: Alignment.center,
                cacheWidth: lebarCache,
                gaplessPlayback: true,
                excludeFromSemantics: true,
              ),
            ),
            // Lapisan atmosfer & pendar cahaya baru (padanan .vsf-kabut + aurora web)
            CustomPaint(
              painter: _KabutAuroraPainter(gelap: Tok.gelap, ringan: false),
            ),
          ],
        ),
      ),
    );
  }
}

class _KabutAuroraPainter extends CustomPainter {
  const _KabutAuroraPainter({required this.gelap, required this.ringan});

  final bool gelap;
  final bool ringan;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final rect = Offset.zero & size;

    // 1. Gradasi atmosfer vertikal (.vsf-kabut di web)
    canvas.drawRect(
      rect,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: gelap
              ? const [
                  Color(0x5204101E),
                  Color(0x24071527),
                  Color(0x7004101E),
                ]
              : const [
                  Color(0x240A1F38),
                  Color(0x14FFFFFF),
                  Color(0x470A1F38),
                ],
          stops: const [0.0, 0.36, 1.0],
        ).createShader(rect),
    );

    if (ringan) return;

    // 2. Pendar cahaya matahari/bulan keemasan di kanan atas (membuat kaca membiaskan kilau hangat)
    final rEmas = Rect.fromCircle(
      center: Offset(size.width * 0.88, size.height * 0.12),
      radius: size.shortestSide * 0.65,
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Tok.emas.withValues(alpha: gelap ? 0.16 : 0.24),
            Tok.emas.withValues(alpha: 0),
          ],
        ).createShader(rEmas),
    );

    // 3. Pendar zamrud rumah tanam di kiri bawah
    final rHijau = Rect.fromCircle(
      center: Offset(size.width * 0.14, size.height * 0.82),
      radius: size.shortestSide * 0.72,
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            Tok.moss.withValues(alpha: gelap ? 0.20 : 0.22),
            Tok.moss.withValues(alpha: 0),
          ],
        ).createShader(rHijau),
    );

    // 4. Pendar langit sian-biru lembut di kiri atas
    final rBiru = Rect.fromCircle(
      center: Offset(size.width * 0.18, size.height * 0.18),
      radius: size.shortestSide * 0.60,
    );
    canvas.drawRect(
      rect,
      Paint()
        ..shader = RadialGradient(
          colors: [
            const Color(0xFF63B3ED).withValues(alpha: gelap ? 0.14 : 0.20),
            const Color(0xFF63B3ED).withValues(alpha: 0),
          ],
        ).createShader(rBiru),
    );
  }

  @override
  bool shouldRepaint(covariant _KabutAuroraPainter old) =>
      old.gelap != gelap || old.ringan != ringan;
}

/// Tombol saklar tema Terang/Gelap bergaya kapsul kaca (padanan `.vsf-saklar-tema` di web).
/// Bisa ditempatkan di kepala halaman mana saja agar pengguna dapat berpindah antara
/// White Mode dan Black Mode dalam 1 ketukan.
class TombolTemaKaca extends StatelessWidget {
  const TombolTemaKaca({super.key});

  @override
  Widget build(BuildContext context) {
    final gelap = Tok.gelap;
    return Semantics(
      button: true,
      label: gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap',
      child: Tooltip(
        message: gelap ? 'Tema terang (White Mode)' : 'Tema gelap (Black Mode)',
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () => PreferensiTema.atur(!gelap),
          child: Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Tok.isiKaca(0.68, 0.72),
              border: Border.all(color: Tok.tepiKaca),
            ),
            child: Icon(
              gelap ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
              size: 19,
              color: gelap ? Tok.emas : Tok.navy,
            ),
          ),
        ),
      ),
    );
  }
}

/// Latar cair di belakang [child] — untuk halaman yang dibuka di atas shell
/// (CCTV, Asisten AI, Meja, Riwayat, Tentang Kami) supaya kacanya seragam.
/// Isi dibungkus [BackdropGroup] agar panel kacanya berbagi satu blur.
class LatarHalaman extends StatelessWidget {
  const LatarHalaman({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(child: LatarCair()),
        Positioned.fill(child: BackdropGroup(child: child)),
      ],
    );
  }
}

/// Isi bottom sheet: latar sheet dibuat transparan, lalu isinya dibungkus permukaan
/// solid putih (HIG: sheet yang berisi tugas dibuat pekat) bertepi cahaya, sudut
/// konsentris dengan dock (28).
class SheetKaca extends StatelessWidget {
  const SheetKaca({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
    child: KacaCair(
      varian: KacaVarian.solid,
      radius: Tok.rChrome,
      padding: EdgeInsets.zero,
      child: child,
    ),
  );
}
