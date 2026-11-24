import 'package:flutter_mobile_app/pages/uji_lab_page.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('susunHasilUjiLab', () {
    final spek = {
      'brix': {'nama': 'Brix', 'min': 0, 'max': 40},
      'bobot_g': {'nama': 'Bobot', 'min': 0, 'max': 50000},
    };
    test('hanya kolom terisi; koma desimal diterima', () {
      final h = susunHasilUjiLab(spek, {'brix': '12,5', 'bobot_g': ''});
      expect(h.galat, isNull);
      expect(h.hasil, [
        {'parameter': 'brix', 'nilai': 12.5},
      ]);
    });
    test('menolak kosong dan di luar rentang', () {
      expect(susunHasilUjiLab(spek, {}).galat, contains('minimal satu'));
      expect(susunHasilUjiLab(spek, {'brix': '99'}).galat, contains('Brix'));
    });
  });
}
