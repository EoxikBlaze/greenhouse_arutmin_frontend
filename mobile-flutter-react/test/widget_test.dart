import 'package:flutter_test/flutter_test.dart';
import 'package:garap_react_shell/peringatan.dart';

void main() {
  test('alamat GARAP memakai HTTPS', () {
    expect(Uri.parse(garapUrl).scheme, 'https');
  });

  test('hanya peringatan aktif yang belum dinotifikasi', () {
    final data = [
      {'id': 1, 'sedang_terjadi': true, 'type': 'sensor_ph'},
      {'id': 2, 'sedang_terjadi': true, 'type': 'air_rendah'},
      {'id': 3, 'sedang_terjadi': false, 'type': 'estop'},
      'rusak',
    ];
    final baru = pilihBaru(data, {'1'});
    expect(baru.map((a) => a['id']), [2]);
  });

  test('judul peringatan mudah dibaca', () {
    expect(judulPeringatan('kunci_isi_timeout'), 'Alat terkunci: isi timeout');
    expect(judulPeringatan('sensor_ph'), 'pH di luar batas');
  });
}
