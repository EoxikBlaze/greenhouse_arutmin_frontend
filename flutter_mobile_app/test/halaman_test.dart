import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/halaman.dart';
import 'package:flutter_mobile_app/widgets/kpi.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _bungkus(Widget w) => MaterialApp(
  home: Scaffold(body: Center(child: w)),
);

void main() {
  testWidgets('PilPilih memanggil onPilih dengan indeks yang diketuk', (
    tester,
  ) async {
    var terpilih = -1;
    await tester.pumpWidget(
      _bungkus(
        PilPilih(
          label: const ['pH', 'TDS', 'Suhu'],
          pilih: 0,
          onPilih: (i) => terpilih = i,
        ),
      ),
    );
    await tester.tap(find.text('TDS'));
    expect(terpilih, 1);
  });

  testWidgets('KartuKpi tanpa angka menampilkan teks, dan bisa diketuk', (
    tester,
  ) async {
    var diketuk = false;
    await tester.pumpWidget(
      _bungkus(
        SizedBox(
          width: 180,
          height: 128,
          child: KartuKpi(
            const Kpi(
              'Perangkat',
              Icons.wifi,
              null,
              0,
              '',
              'baru saja',
              Sorot.kaca,
              teks: 'Online',
            ),
            onTap: () => diketuk = true,
          ),
        ),
      ),
    );
    expect(find.text('Online'), findsOneWidget);
    await tester.tap(find.text('Online'));
    expect(diketuk, isTrue);
  });

  testWidgets('PageTop menampilkan eyebrow kapital dan judul', (tester) async {
    await tester.pumpWidget(
      _bungkus(const PageTop(eyebrow: 'Kebun & sensor', judul: 'Kontrol air')),
    );
    expect(find.text('KEBUN & SENSOR'), findsOneWidget);
    expect(find.text('Kontrol air'), findsOneWidget);
  });
}
