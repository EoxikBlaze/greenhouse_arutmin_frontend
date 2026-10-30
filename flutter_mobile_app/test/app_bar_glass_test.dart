import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/app_bar_glass.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('AppBarGlass: judul tampil dan tombol kembali menutup halaman', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const Scaffold(
                    appBar: AppBarGlass(judul: 'Daftar Meja'),
                    body: SizedBox(),
                  ),
                ),
              ),
              child: const Text('buka'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('buka'));
    await tester.pumpAndSettle();
    expect(find.text('Daftar Meja'), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    expect(find.text('Daftar Meja'), findsNothing);
    expect(find.text('buka'), findsOneWidget);
  });
}
