import 'dart:math' as math;

import 'package:flutter/material.dart';

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
class DockNav extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final kurangiGerak = MediaQuery.disableAnimationsOf(context);
    return KacaCair(
      varian: KacaVarian.chrome,
      radius: Tok.rChrome,
      padding: const EdgeInsets.all(_padding),
      child: LayoutBuilder(
        builder: (context, k) {
          final lebar = k.maxWidth / item.length;
          return SizedBox(
            height: _tinggiItem,
            child: Stack(
              children: [
                AnimatedPositioned(
                  duration: kurangiGerak ? Duration.zero : Tok.dLambat,
                  curve: Tok.ease,
                  left: indeks * lebar,
                  width: lebar,
                  top: 0,
                  bottom: 0,
                  child: const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: Tok.activePill,
                      borderRadius: BorderRadius.all(Radius.circular(22)),
                      boxShadow: [
                        BoxShadow(
                          color: Color(0x596B9D4A),
                          blurRadius: 16,
                          spreadRadius: -4,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (var i = 0; i < item.length; i++)
                      Expanded(
                        child: _ItemDock(
                          item: item[i],
                          aktif: i == indeks,
                          onTap: () => onPilih(i),
                        ),
                      ),
                  ],
                ),
              ],
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
    final warna = aktif ? Colors.white : Colors.white.withValues(alpha: 0.72);
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
