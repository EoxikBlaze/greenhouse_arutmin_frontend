import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/dock.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const item = [
    DockItem('Beranda', Icons.home),
    DockItem('Sensor', Icons.sensors),
    DockItem('Akun', Icons.person),
  ];

  testWidgets('dock: label terlihat, tap memilih tab, target ≥48dp', (
    tester,
  ) async {
    var dipilih = -1;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: SizedBox(
              width: 343,
              child: DockNav(
                item: item,
                indeks: 0,
                onPilih: (i) => dipilih = i,
              ),
            ),
          ),
        ),
      ),
    );
    for (final i in item) {
      expect(find.text(i.label), findsOneWidget);
    }
    expect(tester.getSize(find.text('Sensor').first).height, greaterThan(0));
    expect(
      tester.getSize(find.byType(DockNav)).height,
      greaterThanOrEqualTo(DockNav.tinggi),
    );

    await tester.tap(find.text('Sensor'));
    expect(dipilih, 1);
  });
}
