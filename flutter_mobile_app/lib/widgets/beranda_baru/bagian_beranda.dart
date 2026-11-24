import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'token_beranda.dart';

/// Judul bagian ("Sensor", "Peringatan terbaru", ...), opsional tautan di kanan.
class JudulBagian extends StatelessWidget {
  const JudulBagian(this.teks, {super.key, this.tautan, this.onTautan});

  final String teks;
  final String? tautan;
  final VoidCallback? onTautan;

  @override
  Widget build(BuildContext context) {
    // Wrap: di layar sempit atau teks besar, tautan turun ke baris bawah.
    return Wrap(
      alignment: WrapAlignment.spaceBetween,
      crossAxisAlignment: WrapCrossAlignment.end,
      children: [
        Semantics(
          header: true,
          child: Text(
            teks,
            style: const TextStyle(
              fontFamily: TokBeranda.fontJudul,
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: TokBeranda.tinta,
            ),
          ),
        ),
        if (tautan != null)
          InkWell(
            onTap: onTautan,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Align(
                widthFactor: 1,
                heightFactor: 1,
                child: Text(
                  tautan!,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                    color: TokBeranda.hijauAktif,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Panel putih berisi isi apa pun (peringatan, tugas, pesan kosong).
class PanelPutih extends StatelessWidget {
  const PanelPutih({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(TokBeranda.radiusKartu),
        border: Border.all(color: TokBeranda.garisKartu),
      ),
      child: child,
    );
  }
}

class BarisPeringatan extends StatelessWidget {
  const BarisPeringatan({super.key, required this.judul, required this.waktu});

  final String judul;
  final String waktu;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          const Icon(
            LucideIcons.triangleAlert,
            size: 30,
            color: Color(0xFFC18014),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  judul,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: TokBeranda.tinta,
                  ),
                ),
                Text(
                  waktu,
                  style: const TextStyle(fontSize: 15, color: TokBeranda.tinta),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
