import 'dart:ui' as ui;
import 'dart:ui' show PlatformDispatcher, Brightness;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../widgets/kaca.dart' show PenyimpanNilai;
import 'tokens.dart';

class PenyimpanTemaAman implements PenyimpanNilai {
  const PenyimpanTemaAman();

  static const _kunci = 'garap_tema';
  static const _simpan = FlutterSecureStorage();

  @override
  Future<String?> baca() => _simpan.read(key: _kunci);

  @override
  Future<void> tulis(String nilai) => _simpan.write(key: _kunci, value: nilai);
}

/// Tema terang/gelap aplikasi (padanan `lib/tema.ts` di web). Pilihan disimpan;
/// tanpa pilihan, mengikuti tema sistem.
class PreferensiTema {
  PreferensiTema._();

  static final ValueNotifier<bool> gelap = ValueNotifier(false);
  static PenyimpanNilai penyimpan = const PenyimpanTemaAman();

  static Future<void> muat() async {
    var g = PlatformDispatcher.instance.platformBrightness == Brightness.dark;
    try {
      final v = await penyimpan.baca();
      if (v == 'gelap') g = true;
      if (v == 'terang') g = false;
    } catch (_) {
      // penyimpanan tidak bisa dibaca: ikuti sistem
    }
    _terapkan(g);
  }

  /// Diisi [TransisiTema]: ambil potret layar sebelum tema berganti, lalu pudarkan setelahnya.
  static Future<void> Function()? sebelumGanti;
  static VoidCallback? sesudahGanti;

  static Future<void> atur(bool g) async {
    if (g != Tok.gelap) await sebelumGanti?.call();
    _terapkan(g);
    _segarkan();
    sesudahGanti?.call();
    try {
      await penyimpan.tulis(g ? 'gelap' : 'terang');
    } catch (_) {
      // tidak tersimpan, tetap berlaku sampai aplikasi ditutup
    }
  }

  static void _terapkan(bool g) {
    Tok.gelap = g;
    gelap.value = g;
  }

  /// Token warna dibaca langsung (bukan lewat Theme), jadi seluruh pohon widget
  /// dibangun ulang agar mengambil warna baru. State halaman tetap terjaga.
  static void _segarkan() {
    void bangun(Element e) {
      e.markNeedsBuild();
      e.visitChildren(bangun);
    }

    WidgetsBinding.instance.rootElement?.visitChildren(bangun);
  }
}

/// Peralihan tema yang halus: potret layar lama dipudarkan di atas tampilan baru,
/// jadi kartu, teks, dan latar berganti bersamaan (bukan memotong).
class TransisiTema extends StatefulWidget {
  const TransisiTema({super.key, required this.child});

  final Widget child;

  @override
  State<TransisiTema> createState() => _TransisiTemaState();
}

class _TransisiTemaState extends State<TransisiTema>
    with SingleTickerProviderStateMixin {
  final _kunci = GlobalKey();
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 450),
  )..addStatusListener(_selesai);
  ui.Image? _lama;

  @override
  void initState() {
    super.initState();
    PreferensiTema.sebelumGanti = _tangkap;
    PreferensiTema.sesudahGanti = _pudar;
  }

  Future<void> _tangkap() async {
    if (MediaQuery.disableAnimationsOf(context)) return;
    final batas = _kunci.currentContext?.findRenderObject();
    if (batas is! RenderRepaintBoundary) return;
    try {
      final gambar = await batas.toImage(pixelRatio: 1);
      if (!mounted) return;
      _lama?.dispose();
      setState(() => _lama = gambar);
    } catch (_) {
      // potret gagal: tema tetap berganti, hanya tanpa pudar
    }
  }

  void _pudar() {
    if (_lama == null) return;
    _c.value = 1;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _c.reverse();
    });
  }

  void _selesai(AnimationStatus s) {
    if (s != AnimationStatus.dismissed || _lama == null) return;
    final g = _lama;
    setState(() => _lama = null);
    g?.dispose();
  }

  @override
  void dispose() {
    PreferensiTema.sebelumGanti = null;
    PreferensiTema.sesudahGanti = null;
    _c.dispose();
    _lama?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.passthrough,
      children: [
        RepaintBoundary(key: _kunci, child: widget.child),
        if (_lama != null)
          Positioned.fill(
            child: IgnorePointer(
              child: FadeTransition(
                opacity: CurvedAnimation(parent: _c, curve: Tok.ease),
                child: RawImage(image: _lama, fit: BoxFit.fill),
              ),
            ),
          ),
      ],
    );
  }
}
