import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'backdrop_kaca.dart';
import 'parameter_kaca.dart';

export 'parameter_kaca.dart';

/// Kaca ala Liquid Glass untuk Flutter: blur latar, tint, lensa tepi, kilau
/// tepi searah cahaya, dan pita warna tipis. Refraksi sungguhan (melengkungkan
/// latar) memakai shader lewat [BackdropKaca] bila Impeller tersedia.
class KacaLensa extends StatelessWidget {
  const KacaLensa({
    super.key,
    required this.child,
    this.radius = 20,
    this.tint = const Color(0x66FFFFFF),
    this.parameter = ParameterKaca.figma,
  });

  final Widget child;
  final double radius;
  final Color tint;
  final ParameterKaca parameter;

  @override
  Widget build(BuildContext context) {
    final bentuk = BorderRadius.circular(radius);
    return ClipRRect(
      borderRadius: bentuk,
      child: BackdropKaca(
        radius: radius,
        parameter: parameter,
        child: CustomPaint(
          foregroundPainter: PelukisTepiKaca(
            radius: radius,
            parameter: parameter,
          ),
          child: ColoredBox(color: tint, child: child),
        ),
      ),
    );
  }
}

/// Kilau tepi: dua sisi berlawanan searah [ParameterKaca.sudutCahaya],
/// lensa dalam (gelap-terang tipis) sedalam [ParameterKaca.depth] / 4,
/// dan pita warna tipis di sisi luar.
class PelukisTepiKaca extends CustomPainter {
  const PelukisTepiKaca({required this.radius, required this.parameter});

  final double radius;
  final ParameterKaca parameter;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final rr = RRect.fromRectAndRadius(rect, Radius.circular(radius));
    final sudut = parameter.sudutCahaya * math.pi / 180;
    final arah = Offset(math.cos(sudut), math.sin(sudut));
    // Vektor dari sisi yang kena cahaya ke sisi pantulan.
    final awal =
        rect.center - Offset(arah.dx * size.width, -arah.dy * size.height) / 2;
    final akhir =
        rect.center + Offset(arah.dx * size.width, -arah.dy * size.height) / 2;
    final a = parameter.intensitasCahaya;

    Shader kilau(double kuat) => LinearGradient(
      begin: Alignment(
        (awal.dx / size.width) * 2 - 1,
        (awal.dy / size.height) * 2 - 1,
      ),
      end: Alignment(
        (akhir.dx / size.width) * 2 - 1,
        (akhir.dy / size.height) * 2 - 1,
      ),
      colors: [
        Colors.white.withValues(alpha: a * kuat),
        Colors.white.withValues(alpha: 0.05 * kuat),
        Colors.white.withValues(alpha: 0.05 * kuat),
        Colors.white.withValues(alpha: a * 0.7 * kuat),
      ],
      stops: const [0, 0.28, 0.72, 1],
    ).createShader(rect);

    // Lensa dalam: bayangan lembut mengikuti tepi, memberi kesan tebal.
    final lensa = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = parameter.depth / 4
      ..shader = kilau(0.35)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, parameter.depth / 8);
    canvas.save();
    canvas.clipRRect(rr);
    canvas.drawRRect(rr.deflate(parameter.depth / 8), lensa);
    canvas.restore();

    // Pita warna tipis (dispersi) di sisi luar.
    final d = parameter.dispersi;
    for (final (warna, geser) in [
      (const Color(0xFFFF9AA2), -d),
      (const Color(0xFF9AB8FF), d),
    ]) {
      final p = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = warna.withValues(alpha: 0.22 * a);
      canvas.drawRRect(rr.deflate(0.75).shift(Offset(geser, geser)), p);
    }

    // Kilau tepi tajam.
    final tepi = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..shader = kilau(1);
    canvas.drawRRect(rr.deflate(0.75), tepi);
  }

  @override
  bool shouldRepaint(PelukisTepiKaca old) =>
      old.radius != radius || old.parameter != parameter;
}
