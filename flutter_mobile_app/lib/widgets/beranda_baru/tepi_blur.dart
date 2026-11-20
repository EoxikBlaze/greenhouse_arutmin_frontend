import 'dart:ui';

import 'package:flutter/material.dart';

import 'backdrop_kaca.dart';
import 'kaca_lensa.dart';

/// Efek tepi gulir ala iPhone: isi layar memudar lembut di bawah status bar
/// dan home indicator. Blur dibuat bertahap (pita-pita dengan sigma menurun)
/// karena ShaderMask di atas BackdropFilter tidak andal di semua perangkat.
class TepiBlur extends StatelessWidget {
  const TepiBlur({
    super.key,
    required this.tinggi,
    required this.atas,
    this.warna = const Color(0x33FFFFFF),
    this.sigmaMaks = 10,
    this.pita = 5,
    this.kaca = ParameterKaca.figma,
  });

  final double tinggi;

  /// true = tepi atas (paling kabur di ujung atas); false = tepi bawah.
  final bool atas;
  final Color warna;
  final double sigmaMaks;
  final int pita;

  /// Parameter kaca (kilau dan lensa di tepi dalam). null = blur saja.
  final ParameterKaca? kaca;

  /// 1.0 di ujung layar, mendekati 0 ke arah isi.
  double _kekuatan(int i) {
    final dariUjung = atas ? i : pita - 1 - i;
    return (pita - dariUjung) / pita;
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: ExcludeSemantics(
        child: SizedBox(
          height: tinggi,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Column(
                children: [
                  for (var i = 0; i < pita; i++)
                    Expanded(
                      child: _Pita(
                        kekuatan: _kekuatan(i),
                        warna: warna,
                        sigmaMaks: sigmaMaks,
                      ),
                    ),
                ],
              ),
              if (kaca != null)
                Positioned.fill(
                  child: BackdropKaca(
                    parameter: kaca!,
                    blur: false,
                    mode: atas
                        ? ModeTepiKaca.hanyaBawah
                        : ModeTepiKaca.hanyaAtas,
                    child: const SizedBox.expand(),
                  ),
                ),
              if (kaca != null)
                Align(
                  alignment: atas
                      ? Alignment.bottomCenter
                      : Alignment.topCenter,
                  child: SizedBox(
                    height: kaca!.depth,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _KilauTepiLurus(atas: atas, parameter: kaca!),
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

class _Pita extends StatelessWidget {
  const _Pita({
    required this.kekuatan,
    required this.warna,
    required this.sigmaMaks,
  });

  final double kekuatan;
  final Color warna;
  final double sigmaMaks;

  @override
  Widget build(BuildContext context) {
    final sigma = sigmaMaks * kekuatan;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
        child: ColoredBox(color: warna.withValues(alpha: warna.a * kekuatan)),
      ),
    );
  }
}

/// Kilau garis di tepi dalam batang blur (sisi yang menghadap isi layar):
/// terang di ujung yang kena cahaya, redup di tengah, dan ada cahaya lembut
/// ke arah isi seperti lensa kaca.
class _KilauTepiLurus extends CustomPainter {
  const _KilauTepiLurus({required this.atas, required this.parameter});

  final bool atas;
  final ParameterKaca parameter;

  @override
  void paint(Canvas canvas, Size size) {
    final a = parameter.intensitasCahaya;
    final y = atas ? size.height - 0.75 : 0.75;
    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final gradien = LinearGradient(
      colors: [
        Colors.white.withValues(alpha: a),
        Colors.white.withValues(alpha: 0.12),
        Colors.white.withValues(alpha: a * 0.6),
      ],
      stops: const [0, 0.5, 1],
    ).createShader(rect);

    // Cahaya lembut ke arah isi (kedalaman lensa).
    final lembut = Paint()
      ..shader = LinearGradient(
        begin: atas ? Alignment.bottomCenter : Alignment.topCenter,
        end: atas ? Alignment.topCenter : Alignment.bottomCenter,
        colors: [
          Colors.white.withValues(alpha: 0.28 * a),
          Colors.white.withValues(alpha: 0),
        ],
      ).createShader(rect);
    canvas.drawRect(rect, lembut);

    // Pita warna tipis (dispersi), lalu garis kilau.
    final d = parameter.dispersi;
    canvas.drawLine(
      Offset(0, y + (atas ? -d : d)),
      Offset(size.width, y + (atas ? -d : d)),
      Paint()
        ..strokeWidth = 1
        ..color = const Color(0xFF9AB8FF).withValues(alpha: 0.2 * a),
    );
    canvas.drawLine(
      Offset(0, y),
      Offset(size.width, y),
      Paint()
        ..strokeWidth = 1.5
        ..shader = gradien,
    );
  }

  @override
  bool shouldRepaint(_KilauTepiLurus old) =>
      old.atas != atas || old.parameter != parameter;
}
