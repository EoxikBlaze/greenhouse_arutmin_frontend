import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/pratinjau_beranda.dart';

void main() {
  testWidgets('Pratinjau data basi jujur dan muat pada layar kecil', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const PratinjauBeranda());
    await tester.pumpAndSettle();
    expect(find.text('PRATINJAU · DATA CONTOH FIGMA'), findsOneWidget);
    expect(find.text('● Data lama'), findsNWidgets(4));
    expect(tester.takeException(), isNull);
    await tester.drag(
      find.byType(SingleChildScrollView),
      const Offset(0, -500),
    );
    await tester.pumpAndSettle();
    expect(find.text('Tugas hari ini'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
