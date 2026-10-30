import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/main.dart';

void main() {
  testWidgets('App GARAP tampil dengan judul benar', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const GarapApp());
    expect(find.text('GARAP'), findsWidgets);
    // unmount untuk membatalkan timer polling
    await tester.pumpWidget(const SizedBox());
  });
}
