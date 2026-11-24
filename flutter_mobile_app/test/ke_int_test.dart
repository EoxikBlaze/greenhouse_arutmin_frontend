import 'package:flutter_mobile_app/services/setup_service.dart';
import 'package:flutter_mobile_app/util/format.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'keInt menerima angka dan teks angka dari PostgreSQL (bigint = teks)',
    () {
      expect(keInt(7), 7);
      expect(keInt(7.0), 7);
      expect(keInt('12'), 12);
      expect(keInt('12.0'), 12);
      expect(keInt(null), isNull);
      expect(keInt('bukan angka'), isNull);
    },
  );

  test('keIntWajib melempar FormatException yang jelas, bukan galat cast', () {
    expect(keIntWajib('5'), 5);
    expect(
      () => keIntWajib(null, 'id_tanaman'),
      throwsA(
        isA<FormatException>().having(
          (e) => e.message,
          'pesan',
          contains('id_tanaman'),
        ),
      ),
    );
  });

  test(
    'SetupProgress.fromApi tidak jatuh bila id_meja datang sebagai teks',
    () {
      final p = SetupProgress.fromApi({
        'id_meja': '3',
        'setup_selesai': false,
        'setup_progres': {'langkah_aktif': '2'},
      });
      expect(p.idMeja, 3);
      expect(p.langkahAktif, 2);
    },
  );
}
