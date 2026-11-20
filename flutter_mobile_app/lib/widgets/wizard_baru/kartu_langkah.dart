import 'package:flutter/material.dart';

import '../beranda_baru/token_beranda.dart';

/// Kartu isi satu langkah setup, gaya Figma: kartu putih, lencana nomor mint
/// di kiri judul, petunjuk satu-dua kalimat di bawahnya, lalu isi.
/// Tanpa [judul], hanya kartu dengan [child] (untuk blok tanpa lencana).
class KartuLangkah extends StatelessWidget {
  const KartuLangkah({
    super.key,
    required this.child,
    this.nomor,
    this.judul,
    this.petunjuk,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final String? nomor;
  final String? judul;
  final String? petunjuk;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    // Material (bukan DecoratedBox berwarna) supaya ListTile/Radio di dalam kartu
    // tetap menggambar tinta sentuhnya di atas permukaan ini.
    return Material(
      color: Colors.white.withValues(alpha: 0.9),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(TokBeranda.radiusKartu),
        side: const BorderSide(color: TokBeranda.garisKartu),
      ),
      child: Padding(
        padding: padding,
        child: DefaultTextStyle.merge(
          style: const TextStyle(color: TokBeranda.tinta),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (judul != null) ...[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (nomor != null) ...[
                      Container(
                        constraints: const BoxConstraints(minWidth: 36),
                        height: 36,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD9ECD3),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          nomor!,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: TokBeranda.hijauNormalTeks,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            header: true,
                            child: Text(
                              judul!,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                height: 1.25,
                              ),
                            ),
                          ),
                          if (petunjuk != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              petunjuk!,
                              style: const TextStyle(
                                fontSize: 13.5,
                                height: 1.35,
                                color: TokBeranda.samar,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
              ],
              child,
            ],
          ),
        ),
      ),
    );
  }
}
