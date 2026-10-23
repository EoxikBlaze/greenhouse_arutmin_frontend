import 'dart:ui';

import 'package:flutter/material.dart';

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
class KacaCair extends StatefulWidget {
  const KacaCair({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.radius = 22,
    this.gelap = false,
    this.blur = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  /// true = kaca navy (untuk dock/bilah), false = kaca terang.
  final bool gelap;

  /// true = BackdropFilter sungguhan (mahal); false = kaca buram tanpa blur.
  final bool blur;

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
    final gelap = widget.gelap;

    final Widget isi = Padding(padding: widget.padding, child: widget.child);

    Widget kaca;
    if (kontras) {
      // Cadangan: permukaan solid, tanpa blur.
      kaca = DecoratedBox(
        decoration: BoxDecoration(
          color: gelap ? const Color(0xFF0A1F38) : Colors.white,
          borderRadius: r,
          border: Border.all(
            color: gelap ? Colors.white70 : const Color(0xFF0A1F38),
          ),
        ),
        child: isi,
      );
    } else {
      // tanpa blur, tint dipertebal agar teks tetap terbaca di atas latar berwarna
      final tebal = widget.blur ? 0.0 : 0.16;
      final warnaA = gelap
          ? const Color(0xFF0A1F38).withValues(alpha: 0.66 + tebal)
          : Colors.white.withValues(alpha: 0.66 + tebal);
      final warnaB = gelap
          ? const Color(0xFF0A1F38).withValues(alpha: 0.40 + tebal)
          : Colors.white.withValues(alpha: 0.36 + tebal);
      final permukaan = DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [warnaA, warnaB],
          ),
          borderRadius: r,
          border: Border.all(
            color: Colors.white.withValues(alpha: gelap ? 0.28 : 0.75),
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
                        Colors.white.withValues(alpha: gelap ? 0.20 : 0.55),
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
        child: widget.blur
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
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
            color: Color(0x2D071527),
            blurRadius: 24,
            spreadRadius: -8,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: kaca,
    );

    if (widget.onTap == null) return bayang;
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
        child: bayang,
      ),
    );
  }
}

/// Latar berwarna lembut untuk ditaruh DI BELAKANG kaca: tanpa isi di belakangnya,
/// kaca tampak datar. Murah (hanya gradasi, tanpa blur tambahan).
class LatarCair extends StatelessWidget {
  const LatarCair({super.key});

  Widget _bola(Alignment a, double ukuran, Color warna) {
    return Align(
      alignment: a,
      child: Container(
        width: ukuran,
        height: ukuran,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [warna.withValues(alpha: 0.55), warna.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFDCEBFA), Color(0xFFF4F7F2), Color(0xFFFFF6DC)],
          ),
        ),
        child: Stack(
          children: [
            _bola(const Alignment(-1.1, -0.5), 320, const Color(0xFF2F6BFF)),
            _bola(const Alignment(1.2, 0.1), 300, const Color(0xFFF2C94C)),
            _bola(const Alignment(-0.2, 1.1), 340, const Color(0xFF3FD0A0)),
          ],
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
