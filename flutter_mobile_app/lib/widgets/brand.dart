import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'kaca.dart';
import 'motion.dart';

/// Monogram Vertonik (padanan komponen `Monogram` di web).
class Monogram extends StatelessWidget {
  const Monogram({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _MonogramPainter()),
    );
  }
}

class _MonogramPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 40;
    canvas.save();
    canvas.scale(s, s);

    final kotak = RRect.fromRectAndRadius(
      const Rect.fromLTWH(1.25, 1.25, 37.5, 37.5),
      const Radius.circular(11),
    );
    canvas.drawRRect(kotak, Paint()..color = Tok.navy);
    canvas.drawRRect(
      kotak,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = Tok.emas,
    );

    final v = Path()
      ..moveTo(11.5, 13)
      ..lineTo(20, 28.5)
      ..lineTo(28.5, 13);
    canvas.drawPath(
      v,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = Tok.emas,
    );

    final daun = Path()
      ..moveTo(20, 24.5)
      ..cubicTo(22.6, 23.5, 24.2, 21.5, 24.6, 18.7)
      ..cubicTo(21.7, 18.6, 19.6, 20.3, 19.0, 23.1)
      ..close();
    canvas.drawPath(daun, Paint()..color = Tok.moss);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Motif pipa hidroponik dengan aliran nutrisi (padanan `PipeMotif` di login
/// web). Bergerak halus; berhenti otomatis saat uji widget.
class PipeFlow extends StatefulWidget {
  const PipeFlow({super.key});

  @override
  State<PipeFlow> createState() => _PipeFlowState();
}

class _PipeFlowState extends State<PipeFlow>
    with SingleTickerProviderStateMixin {
  AnimationController? _c;

  @override
  void initState() {
    super.initState();
    if (animasiLoopAktif) {
      _c = AnimationController(
        vsync: this,
        duration: const Duration(seconds: 5),
      )..repeat();
    }
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Animation<double> anim =
        _c ?? const AlwaysStoppedAnimation<double>(0);
    return IgnorePointer(
      child: CustomPaint(painter: _PipePainter(anim), size: Size.infinite),
    );
  }
}

class _PipePainter extends CustomPainter {
  _PipePainter(this.t) : super(repaint: t);

  final Animation<double> t;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.width <= 0 || size.height <= 0) return;
    final baris = <double>[0.2, 0.4, 0.6, 0.8];
    final pipa = Paint()
      ..strokeWidth = 11
      ..strokeCap = StrokeCap.round
      ..color = Tok.emas.withValues(alpha: 0.10);
    final garisTipis = Paint()
      ..strokeWidth = 1.5
      ..color = Tok.emas.withValues(alpha: 0.09);
    final alir = Paint()
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.butt
      ..color = Tok.mint.withValues(alpha: 0.26);
    final isiPot = Paint()..color = Tok.navy2.withValues(alpha: 0.72);
    final tepiPot = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..color = Tok.moss.withValues(alpha: 0.4);

    for (var i = 0; i < baris.length; i++) {
      final y = size.height * baris[i];
      canvas.drawLine(Offset(0, y), Offset(size.width, y), pipa);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), garisTipis);

      final fase = (i.isEven ? t.value : 1 - t.value) * 24;
      for (double x = -24 + fase; x < size.width; x += 24) {
        canvas.drawLine(Offset(x, y), Offset(x + 8, y), alir);
      }

      for (final f in <double>[0.12, 0.36, 0.60, 0.84]) {
        final c = Offset(size.width * f, y);
        canvas.drawCircle(c, 7.5, isiPot);
        canvas.drawCircle(c, 7.5, tepiPot);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _PipePainter oldDelegate) => false;
}

/// Kepala halaman bergaya panel brand web: gradasi navy, cahaya moss,
/// lingkaran emas, dan motif pipa yang mengalir.
class HeroHeader extends StatelessWidget {
  const HeroHeader({
    super.key,
    required this.judul,
    this.subjudul,
    this.trailing,
    this.bawah,
  });

  final String judul;
  final String? subjudul;
  final Widget? trailing;
  final Widget? bawah;

