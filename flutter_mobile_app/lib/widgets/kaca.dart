import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Permukaan "Liquid Glass" untuk Flutter.
///
/// Flutter tidak punya API kaca native seperti `.glassEffect()` di SwiftUI,
/// jadi ini versi buatan sendiri dengan prinsip yang sama:
///  * satu bentuk konsisten per kelompok (radius seragam),
///  * efek interaktif (menekan) HANYA bila [onTap] diisi,
///  * ada cadangan tanpa blur saat pengguna meminta kontras tinggi,
///  * blur sungguhan ([blur]) hanya untuk lapisan mengambang (dock, bilah):
///    puluhan BackdropFilter di daftar membuat HP kelas bawah tersendat, dan di
///    atas [LatarCair] yang lembut kaca tanpa blur tampak hampir sama.
/// Tiga permukaan desain v3: [chrome] kaca terang blur kuat (dock/bilah),
/// [panel] kaca terang blur ringan (kartu), [solid] putih (sheet, form).
enum KacaVarian { chrome, panel, solid }

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
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  /// true = kaca navy tanpa blur (hero/panel gelap), false = kaca terang.
  /// Diabaikan oleh [KacaVarian.chrome] (selalu navy) dan [KacaVarian.solid].
  final bool gelap;

  /// Lama: true = sama dengan `varian: KacaVarian.chrome`.
  final bool blur;

  /// Panel kaca ikut mengaburkan latar (blur ringan). Matikan untuk daftar
  /// panjang bila HP kelas bawah tersendat.
  final bool buram;

  final KacaVarian varian;

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
    final kontras = MediaQuery.of(context).highContrast;
    final chrome = widget.varian == KacaVarian.chrome || widget.blur;
    final solid = widget.varian == KacaVarian.solid;
    final gelap = widget.gelap && !solid && !chrome;

    final Widget isi = Padding(padding: widget.padding, child: widget.child);

    Widget kaca;
    if (solid) {
      kaca = DecoratedBox(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: r,
          border: Border.all(color: Tok.garis),
        ),
        child: isi,
      );
    } else if (kontras) {
      // Cadangan: permukaan solid, tanpa blur.
      kaca = DecoratedBox(
        decoration: BoxDecoration(
          color: gelap ? Tok.navy : Colors.white,
          borderRadius: r,
          border: Border.all(color: gelap ? Colors.white70 : Tok.navy),
        ),
        child: isi,
      );
    } else {
      // kaca terang: putih tembus pandang di atas latar berwarna; teks tetap gelap
      final warnaA = gelap
          ? Tok.navy.withValues(alpha: 0.66)
          : Colors.white.withValues(alpha: chrome ? 0.56 : 0.50);
      final warnaB = gelap
          ? Tok.navy.withValues(alpha: 0.40)
          : Colors.white.withValues(alpha: chrome ? 0.24 : 0.18);
      final permukaan = DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [warnaA, warnaB],
          ),
          borderRadius: r,
          border: Border.all(
            color: Colors.white.withValues(alpha: gelap ? 0.28 : 0.7),
            width: 1.2,
          ),
        ),
        child: Stack(
          children: [
            // kilau spekular di sudut kiri atas
            Positioned.fill(
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: const Alignment(-0.85, -1.0),
                      radius: 1.3,
                      colors: [
                        Colors.white.withValues(alpha: gelap ? 0.20 : 0.62),
                        Colors.white.withValues(alpha: 0),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            isi,
          ],
        ),
      );
      kaca = ClipRRect(
        borderRadius: r,
        child: chrome || (widget.buram && !gelap)
            ? BackdropFilter(
                filter: chrome
                    ? ImageFilter.blur(sigmaX: 30, sigmaY: 30)
                    : ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: permukaan,
              )
            : permukaan,
      );
    }

    final bayang = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: r,
        boxShadow: const [
          BoxShadow(
            color: Color(0x332A5080),
            blurRadius: 30,
            spreadRadius: -10,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: kaca,
    );

    // Terisolasi agar blur/animasi di dalamnya tidak melukis ulang halaman.
    if (widget.onTap == null) return RepaintBoundary(child: bayang);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _atur(true),
      onTapUp: (_) => _atur(false),
      onTapCancel: () => _atur(false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _turun ? 0.96 : 1,
        duration: const Duration(milliseconds: 220),
        curve: _turun ? Curves.easeOut : Curves.easeOutBack,
        child: RepaintBoundary(child: bayang),
      ),
    );
  }
}

/// Latar berwarna lembut untuk ditaruh DI BELAKANG kaca: tanpa isi di belakangnya,
/// kaca tampak datar. Murah (hanya gradasi, tanpa blur tambahan).
class LatarCair extends StatelessWidget {
  const LatarCair({super.key});

  Widget _bola(Alignment a, double ukuran, Color warna, double alpha) {
    return Align(
      alignment: a,
      child: Container(
        width: ukuran,
        height: ukuran,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              warna.withValues(alpha: alpha),
              warna.withValues(alpha: 0),
            ],
          ),
        ),
      ),
    );
  }

  /// Biru, lavender, hijau moss, emas — sama dengan `.app-latar` di web.
  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFE2EEFC), Color(0xFFE8F3EC), Color(0xFFFBF2D6)],
            ),
          ),
          child: Stack(
            children: [
              _bola(const Alignment(-1.1, -0.85), 460, const Color(0xFF60A0F0), 0.62),
              _bola(const Alignment(1.25, -0.4), 400, const Color(0xFFA08EF2), 0.50),
              _bola(const Alignment(-1.2, 0.95), 440, Tok.moss, 0.50),
              _bola(const Alignment(1.2, 1.0), 420, Tok.emas, 0.55),
              _bola(const Alignment(0.3, -0.15), 340, const Color(0xFF60A0F0), 0.36),
              _bola(const Alignment(-0.6, 0.45), 320, Tok.moss, 0.34),
              _bola(const Alignment(0.7, 0.55), 300, Tok.emas, 0.34),
            ],
          ),
        ),
      ),
    );
  }
}

/// Latar cair di belakang [child] — untuk halaman yang dibuka di atas shell
/// (CCTV, Asisten AI, Meja, Riwayat, Tentang Kami) supaya kacanya seragam.
class LatarHalaman extends StatelessWidget {
  const LatarHalaman({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const Positioned.fill(child: LatarCair()),
        Positioned.fill(child: child),
      ],
    );
  }
}

/// Isi bottom sheet berkaca: latar sheet dibuat transparan, lalu isinya
/// dibungkus permukaan solid putih bertepi cahaya agar teks tetap terbaca.
class SheetKaca extends StatelessWidget {
  const SheetKaca({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
    child: KacaCair(
      varian: KacaVarian.solid,
      padding: EdgeInsets.zero,
      child: child,
    ),
  );
}
