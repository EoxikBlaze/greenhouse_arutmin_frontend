import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import 'kaca.dart';

/// Satu tab pada [DockNav].
class DockItem {
  const DockItem(this.label, this.ikon);

  final String label;
  final IconData ikon;
}

/// Navigasi bawah desain v2: kaca chrome (blur asli) mengambang, pil indikator
/// hijau SOLID yang meluncur ke tab aktif, ikon + label selalu terlihat.
///
/// Sentuh pil hijau: langsung terangkat (tanpa menunggu). Geser: pil mengikuti jari seperti tab bar iOS 26;
/// lepas untuk berpindah ke tab terdekat. Ketuk biasa tetap berpindah tab.
class DockNav extends StatefulWidget {
  const DockNav({
    super.key,
    required this.item,
    required this.indeks,
    required this.onPilih,
  });

  final List<DockItem> item;
  final int indeks;
  final ValueChanged<int> onPilih;

  static const double _tinggiItem = 56;
  static const double _padding = 6;

  /// Tinggi dock termasuk padding.
  static const double tinggi = _tinggiItem + _padding * 2;

  /// Ruang bawah yang harus disisakan halaman agar isi tidak tertutup dock.
  static double ruang(BuildContext context) =>
      tinggi + 16 + math.max(MediaQuery.viewPaddingOf(context).bottom, 12);

  @override
  State<DockNav> createState() => _DockNavState();
}

class _DockNavState extends State<DockNav> {
  /// Jari sedang menyentuh pil hijau (angkat langsung, tanpa menunggu tahan lama).
  bool _tekan = false;

  /// Posisi kiri pil saat digeser; null = pil mengikuti tab aktif.
  double? _geser;
  int? _sementara;
  double _awalX = 0;

  /// Geser lebih dari ini (piksel) = mulai menyeret pil.
  static const double _ambangSeret = 8;

  void _turun(Offset p, double lebar) {
    final kiri = widget.indeks * lebar;
    if (p.dx < kiri || p.dx > kiri + lebar) {
      return; // hanya pil hijau yang bisa ditahan
    }
    HapticFeedback.lightImpact();
    setState(() {
      _tekan = true;
      _awalX = p.dx;
    });
  }

  void _gerak(Offset p, double lebar) {
    if (!_tekan) return;
    if (_geser == null) {
      if ((p.dx - _awalX).abs() < _ambangSeret) return;
      HapticFeedback.mediumImpact();
      _geser = widget.indeks * lebar;
      _sementara = widget.indeks;
    }
    final maks = lebar * (widget.item.length - 1);
    final kiri = (p.dx - lebar / 2).clamp(0.0, maks);
    final i = (kiri / lebar).round().clamp(0, widget.item.length - 1);
    if (i != _sementara) {
      HapticFeedback.selectionClick();
    }
    setState(() {
      _geser = kiri;
      _sementara = i;
    });
  }

  void _lepas() {
    final tujuan = _sementara;
    final menyeret = _geser != null;
    if (!_tekan && !menyeret) return;
    setState(() {
      _tekan = false;
      _geser = null;
      _sementara = null;
    });
    if (menyeret && tujuan != null && tujuan != widget.indeks) {
      widget.onPilih(tujuan);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kurangiGerak = MediaQuery.disableAnimationsOf(context);
    final diangkat = _tekan || _geser != null;
    return KacaCair(
      varian: KacaVarian.chrome,
      radius: Tok.rChrome,
      padding: const EdgeInsets.all(DockNav._padding),
      child: LayoutBuilder(
        builder: (context, k) {
          final lebar = k.maxWidth / widget.item.length;
          final aktif = _sementara ?? widget.indeks;
          // Listener (bukan gesture arena): ketuk biasa pada tab tetap jalan, pil langsung terangkat saat disentuh.
          return Listener(
            behavior: HitTestBehavior.opaque,
            onPointerDown: (e) => _turun(e.localPosition, lebar),
            onPointerMove: (e) => _gerak(e.localPosition, lebar),
            onPointerUp: (_) => _lepas(),
            onPointerCancel: (_) => _lepas(),
            child: SizedBox(
              height: DockNav._tinggiItem,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedPositioned(
                    // saat digeser pil mengikuti jari tanpa jeda; saat lepas meluncur ke tab tujuan
                    duration: kurangiGerak || diangkat
                        ? Duration.zero
                        : Tok.dLambat,
                    curve: Tok.ease,
                    left: _geser ?? widget.indeks * lebar,
                    width: lebar,
                    top: 0,
                    bottom: 0,
                    child: AnimatedScale(
                      scale: diangkat && !kurangiGerak ? 1.14 : 1,
                      duration: Tok.dCepat,
                      curve: Curves.easeOutBack,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: Tok.activePill,
                          borderRadius: const BorderRadius.all(
                            Radius.circular(22),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0x596B9D4A),
                              blurRadius: diangkat ? 26 : 16,
                              spreadRadius: diangkat ? 0 : -4,
                              offset: Offset(0, diangkat ? 10 : 6),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      for (var i = 0; i < widget.item.length; i++)
                        Expanded(
                          child: _ItemDock(
                            item: widget.item[i],
                            aktif: i == aktif,
                            onTap: () => widget.onPilih(i),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ItemDock extends StatelessWidget {
  const _ItemDock({
    required this.item,
    required this.aktif,
    required this.onTap,
  });

  final DockItem item;
  final bool aktif;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final warna = aktif ? Colors.white : Tok.tinta.withValues(alpha: 0.66);
    return Semantics(
      button: true,
      selected: aktif,
      label: item.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(item.ikon, size: 22, color: warna),
            const SizedBox(height: 3),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              softWrap: false,
              style: TextStyle(
                color: warna,
                fontSize: 12,
                fontWeight: aktif ? FontWeight.w700 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
