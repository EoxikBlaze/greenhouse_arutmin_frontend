import 'package:flutter/material.dart';

import '../theme/tokens.dart';
import 'kaca.dart';
import 'motion.dart';

/// Tiga gaya kartu KPI: kaca biasa, hijau (disorot), emas (disorot).
enum Sorot { kaca, hijau, emas }

/// Satu angka ringkas (padanan kartu KPI di dashboard web). Bila [nilai] null,
/// [teks] (atau '—') ditampilkan sebagai gantinya.
class Kpi {
  const Kpi(
    this.label,
    this.ikon,
    this.nilai,
    this.desimal,
    this.satuan,
    this.ket,
    this.sorot, {
    this.teks,
  });

  final String label;
  final IconData ikon;
  final double? nilai;
  final int desimal;
  final String satuan;
  final String ket;
  final Sorot sorot;
  final String? teks;
}

class KartuKpi extends StatelessWidget {
  const KartuKpi(this.k, {super.key, this.terpilih = false, this.onTap});

  final Kpi k;

  /// Cincin emas di tepi kartu (kartu yang sedang dipilih).
  final bool terpilih;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final hijau = k.sorot == Sorot.hijau;
    final emas = k.sorot == Sorot.emas;
    final warnaTeks = hijau
        ? Colors.white
        : (emas ? const Color(0xFF2A2208) : Tok.tinta);

    final isi = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                k.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: warnaTeks.withValues(alpha: 0.8),
                ),
              ),
            ),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: hijau
                    ? Colors.white.withValues(alpha: 0.22)
                    : emas
                    ? Colors.white.withValues(alpha: 0.4)
                    : Tok.moss.withValues(alpha: 0.16),
              ),
              child: Icon(
                k.ikon,
                size: 17,
                color: hijau ? Colors.white : (emas ? warnaTeks : Tok.forest),
              ),
            ),
          ],
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            k.nilai == null
                ? Text(
                    k.teks ?? '—',
                    style: TextStyle(
                      fontFamily: Tok.fontJudul,
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: warnaTeks,
                    ),
                  )
                : CountUp(
                    nilai: k.nilai!,
                    desimal: k.desimal,
                    akhiran: k.satuan,
                    style: TextStyle(
                      fontFamily: Tok.fontJudul,
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: warnaTeks,
                    ),
                  ),
            Text(
              k.ket,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                color: warnaTeks.withValues(alpha: 0.72),
              ),
            ),
          ],
        ),
      ],
    );

    final Widget kartu;
    if (!hijau && !emas) {
      kartu = KacaCair(
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        child: isi,
      );
    } else {
      final gradasi = Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(Tok.rKartu),
          border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
          gradient: hijau
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xEB6B9D4A), Color(0xE62D452F)],
                )
              : const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xF2F0D660), Color(0xE6D6A828)],
                ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x332A5080),
              blurRadius: 30,
              spreadRadius: -10,
              offset: Offset(0, 14),
            ),
          ],
        ),
        child: isi,
      );
      kartu = RepaintBoundary(
        child: onTap == null ? gradasi : Pressable(onTap: onTap!, child: gradasi),
      );
    }

    if (!terpilih) return kartu;
    return Container(
      foregroundDecoration: BoxDecoration(
        borderRadius: BorderRadius.circular(Tok.rKartu),
        border: Border.all(color: Tok.emas, width: 2.5),
      ),
      child: kartu,
    );
  }
}
