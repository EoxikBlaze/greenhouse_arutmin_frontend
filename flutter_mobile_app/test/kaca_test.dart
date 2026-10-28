import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';
import 'package:flutter_test/flutter_test.dart';

Future<void> _pasang(
  WidgetTester tester,
  KacaVarian varian, {
  bool kontras = false,
}) {
  return tester.pumpWidget(
    MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(highContrast: kontras),
        child: Scaffold(
          body: KacaCair(varian: varian, child: const Text('isi')),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('chrome memakai blur asli', (tester) async {
    await _pasang(tester, KacaVarian.chrome);
    expect(find.byType(BackdropFilter), findsOneWidget);
  });

  testWidgets('panel dan solid tidak memakai blur', (tester) async {
    await _pasang(tester, KacaVarian.panel);
    expect(find.byType(BackdropFilter), findsNothing);
    await _pasang(tester, KacaVarian.solid);
    expect(find.byType(BackdropFilter), findsNothing);
  });

  testWidgets('kontras tinggi: chrome jadi solid tanpa blur', (tester) async {
    await _pasang(tester, KacaVarian.chrome, kontras: true);
    expect(find.byType(BackdropFilter), findsNothing);
    expect(find.text('isi'), findsOneWidget);
  });
}
