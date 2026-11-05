import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('ukuran teks sistem dibatasi 1.3x di seluruh aplikasi', (
    tester,
  ) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2.0)),
        child: const GarapApp(),
      ),
    );
    await tester.pump();
    final ctx = tester.element(find.byType(Scaffold).first);
    expect(MediaQuery.textScalerOf(ctx).scale(10), closeTo(13, 0.001));
  });
}
