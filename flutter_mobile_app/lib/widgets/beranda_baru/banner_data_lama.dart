import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'token_beranda.dart';

/// Banner "Data Sensor Lama". Memakai ikon jam dan teks, bukan hanya warna.
/// [jam] harus berasal dari waktu bacaan terakhir yang nyata, bukan tebakan.
class BannerDataLama extends StatelessWidget {
  const BannerDataLama({super.key, required this.jam});

  final String jam;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Data sensor lama. Terakhir diperbarui pukul $jam.',
      child: ExcludeSemantics(
        child: Container(
          constraints: const BoxConstraints(minHeight: 65),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: TokBeranda.gradienDataLama,
            borderRadius: BorderRadius.circular(TokBeranda.radiusKartu),
          ),
          child: Row(
            children: [
              const Icon(
                LucideIcons.clock,
                size: 30,
                color: TokBeranda.kuningTeks,
              ),
              Container(
                width: 1.5,
                height: 36,
                margin: const EdgeInsets.symmetric(horizontal: 12),
                color: TokBeranda.kuningTeks,
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Data Sensor Lama',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: TokBeranda.tinta,
                      ),
                    ),
                    Text.rich(
                      TextSpan(
                        style: const TextStyle(
                          fontSize: 15,
                          color: TokBeranda.tinta,
                        ),
                        children: [
                          const TextSpan(text: 'Terakhir diperbarui pukul '),
                          TextSpan(
                            text: jam,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