  @override
  Widget build(BuildContext context) {
    const radius = BorderRadius.vertical(bottom: Radius.circular(30));
    return Container(
      decoration: const BoxDecoration(
        gradient: Tok.brandPanel,
        borderRadius: radius,
        boxShadow: Tok.deep,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          children: [
            const Positioned.fill(
              child: Opacity(opacity: 0.9, child: PipeFlow()),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.topLeft,
                    radius: 1.15,
                    colors: [
                      Tok.moss.withValues(alpha: 0.30),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              right: -46,
              top: -56,
              child: Container(
                width: 170,
                height: 170,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Tok.emas.withValues(alpha: 0.25)),
                ),
              ),
            ),
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Monogram(size: 40),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                judul,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  height: 1.2,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              if (subjudul != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  subjudul!,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.72),
                                    fontSize: 13,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (trailing != null) ...[
                          const SizedBox(width: 8),
                          trailing!,
                        ],
                      ],
                    ),
                    if (bawah != null) ...[const SizedBox(height: 18), bawah!],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Permukaan kartu standar. Bawaan: Liquid Glass ([KacaCair]) di atas [LatarCair].
/// Panel dengan [warnaTepi] (peringatan) tetap solid agar menonjol.
/// Bila [onTap] diisi, kartu ikut efek tekan.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.warnaTepi,
    this.kaca = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? warnaTepi;

  /// true (bawaan) = permukaan Liquid Glass; false = kartu putih solid.
  final bool kaca;

  @override
  Widget build(BuildContext context) {
    if (kaca && warnaTepi == null) {
      return KacaCair(padding: padding, onTap: onTap, child: child);
    }
    final kotak = AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      curve: Tok.ease,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(Tok.rLg),
        border: Border.all(color: warnaTepi ?? Tok.garis),
        boxShadow: Tok.soft,
      ),
      child: child,
    );
    if (onTap == null) return kotak;
    return Pressable(onTap: onTap!, child: kotak);
  }
}

/// Label kecil kapital dengan garis emas (padanan `vsf-eyebrow`).
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.teks, {super.key});

  final String teks;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 12, height: 1.5, color: Tok.emas),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            teks.toUpperCase(),
            overflow: TextOverflow.ellipsis,
            style: Tok.eyebrow,
          ),
        ),
      ],
    );
  }
}

/// Pil status berwarna dengan titik berdenyut opsional.
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.teks,
    required this.warna,
    this.berdenyut = false,
    this.terang = false,
  });

  final String teks;
  final Color warna;
  final bool berdenyut;

  /// true bila dipasang di atas latar gelap (hero navy).
  final bool terang;

  @override
  Widget build(BuildContext context) {
    final latar = terang
        ? Colors.white.withValues(alpha: 0.12)
        : warna.withValues(alpha: 0.12);
    final teksWarna = terang ? Colors.white : warna;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: latar,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: terang
              ? Colors.white.withValues(alpha: 0.18)
              : warna.withValues(alpha: 0.28),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          berdenyut
              ? PulseDot(color: warna, size: 8)
              : Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: warna,
                    shape: BoxShape.circle,
                  ),
                ),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              teks,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: teksWarna,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Panel galat dengan tombol coba lagi (pola error web: satu pesan + retry).
class ErrorPanel extends StatelessWidget {
  const ErrorPanel({super.key, required this.pesan, required this.onCoba});

  final String pesan;
  final VoidCallback onCoba;

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Column(
        children: [
          const Icon(Icons.cloud_off_outlined, size: 38, color: Tok.error),
          const SizedBox(height: 10),
          Text(pesan, textAlign: TextAlign.center, style: Tok.body),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: onCoba,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('Coba lagi'),
          ),
        ],
      ),
    );
  }
}

/// Tombol utama bergradasi hijau (padanan `bg-primary` web).
class TombolGradasi extends StatelessWidget {
  const TombolGradasi({
    super.key,
    required this.label,
    required this.onTap,
    this.sibuk = false,
    this.ikon,
  });

  final String label;
  final VoidCallback? onTap;
  final bool sibuk;
  final IconData? ikon;

  @override
  Widget build(BuildContext context) {
    final aktif = onTap != null && !sibuk;
    return AnimatedOpacity(
      opacity: aktif || sibuk ? 1 : 0.5,
      duration: const Duration(milliseconds: 180),
      child: Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(
            gradient: Tok.primary,
            borderRadius: BorderRadius.circular(Tok.rSm),
            boxShadow: const [
              BoxShadow(
                color: Color(0x592D452F),
                blurRadius: 18,
                spreadRadius: -8,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Tok.rSm),
            onTap: aktif ? onTap : null,
            child: Container(
              height: 50,
              alignment: Alignment.center,
              child: sibuk
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (ikon != null) ...[
                          Icon(ikon, size: 18, color: Colors.white),
                          const SizedBox(width: 8),
                        ],
                        Text(
                          label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Notifikasi singkat bergaya aplikasi.
void tampilkanPesan(BuildContext context, String pesan, {bool galat = false}) {
  final m = ScaffoldMessenger.maybeOf(context);
  if (m == null) return;
  m
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: galat ? Tok.error : Tok.navy,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tok.r),
        ),
        content: Text(pesan, style: const TextStyle(color: Colors.white)),
      ),
    );
}
