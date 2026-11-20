import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/wizard_baru/kartu_langkah.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('KartuLangkah: lencana nomor, judul, petunjuk, dan isi tampil', (
    t,
  ) async {
    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: KartuLangkah(
            nomor: '3–6',
            judul: 'Uji & Kalibrasi Laju 4 Pompa',
            petunjuk: 'Satu pompa pada satu waktu.',
            child: Text('isi kartu'),
          ),
        ),
      ),
    );
    expect(find.text('3–6'), findsOneWidget);
    expect(find.text('Uji & Kalibrasi Laju 4 Pompa'), findsOneWidget);
    expect(find.text('Satu pompa pada satu waktu.'), findsOneWidget);
    expect(find.text('isi kartu'), findsOneWidget);
  });

  testWidgets('KartuLangkah tanpa judul hanya membungkus isi', (t) async {
    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: KartuLangkah(child: Text('hanya isi'))),
      ),
    );
    expect(find.text('hanya isi'), findsOneWidget);
  });

  testWidgets('ListTile di dalam KartuLangkah tidak memicu galat Material', (
    t,
  ) async {
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: KartuLangkah(
            judul: 'Pilihan',
            child: ListTile(title: const Text('Opsi A'), onTap: () {}),
          ),
        ),
      ),
    );
    expect(t.takeException(), isNull);
    expect(find.text('Opsi A'), findsOneWidget);
  });
}
