import 'dart:async';

import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Apakah animasi yang berulang tanpa henti (loop) boleh dijalankan?
///
/// Di dalam `flutter test`, animasi tak berujung membuat `pumpAndSettle()`
/// tidak pernah selesai. Karena itu loop dimatikan otomatis di binding uji.
bool get animasiLoopAktif {
  final nama = WidgetsBinding.instance.runtimeType.toString();
  return !nama.contains('TestWidgetsFlutterBinding');
}

/// Muncul dari bawah sambil memudar (padanan `vsf-fade-up` di web).
///
/// Tanpa `Timer`/`Future.delayed`: jeda ([delay]) dibuat lewat `Interval`
/// pada satu controller, sehingga aman untuk uji widget.
class FadeUp extends StatefulWidget {
  const FadeUp({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = Tok.dLambat,
    this.dy = 10,
  });

  final Widget child;
  final Duration delay;
  final Duration duration;
  final double dy;

  /// Jeda bertahap untuk daftar (stagger): 50 ms per urutan, maksimal 300 ms.
  static Duration urutan(int i) =>
      Duration(milliseconds: (i * 50).clamp(0, 300).toInt());

  @override
  State<FadeUp> createState() => _FadeUpState();
}

class _FadeUpState extends State<FadeUp> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _a;

  @override
  void initState() {
    super.initState();
    final total = widget.delay + widget.duration;
    _c = AnimationController(vsync: this, duration: total);
    final mulai = widget.delay.inMilliseconds / total.inMilliseconds;
    _a = CurvedAnimation(
      parent: _c,
      curve: Interval(mulai, 1.0, curve: Tok.ease),
    );
    _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Pengguna mengurangi gerakan: tampil langsung.
    if (MediaQuery.disableAnimationsOf(context)) return widget.child;
    return AnimatedBuilder(
      animation: _a,
      child: widget.child,
      builder: (context, child) {
        final v = _a.value.clamp(0.0, 1.0).toDouble();
        return Opacity(
          opacity: v,
          child: Transform.translate(
            offset: Offset(0, (1 - v) * widget.dy),
            child: child,
          ),
        );
      },
    );
  }
}

/// Angka yang menghitung naik dari 0 (dan bergeser mulus saat nilai berubah).
class CountUp extends StatelessWidget {
  const CountUp({
    super.key,
    required this.nilai,
    this.desimal = 0,
    this.style,
    this.awalan = '',
    this.akhiran = '',
    this.durasi = const Duration(milliseconds: 600),
  });

  final double nilai;
  final int desimal;
  final TextStyle? style;
  final String awalan;
  final String akhiran;
  final Duration durasi;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: nilai),
      duration: MediaQuery.disableAnimationsOf(context)
          ? Duration.zero
          : durasi,
      curve: Tok.ease,
      builder: (context, v, _) =>
          Text('$awalan${v.toStringAsFixed(desimal)}$akhiran', style: style),
    );
  }
}

/// Titik status berdenyut (padanan `vsf-pulse-dot`).
class PulseDot extends StatefulWidget {
  const PulseDot({super.key, required this.color, this.size = 9});

  final Color color;
  final double size;

  @override
  State<PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<PulseDot>
    with SingleTickerProviderStateMixin {
  AnimationController? _c;

  @override
  void initState() {
    super.initState();
    if (animasiLoopAktif) {
      _c = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1400),
      )..repeat(reverse: true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final c = _c;
    if (c == null) return;
    if (MediaQuery.disableAnimationsOf(context)) {
      c.stop();
    } else if (!c.isAnimating) {
      c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  Widget _titik(double skala, double alpha) {
    return Transform.scale(
      scale: skala,
      child: Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: widget.color.withValues(alpha: alpha),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: widget.color.withValues(alpha: 0.45 * alpha),
              blurRadius: 8,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    if (c == null) return _titik(1, 1);
    return AnimatedBuilder(
      animation: c,
      builder: (context, _) {
        final t = c.value;
        return _titik(1 - 0.2 * t, 1 - 0.55 * t);
      },
    );
  }
}

/// Efek tekan: mengecil sedikit saat disentuh.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, required this.onTap});

  final Widget child;
  final VoidCallback onTap;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _turun = false;

  void _atur(bool v) {
    if (_turun != v) setState(() => _turun = v);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => _atur(true),
      onTapUp: (_) => _atur(false),
      onTapCancel: () => _atur(false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _turun ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Tok.ease,
        child: widget.child,
      ),
    );
  }
}

/// Pengatur timer polling yang bisa dinyalakan/dimatikan (mis. saat tab
/// tidak terlihat) dan dijamin berhenti saat [dispose].
class PollTimer {
  PollTimer(this.interval, this.onTick);

  final Duration interval;
  final VoidCallback onTick;
  Timer? _t;

  bool get hidup => _t != null;

  void atur(bool nyala) {
    if (nyala && _t == null) {
      _t = Timer.periodic(interval, (_) => onTick());
    } else if (!nyala) {
      _t?.cancel();
      _t = null;
    }
  }

  void dispose() => atur(false);
}

/// Kotak kerangka (skeleton) berdenyut selagi data dimuat.
class SkeletonBox extends StatefulWidget {
  const SkeletonBox({
    super.key,
    this.height = 16,
    this.width,
    this.radius = 10,
  });

  final double height;
  final double? width;
  final double radius;

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  AnimationController? _c;

  @override
  void initState() {
    super.initState();
    if (animasiLoopAktif) {
      _c = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 1100),
      )..repeat(reverse: true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final c = _c;
    if (c == null) return;
    if (MediaQuery.disableAnimationsOf(context)) {
      c.stop();
    } else if (!c.isAnimating) {
      c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  Widget _kotak(double t) {
    return Container(
      height: widget.height,
      width: widget.width,
      decoration: BoxDecoration(
        color: Color.lerp(Tok.garis, Tok.mint.withValues(alpha: 0.7), t),
        borderRadius: BorderRadius.circular(widget.radius),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    if (c == null) return _kotak(0);
    return AnimatedBuilder(
      animation: c,
      builder: (context, _) => _kotak(Curves.easeInOut.transform(c.value)),
    );
  }
}
