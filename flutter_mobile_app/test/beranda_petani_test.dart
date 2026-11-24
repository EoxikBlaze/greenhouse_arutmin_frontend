import 'package:flutter_mobile_app/pages/beranda_petani.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('nilaiSensor: di dalam batas aman, di luar perlu dicek', () {
    expect(nilaiSensor(6.3, 5, 7), Penilaian.aman);
    expect(nilaiSensor(4.9, 5, 7), Penilaian.perluDicek);
    expect(nilaiSensor(7.1, 5, 7), Penilaian.perluDicek);
    expect(nilaiSensor(5, 5, 7), Penilaian.aman);
  });

  test('nilaiSensor: tanpa data = belum ada; batas tidak masuk akal tidak menghakimi', () {
    expect(nilaiSensor(null, 5, 7), Penilaian.belumAda);
    expect(nilaiSensor(59, 100, 100), Penilaian.aman);
    expect(nilaiSensor(59, 80, 20), Penilaian.aman);
    expect(nilaiSensor(59, null, 100), Penilaian.aman);
  });
}
