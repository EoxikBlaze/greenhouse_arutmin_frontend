import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/main.dart';

void main() {
  testWidgets('App Vertonik tampil dengan judul benar', (WidgetTester tester) async {
    await tester.pumpWidget(const VertonikApp());
    expect(find.text('Vertonik Smart Farm'), findsWidgets);
    // unmount untuk membatalkan timer polling
    await tester.pumpWidget(const SizedBox());
  });
}
