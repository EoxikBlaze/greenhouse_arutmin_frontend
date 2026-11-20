import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'parameter_kaca.dart';

/// Tepi yang membelokkan latar. Urutan harus sama dengan `u_mode` di shader.
enum ModeTepiKaca { semua, hanyaBawah, hanyaAtas }

/// BackdropFilter dengan refraksi tepi (shader `shaders/kaca.frag`) bila
/// renderer Impeller tersedia. Bila shader gagal dimuat atau tidak didukung
/// (mis. Skia, tes), jatuh kembali ke blur biasa tanpa melempar galat.
class BackdropKaca extends StatefulWidget {
  const BackdropKaca({
    super.key,
    required this.child,
    this.radius = 0,
    this.parameter = ParameterKaca.figma,
    this.refraksi = 0.8,
    this.blur = true,
    this.mode = ModeTepiKaca.semua,
  });

  final Widget child;
  final double radius;
  final ParameterKaca parameter;

  /// Kekuatan pembelokan latar di tepi, 0..1 (Figma: refraction 0,8).
  final double refraksi;

  /// false = hanya refraksi, tanpa blur frost (dipakai bila blur sudah ada).
  final bool blur;

  /// Tepi mana yang membelokkan latar.
  final ModeTepiKaca mode;

  /// Dipakai tes untuk memastikan jalur shader tidak melempar galat.
  static bool terakhirPakaiShader = false;

  @override
  State<BackdropKaca> createState() => _BackdropKacaState();
}

class _BackdropKacaState extends State<BackdropKaca> {
  static Future<ui.FragmentProgram?>? _program;

  ui.FragmentProgram? _muatan;
  ui.FragmentShader? _shader;

  static Future<ui.FragmentProgram?> _muat() => _program ??= () async {
    try {
      return await ui.FragmentProgram.fromAsset('shaders/kaca.frag');
    } catch (_) {
      return null;
    }
  }();

  @override
  void initState() {
    super.initState();
    _muat().then((p) {
      if (!mounted || p == null) return;
      setState(() {
        _muatan = p;
        _shader = p.fragmentShader();
      });
    });
  }

  @override
  void dispose() {
    _shader?.dispose();
    super.dispose();
  }

  ui.ImageFilter _blur() => ui.ImageFilter.blur(
    sigmaX: widget.parameter.frost,
    sigmaY: widget.parameter.frost,
  );

  ui.ImageFilter _filter() {
    final blur = widget.blur && widget.parameter.frost > 0 ? _blur() : null;
    final shader = _shader;
    if (_muatan != null && shader != null) {
      try {
        // Indeks 0-1 (ukuran) diisi mesin; atur sisanya.
        shader
          ..setFloat(2, widget.radius)
          ..setFloat(3, widget.parameter.depth)
          ..setFloat(4, widget.refraksi)
          ..setFloat(5, widget.parameter.dispersi)
          ..setFloat(6, widget.mode.index.toDouble());
        final bias = ui.ImageFilter.shader(shader);
        BackdropKaca.terakhirPakaiShader = true;
        return blur == null
            ? bias
            : ui.ImageFilter.compose(outer: bias, inner: blur);
      } on Object {
        // Tidak didukung renderer ini: pakai blur biasa.
      }
    }
    BackdropKaca.terakhirPakaiShader = false;
    return blur ?? ui.ImageFilter.blur(sigmaX: 0.01, sigmaY: 0.01);
  }

  @override
  Widget build(BuildContext context) =>
      BackdropFilter(filter: _filter(), child: widget.child);
}
