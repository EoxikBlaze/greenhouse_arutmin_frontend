import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../theme/tokens.dart';

/// Permukaan "Liquid Glass" untuk Flutter (padanan blok Liquid Glass v5–v7 di web).
///
/// Flutter tidak punya `.glassEffect()` seperti SwiftUI, jadi ini versi buatan sendiri
/// dengan prinsip yang sama (lihat liquid-glass.md):
///  * dua tingkat material: [KacaVarian.chrome] ("regular", lapisan navigasi yang
///    mengambang: dock, app bar) dan kaca konten ([panel] / [bening]) yang lebih tembus;
///  * rim cahaya terarah ([RimKaca]): terang kiri-atas, redup kanan-bawah, pendar biru/hangat
///    di tepi, bayangan dalam di bawah untuk kesan tebal;
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

/// Menyebarkan [ModeKaca] ke permukaan kaca di bawahnya. Tanpa scope → standar.
class KacaScope extends InheritedWidget {
  const KacaScope({super.key, required this.mode, required super.child});

  final ModeKaca mode;

  static ModeKaca of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<KacaScope>()?.mode ??
      ModeKaca.standar;

  /// Permukaan harus solid: mode Pekat atau kontras tinggi dari sistem.
  static bool solid(BuildContext context) =>
      of(context) == ModeKaca.pekat || MediaQuery.of(context).highContrast;

  /// Pengali alpha tint: Jernih lebih tembus.
  static double k(BuildContext context) =>
      of(context) == ModeKaca.jernih ? 0.72 : 1.0;

  @override
  bool updateShouldNotify(KacaScope oldWidget) => oldWidget.mode != mode;
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
          color: warna == null ? (gelap ? Tok.navy : Colors.white) : null,
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
      // (alpha atas, alpha bawah) per tingkat; nilai sama dengan token --lg-* web
      final (double a, double b) = chrome
          ? (0.74, 0.50)
          : widget.varian == KacaVarian.bening
          ? (0.46, 0.26)
          : (0.62, 0.46);
      final List<Color> tint =
          widget.warna ??
          (gelap
              ? [
                  Tok.navy.withValues(alpha: 0.66),
                  Tok.navy.withValues(alpha: 0.40),
                ]
              : [
                  Colors.white.withValues(alpha: a),
                  Colors.white.withValues(alpha: b),
                ]);
      final permukaan = Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              for (final c in tint) c.withValues(alpha: (c.a * k).clamp(0, 1)),
            ],
          ),
          borderRadius: r,
        ),
        // kilau spekular di kiri atas (padanan --lg-spec)
        foregroundDecoration: BoxDecoration(
          borderRadius: r,
          gradient: RadialGradient(
            center: const Alignment(-0.75, -1.1),
            radius: 1.25,
            colors: [
              Colors.white.withValues(alpha: gelap ? 0.16 : 0.42),
              Colors.white.withValues(alpha: 0),
            ],
          ),
        ),
        child: CustomPaint(
          foregroundPainter: RimKaca(radius: widget.radius, gelap: gelap),
          child: isi,
        ),
      );
      final pakaiBlur = chrome || (widget.buram && !gelap);
      final sigma = chrome ? 24.0 : 14.0;
      final filter = ImageFilter.blur(sigmaX: sigma, sigmaY: sigma);
      kaca = ClipRRect(
        borderRadius: r,
        child: !pakaiBlur
            ? permukaan
            : chrome
            ? BackdropFilter(filter: filter, child: permukaan)
            : BackdropFilter.grouped(filter: filter, child: permukaan),
      );
    }

    final bayang = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        boxShadow: [
          const BoxShadow(
            color: Color(0x142A5080),
            blurRadius: 2,
            offset: Offset(0, 1),
          ),
          BoxShadow(
            color: Color(chrome ? 0x612A5080 : 0x4D2A5080),
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
    final diam = MediaQuery.disableAnimationsOf(context);
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
///  3. pendar biru di kiri dan hangat di kanan (dispersi cahaya);
///  4. bayangan dalam tipis di bawah (ketebalan).
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
    final f = gelap ? 0.55 : 1.0;

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
      // dispersi: biru di kiri, hangat di kanan
      canvas.drawRRect(
        rr,
        Paint()
          ..shader = LinearGradient(
            colors: [
              const Color(0xFF6EB9FF).withValues(alpha: 0.55 * f),
              const Color(0x006EB9FF),
              const Color(0x00FFCD82),
              const Color(0xFFFFCD82).withValues(alpha: 0.45 * f),
            ],
            stops: const [0, 0.32, 0.68, 1],
          ).createShader(rect)
          ..maskFilter = const MaskFilter.blur(BlurStyle.inner, 5),
      );
      // ketebalan: bayangan dalam di bagian bawah
      canvas.drawRRect(
        rr,
        Paint()
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x001E4678), Color(0x381E4678)],
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
      old.radius != radius || old.gelap != gelap || old.kecil != kecil;
}

/// Latar untuk ditaruh DI BELAKANG kaca: foto pegunungan yang sama dengan latar
/// web (dashboard dan Tentang Kami), diberi kerudung putih tipis agar teks terbaca.
/// Tanpa isi di belakangnya, kaca tampak datar.
class LatarCair extends StatelessWidget {
  const LatarCair({super.key});

  @override
  Widget build(BuildContext context) {
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
              cacheWidth: 1280,
              gaplessPlayback: true,
              excludeFromSemantics: true,
            ),
            ColoredBox(color: Colors.white.withValues(alpha: 0.12)),
          ],
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
