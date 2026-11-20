import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'kaca_lensa.dart';
import 'token_beranda.dart';

class ItemDock {
  const ItemDock(this.label, this.ikon);
  final String label;
  final IconData ikon;
}

/// Menu bawah yang melayang di atas isi (tidak menempel), dengan blur latar
/// tipis. Admin memiliki tab "Alat"; peran lain tidak.
class DockMelayang extends StatelessWidget {
  const DockMelayang({
    super.key,
    required this.aktif,
    this.admin = false,
    this.onPilih,
  });

  final String aktif;
  final bool admin;
  final ValueChanged<String>? onPilih;

  List<ItemDock> get _item => [
    const ItemDock('Beranda', LucideIcons.house),
    const ItemDock('Tanam', LucideIcons.sprout),
    if (admin) const ItemDock('Alat', LucideIcons.wrench),
    const ItemDock('Peringatan', LucideIcons.triangleAlert),
    const ItemDock('Akun', LucideIcons.circleUserRound),
  ];

  @override
  Widget build(BuildContext context) {
    // Gaya efek "Blur/Glass" di Figma: kaca dengan blur latar tipis.
    return KacaLensa(
      radius: TokBeranda.radiusKartu,
      tint: const Color(0xB8FFFFFF),
      parameter: const ParameterKaca(frost: 4),
      child: Container(
        constraints: const BoxConstraints(minHeight: TokBeranda.tinggiDock),
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(children: [for (final i in _item) Expanded(child: _tab(i))]),
      ),
    );
  }

  Widget _tab(ItemDock i) {
    final dipilih = i.label == aktif;
    final warna = dipilih ? TokBeranda.hijauAktif : TokBeranda.samar;
    return Semantics(
      button: true,
      selected: dipilih,
      label: i.label,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onPilih == null ? null : () => onPilih!(i.label),
        child: ExcludeSemantics(
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(i.ikon, size: 24, color: warna),
                const SizedBox(height: 4),
                Text(
                  i.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: dipilih ? FontWeight.w600 : FontWeight.w500,
                    color: warna,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
