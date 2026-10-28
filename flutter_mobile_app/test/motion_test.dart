import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/motion.dart';
import 'package:flutter_mobile_app/widgets/rute.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget anak, {bool kurangi = false}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: kurangi),
    child: Scaffold(body: anak),
  ),
);

void main() {
  testWidgets('FadeUp memudar masuk, selesai di opacity 1', (tester) async {
    await tester.pumpWidget(_app(const FadeUp(child: Text('isi'))));
    await tester.pump(const Duration(milliseconds: 50));
    expect(tester.widget<Opacity>(find.byType(Opacity)).opacity, lessThan(1));
    await tester.pumpAndSettle();
    expect(tester.widget<Opacity>(find.byType(Opacity)).opacity, 1);
  });

  testWidgets('FadeUp tanpa animasi saat gerak dikurangi', (tester) async {
    await tester.pumpWidget(
      _app(const FadeUp(child: Text('isi')), kurangi: true),
    );
    expect(find.byType(Opacity), findsNothing);
    expect(find.text('isi'), findsOneWidget);
  });

  testWidgets('RuteHalus: halaman langsung tampil saat gerak dikurangi', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, anak) => MediaQuery(
          data: MediaQuery.of(context).copyWith(disableAnimations: true),
          child: anak!,
        ),
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.push(
              context,
              RuteHalus<void>(builder: (_) => const Text('tujuan')),
            ),
            child: const Text('buka'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('buka'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));
    expect(find.text('tujuan'), findsOneWidget);
  });
}
