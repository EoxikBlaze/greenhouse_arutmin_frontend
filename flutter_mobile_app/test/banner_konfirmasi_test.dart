import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_mobile_app/widgets/brand.dart';

void main() {
  testWidgets('BannerBasi menyebut koneksi terputus dan umur data', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BannerBasi(
            sejak: DateTime.now().subtract(const Duration(minutes: 3)),
          ),
        ),
      ),
    );
    expect(find.textContaining('Koneksi terputus'), findsOneWidget);
    expect(find.textContaining('3 menit lalu'), findsOneWidget);
  });

  testWidgets('konfirmasi: true saat Ya, false saat Batal', (tester) async {
    bool? hasil;
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () async => hasil = await konfirmasi(
                context,
                judul: 'Keluar?',
                isi: 'Yakin.',
                labelYa: 'Ya, keluar',
              ),
              child: const Text('buka'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('buka'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Batal'));
    await tester.pumpAndSettle();
    expect(hasil, isFalse);

    await tester.tap(find.text('buka'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ya, keluar'));
    await tester.pumpAndSettle();
    expect(hasil, isTrue);
  });
}
