import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'token_beranda.dart';

/// Kartu header: logo KKN yang sudah ada di aset, judul, nama layar,
/// lonceng (titik merah bila ada notifikasi), dan avatar.
class HeaderKartu extends StatelessWidget {
  const HeaderKartu({
    super.key,
    required this.judul,
    required this.subjudul,
    this.adaNotifikasi = false,
    this.inisial = 'A',
  });

  final String judul;
  final String subjudul;
  final bool adaNotifikasi;
  final String inisial;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: TokBeranda.tinggiHeader),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(TokBeranda.radiusHeader),
        boxShadow: const [
          BoxShadow(
            color: Color(0x40000000),
            offset: Offset(3, 3),
            blurRadius: 8.7,
          ),
        ],
      ),
      child: Row(
        children: [
          Semantics(
            label: 'Logo Tim KKN',
            // kkn.png berwarna terang di latar transparan: dipasang di kotak navy
            // seperti di halaman login, supaya terbaca di kartu putih.
            child: Container(
              width: 52,
              height: 52,
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: TokBeranda.navy,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Image.asset(
                'assets/tentang/logo/kkn.png',
                fit: BoxFit.contain,
                excludeFromSemantics: true,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  judul,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: TokBeranda.fontJudul,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    height: 1.15,
                    color: Colors.black,
                  ),
                ),
                Text(
                  subjudul,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.15,
                    color: Colors.black,
                  ),
                ),
              ],
            ),
          ),
          Semantics(
            button: true,
            label: adaNotifikasi ? 'Notifikasi, ada yang baru' : 'Notifikasi',
            child: SizedBox(
              width: 44,
              height: 44,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Icon(
                    LucideIcons.bell,
                    size: 22,
                    color: TokBeranda.lonceng,
                  ),
                  if (adaNotifikasi)
                    const Positioned(
                      right: 10,
                      top: 9,
                      child: SizedBox(
                        width: 10,
                        height: 10,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: TokBeranda.titikNotifikasi,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Semantics(
            label: 'Profil',
            child: CircleAvatar(
              radius: 17.5,
              backgroundColor: TokBeranda.garisKartu,
              child: Text(
                inisial,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: TokBeranda.tinta,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
