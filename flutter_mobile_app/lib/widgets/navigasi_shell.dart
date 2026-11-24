import 'package:flutter/material.dart';

import 'rute.dart';

/// Scope navigasi dalam [MainShell] agar header (ArutminHeader) dan
/// footer (DockNav + Tombol AI) tetap diam (statis/pinned) saat berpindah
/// ke halaman dalam (subpage).
class NavigasiShellScope extends InheritedWidget {
  const NavigasiShellScope({
    super.key,
    required this.bukaHalaman,
    required this.tutupHalaman,
    required this.adaHalamanDalam,
    required super.child,
  });

  final void Function(Widget halaman, String judul) bukaHalaman;
  final VoidCallback tutupHalaman;
  final bool adaHalamanDalam;

  static NavigasiShellScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<NavigasiShellScope>();

  static NavigasiShellScope of(BuildContext context) {
    final s = maybeOf(context);
    assert(s != null, 'NavigasiShellScope tidak ditemukan di konteks');
    return s!;
  }

  @override
  bool updateShouldNotify(NavigasiShellScope oldWidget) =>
      adaHalamanDalam != oldWidget.adaHalamanDalam;
}

/// Helper universal untuk membuka halaman di aplikasi GARAP.
///
/// Jika dipanggil di dalam shell utama, halaman dibuka di area konten tengah
/// dengan transisi pudar lembut (cross-fade), sementara header dan footer
/// tetap diam di posisinya (tidak bergerak / menghilang).
///
/// Jika dipanggil di luar shell utama (misal pengujian unit), fungsi ini
/// otomatis fallback ke [Navigator.push] dengan [RuteHalus].
void bukaHalamanApp(
  BuildContext context,
  Widget halaman, {
  required String judul,
}) {
  final scope = NavigasiShellScope.maybeOf(context);
  if (scope != null) {
    scope.bukaHalaman(halaman, judul);
  } else {
    Navigator.of(context).push(
      RuteHalus<void>(builder: (_) => halaman),
    );
  }
}

