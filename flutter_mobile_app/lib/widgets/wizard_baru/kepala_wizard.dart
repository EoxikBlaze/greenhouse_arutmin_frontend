import 'package:flutter/material.dart';

import '../beranda_baru/token_beranda.dart';
import '../ikon.dart';

/// Kepala layar Setup, gaya Figma "Setup Kalibrasi": kartu header, judul,
/// stepper bulat 1-6, dan chip "01 / 06" + nama langkah.

/// Kartu header: logo, "Vertonik - Garap", nama setup, dan tombol keluar.
class HeaderWizardKartu extends StatelessWidget {
  const HeaderWizardKartu({super.key, required this.subjudul, this.onKeluar});

  final String subjudul;
  final VoidCallback? onKeluar;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 72),
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(TokBeranda.radiusKartu),
        border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A0A1F38),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
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
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Vertonik - Garap',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: TokBeranda.fontJudul,
                    fontSize: 19,
                    fontWeight: FontWeight.w700,
                    height: 1.15,
                    color: TokBeranda.tinta,
                  ),
                ),
                Text(
                  subjudul,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.2,
                    color: TokBeranda.samar,
                  ),
                ),
              ],
            ),
          ),
          if (onKeluar != null)
            IconButton(
              tooltip: 'Keluar',
              onPressed: onKeluar,
              constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
              icon: const Icon(Ikon.keluar, size: 24, color: TokBeranda.tinta),
            ),
        ],
      ),
    );
  }
}

/// "Siapkan kebun Anda" + satu kalimat petunjuk untuk langkah aktif.
class JudulWizard extends StatelessWidget {
  const JudulWizard({super.key, required this.petunjuk});

  final String petunjuk;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: const Text(
              'Siapkan kebun Anda',
              style: TextStyle(
                fontFamily: TokBeranda.fontJudul,
                fontSize: 28,
                fontWeight: FontWeight.w700,
                height: 1.1,
                color: TokBeranda.tinta,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            petunjuk,
            style: const TextStyle(fontSize: 15, color: TokBeranda.tinta),
          ),
        ],
      ),
    );
  }
}

/// Stepper bulat: langkah aktif navy berisi angka putih, lainnya putih.
/// Tiap bulatan area sentuhnya 48 dan bisa diketuk untuk pindah langkah.
class StepperBulat extends StatelessWidget {
  const StepperBulat({
    super.key,
    required this.judul,
    required this.aktif,
    required this.onPilih,
  });

  final List<String> judul;
  final int aktif;
  final ValueChanged<int> onPilih;

  static const double _sentuh = 48;
  static const double _bulat = 34;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _sentuh,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            left: _sentuh / 2,
            right: _sentuh / 2,
            child: Container(height: 1.5, color: const Color(0xFFB9C4D0)),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [for (var i = 0; i < judul.length; i++) _bulatan(i)],
          ),
        ],
      ),
    );
  }

  Widget _bulatan(int i) {
    final pilih = i == aktif;
    return Semantics(
      button: true,
      selected: pilih,
      label: 'Langkah ${i + 1}: ${judul[i]}',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onPilih(i),
        child: SizedBox(
          width: _sentuh,
          height: _sentuh,
          child: Center(
            child: Container(
              width: _bulat,
              height: _bulat,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: pilih ? TokBeranda.navy : Colors.white,
                border: Border.all(
                  color: pilih ? TokBeranda.navy : const Color(0xFFB9C4D0),
                ),
              ),
              child: Text(
                '${i + 1}',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: pilih ? Colors.white : TokBeranda.tinta,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Chip mint "01 / 06" diikuti nama langkah.
class ChipLangkah extends StatelessWidget {
  const ChipLangkah({
    super.key,
    required this.nomor,
    required this.jumlah,
    required this.judul,
    this.trailing,
  });

  final int nomor;
  final int jumlah;
  final String judul;

  /// Aksi di ujung kanan baris (mis. tombol Lewati setup).
  final Widget? trailing;

  String _dua(int n) => n.toString().padLeft(2, '0');

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: const Color(0xFFD9ECD3),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            '${_dua(nomor)} / ${_dua(jumlah)}',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: TokBeranda.hijauNormalTeks,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            judul,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: TokBeranda.fontJudul,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: TokBeranda.tinta,
            ),
          ),
        ),
        ?trailing,
      ],
    );
  }
}
