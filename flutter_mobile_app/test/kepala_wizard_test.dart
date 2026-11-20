import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/wizard_baru/kepala_wizard.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Stepper: 6 bulatan, mengetuk bulatan memilih langkah itu', (
    t,
  ) async {
    int? dipilih;
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StepperBulat(
            judul: const ['A', 'B', 'C', 'D', 'E', 'F'],
            aktif: 0,
            onPilih: (i) => dipilih = i,
          ),
        ),
      ),
    );
    for (var i = 1; i <= 6; i++) {
      expect(find.text('$i'), findsOneWidget);
    }
    await t.tap(find.text('4'));
    expect(dipilih, 3);
  });

  testWidgets('Stepper: area sentuh tiap bulatan minimal 48x48', (t) async {
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StepperBulat(
            judul: const ['A', 'B', 'C', 'D', 'E', 'F'],
            aktif: 2,
            onPilih: (_) {},
          ),
        ),
      ),
    );
    final ukuran = t.getSize(
      find
          .ancestor(of: find.text('3'), matching: find.byType(GestureDetector))
          .first,
    );
    expect(ukuran.width, greaterThanOrEqualTo(48));
    expect(ukuran.height, greaterThanOrEqualTo(48));
  });

  testWidgets('Chip langkah: nomor berformat dua digit', (t) async {
    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ChipLangkah(nomor: 1, jumlah: 6, judul: 'Kalibrasi Alat'),
        ),
      ),
    );
    expect(find.text('01 / 06'), findsOneWidget);
    expect(find.text('Kalibrasi Alat'), findsOneWidget);
  });

  testWidgets('Header: tombol Keluar hanya tampil bila diberi aksi', (t) async {
    var keluar = 0;
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HeaderWizardKartu(
            subjudul: 'Setup Kalibrasi',
            onKeluar: () => keluar++,
          ),
        ),
      ),
    );
    expect(find.text('Vertonik - Garap'), findsOneWidget);
    await t.tap(find.byTooltip('Keluar'));
    expect(keluar, 1);

    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: HeaderWizardKartu(subjudul: 'Setup Kalibrasi')),
      ),
    );
    expect(find.byTooltip('Keluar'), findsNothing);
  });

  testWidgets('Chip langkah: aksi trailing tampil di ujung baris', (t) async {
    var n = 0;
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ChipLangkah(
            nomor: 2,
            jumlah: 6,
            judul: 'Volume & Isi Air',
            trailing: TextButton(
              onPressed: () => n++,
              child: const Text('Lewati setup'),
            ),
          ),
        ),
      ),
    );
    await t.tap(find.text('Lewati setup'));
    expect(n, 1);
  });
}
