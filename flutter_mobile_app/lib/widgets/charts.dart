import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Grafik garis halus dengan isian gradasi; terungkap dari kiri ke kanan.
class LineChart extends StatelessWidget {
  const LineChart({
    super.key,
    required this.nilai,
    this.warna = Tok.moss,
    this.tinggi = 140,
    this.min,
    this.max,
    this.deskripsi,
  });

  /// Deret nilai (kosong / null dilewati oleh pemanggil).
  final List<double> nilai;
  final Color warna;
  final double tinggi;
  final double? min;
  final double? max;

  /// Teks untuk pembaca layar (grafik digambar di kanvas, tanpa teks sendiri).
  final String? deskripsi;

  List<double> _ringkas(List<double> d) {
    const batas = 120;
    if (d.length <= batas) return d;
    final langkah = d.length / batas;
    return List<double>.generate(batas, (i) => d[(i * langkah).floor()]);
  }

  @override
  Widget build(BuildContext context) {
    final data = _ringkas(nilai);
    if (data.length < 2) {
      return SizedBox(
        height: tinggi,
        child: const Center(child: Text('Belum cukup data', style: Tok.kecil)),
      );
    }
    final grafik = SizedBox(
      height: tinggi,
      width: double.infinity,
      child: TweenAnimationBuilder<double>(
        tween: Tween<double>(begin: 0, end: 1),
        duration: const Duration(milliseconds: 1100),
        curve: Tok.ease,
        builder: (context, t, _) =>
            CustomPaint(painter: _LinePainter(data, warna, t, min, max)),
      ),
    );
    final d = deskripsi;
    if (d == null) return grafik;
    return Semantics(
      label: d,
      image: true,
      excludeSemantics: true,
      child: grafik,
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter(this.data, this.warna, this.t, this.minB, this.maxB);

  final List<double> data;
  final Color warna;
  final double t;
  final double? minB;
  final double? maxB;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width <= 0 || size.height <= 0 || data.length < 2) return;

    var lo = minB ?? data.reduce((a, b) => a < b ? a : b);
    var hi = maxB ?? data.reduce((a, b) => a > b ? a : b);
    if ((hi - lo).abs() < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    final pad = (hi - lo) * 0.12;
    lo -= pad;
    hi += pad;

    const atas = 8.0;
    const bawah = 8.0;
    final h = size.height - atas - bawah;

    // Garis bantu horizontal.
    final bantu = Paint()
      ..color = Tok.garis
      ..strokeWidth = 1;
    for (var i = 0; i < 4; i++) {
      final y = atas + h * i / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), bantu);
    }

    final titik = <Offset>[];
    for (var i = 0; i < data.length; i++) {
      final x = size.width * i / (data.length - 1);
      final y = atas + h * (1 - (data[i] - lo) / (hi - lo));
      titik.add(Offset(x, y));
    }

    final garis = Path()..moveTo(titik.first.dx, titik.first.dy);
    for (var i = 1; i < titik.length; i++) {
      final a = titik[i - 1];
      final b = titik[i];
      final mx = (a.dx + b.dx) / 2;
      garis.cubicTo(mx, a.dy, mx, b.dy, b.dx, b.dy);
    }

    final isi = Path.from(garis)
      ..lineTo(titik.last.dx, size.height)
      ..lineTo(titik.first.dx, size.height)
      ..close();

    canvas.save();
    canvas.clipRect(Rect.fromLTWH(0, 0, size.width * t, size.height));

    canvas.drawPath(
      isi,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [warna.withValues(alpha: 0.28), warna.withValues(alpha: 0.0)],
        ).createShader(Rect.fromLTWH(0, 0, size.width, size.height)),
    );

    canvas.drawPath(
      garis,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.4
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = warna,
    );
    canvas.restore();

    // Titik terakhir.
    if (t > 0.98) {
      final p = titik.last;
      canvas.drawCircle(p, 6, Paint()..color = warna.withValues(alpha: 0.2));
      canvas.drawCircle(p, 3.4, Paint()..color = warna);
      canvas.drawCircle(
        p,
        3.4,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.5
          ..color = Colors.white,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _LinePainter old) =>
      old.t != t || old.data != data || old.warna != warna;
}

/// Pengukur lingkaran (busur) dengan angka di tengah.
class RingGauge extends StatelessWidget {
  const RingGauge({
    super.key,
    required this.nilai,
    required this.min,
    required this.max,
    required this.label,
    required this.satuan,
    this.warna = Tok.moss,
    this.ukuran = 104,
    this.desimal = 1,
    this.bahaya = false,
  });

  final double? nilai;
  final double min;
  final double max;
  final String label;
  final String satuan;
  final Color warna;
  final double ukuran;
  final int desimal;
  final bool bahaya;

  @override
  Widget build(BuildContext context) {
    final v = nilai;
    final frac = v == null || max <= min
        ? 0.0
        : ((v - min) / (max - min)).clamp(0.0, 1.0).toDouble();
    final aksen = bahaya ? Tok.error : warna;
    final angka = v == null ? 'tidak ada data' : v.toStringAsFixed(desimal);

    return Semantics(
      excludeSemantics: true,
      label: '$label: $angka $satuan${bahaya ? ', di luar batas aman' : ''}',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: ukuran,
            height: ukuran,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: frac),
              duration: const Duration(milliseconds: 1000),
              curve: Tok.ease,
              builder: (context, f, _) => CustomPaint(
                painter: _RingPainter(f, aksen),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        v == null ? '-' : v.toStringAsFixed(desimal),
                        style: TextStyle(
                          fontSize: ukuran * 0.21,
                          fontWeight: FontWeight.w700,
                          color: bahaya ? Tok.error : Tok.tinta,
                          letterSpacing: -0.4,
                        ),
                      ),
                      Text(satuan, style: Tok.kecil.copyWith(fontSize: 11)),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: Tok.tinta,
            ),
          ),
        ],
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.f, this.warna);

  final double f;
  final Color warna;

  @override
  void paint(Canvas canvas, Size size) {
    const tebal = 9.0;
    final rect = Rect.fromLTWH(
      tebal / 2,
      tebal / 2,
      size.width - tebal,
      size.height - tebal,
    );
    const mulai = 2.3562; // 135 derajat
    const sapuan = 4.7124; // 270 derajat

    canvas.drawArc(
      rect,
      mulai,
      sapuan,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = tebal
        ..strokeCap = StrokeCap.round
        ..color = Tok.garis,
    );
    if (f > 0) {
      canvas.drawArc(
        rect,
        mulai,
        sapuan * f,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = tebal
          ..strokeCap = StrokeCap.round
          ..color = warna,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) =>
      old.f != f || old.warna != warna;
}
