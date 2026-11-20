import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_mobile_app/services/setup_service.dart';

void main() {
  test('uji lab menolak nilai non-finite pada setiap isian', () {
    for (final invalid in [
      double.nan,
      double.infinity,
      double.negativeInfinity,
    ]) {
      for (var i = 0; i < 5; i++) {
        final values = [1.0, 100.0, 5.0, 5.0, 1100.0];
        values[i] = invalid;
        expect(
          hitungUjiLabNutrisi(
            volumeSampel: values[0],
            ppmAwal: values[1],
            mlA: values[2],
            mlB: values[3],
            ppmAkhir: values[4],
          ),
          isNull,
        );
      }
    }
  });

  test('kalibrasi pompa menolak non-finite dan hasil overflow', () {
    for (final invalid in [
      double.nan,
      double.infinity,
      double.negativeInfinity,
    ]) {
      expect(hitungLajuPompa(ml: invalid, detik: 10), isNull);
      expect(hitungLajuPompa(ml: 10, detik: invalid), isNull);
    }
    expect(hitungLajuPompa(ml: 1e308, detik: 1e-308), isNull);
    expect(hitungLajuPompa(ml: 25, detik: 10), 2.5);
  });

  test('prasyarat setup menolak volume NaN', () {
    final status = cekPrasyaratSelesai(
      const SetupProgress(
        tandon: {'volume_l': double.nan, 'konfigurasi_dikonfirmasi': true},
      ),
    );
    expect(
      status.kurangWajib,
      contains('Volume efektif tandon (5–5000 L) belum diisi.'),
    );
  });
}
