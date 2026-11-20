import 'package:flutter/material.dart';

import 'token_beranda.dart';

/// segar = bacaan baru dan dalam batas; basi = alat tidak mengirim data;
/// perluDicek = di luar batas; tanpaData = belum ada bacaan sama sekali.
enum KeadaanSensor { segar, basi, perluDicek, tanpaData }

/// Kartu satu sensor. Data basi dipudarkan dan tidak pernah tampil hijau.
/// [nilai] null berarti belum ada bacaan: tampil "—", bukan angka tebakan.
class KartuSensor extends StatelessWidget {
  const KartuSensor({
    super.key,
    required this.nama,
    required this.nilai,
    required this.keterangan,
    required this.keadaan,
    this.satuan = '',
  });

  final String nama;
  final String? nilai;
  final String satuan;
  final String keterangan;
  final KeadaanSensor keadaan;

  bool get _basi => keadaan == KeadaanSensor.basi;
  String get _teksLencana => switch (keadaan) {
    KeadaanSensor.segar => 'Aman',
    KeadaanSensor.basi => 'Data lama',
    KeadaanSensor.perluDicek => '▲ Perlu dicek',
    KeadaanSensor.tanpaData => 'Belum ada data',
  };

  @override
  Widget build(BuildContext context) {
    final tampil = nilai ?? '—';
    return Semantics(
      container: true,
      label:
          '$nama ${nilai ?? 'belum ada data'} $satuan. $keterangan. $_teksLencana.',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(TokBeranda.radiusKartu),
            border: Border.all(color: TokBeranda.garisKartu),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                nama,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: TokBeranda.samar,
                ),
              ),
              const SizedBox(height: 8),
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: tampil,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: TokBeranda.tinta.withValues(
                          alpha: _basi ? 0.45 : 1,
                        ),
                      ),
                    ),
                    if (satuan.isNotEmpty)
                      TextSpan(
                        text: ' $satuan',
                        style: const TextStyle(
                          fontSize: 15,
                          color: TokBeranda.samar,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                keterangan,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: TokBeranda.samar,
                ),
              ),
              const SizedBox(height: 8),
              _Lencana(keadaan: keadaan, teks: _teksLencana),
            ],
          ),
        ),
      ),
    );
  }
}

class _Lencana extends StatelessWidget {
  const _Lencana({required this.keadaan, required this.teks});

  final KeadaanSensor keadaan;
  final String teks;

  @override
  Widget build(BuildContext context) {
    final basi = keadaan == KeadaanSensor.basi;
    final (garis, tulisan, isi) = switch (keadaan) {
      KeadaanSensor.segar => (
        TokBeranda.hijauNormal,
        TokBeranda.hijauNormalTeks,
        const Color(0xFFE6F0DD),
      ),
      KeadaanSensor.basi => (
        TokBeranda.kuning,
        TokBeranda.kuningTeks,
        const Color(0xFFFFF2DB),
      ),
      KeadaanSensor.perluDicek => (
        const Color(0xFFC0392B),
        const Color(0xFFA32B20),
        const Color(0xFFFBE9E7),
      ),
      KeadaanSensor.tanpaData => (
        const Color(0xFF8A97A8),
        TokBeranda.samar,
        Colors.white,
      ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        gradient: basi ? TokBeranda.gradienDataLama : null,
        color: basi ? null : isi,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: garis),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (keadaan != KeadaanSensor.perluDicek) ...[
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: garis, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ],
          Flexible(
            child: Text(
              teks,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: tulisan,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
