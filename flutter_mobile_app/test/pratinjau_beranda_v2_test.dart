import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/pratinjau_beranda_v2.dart';
import 'package:flutter_mobile_app/widgets/beranda_baru/dock_melayang.dart';
import 'package:flutter_mobile_app/widgets/beranda_baru/kartu_sensor.dart';

Future<void> _ukuran(WidgetTester t, Size s) async {
  t.view.physicalSize = s;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('Beranda baru jujur soal data lama dan muat di layar kecil', (
    t,
  ) async {
    await _ukuran(t, const Size(320, 640));
    await t.pumpWidget(const PratinjauBerandaV2());
    await t.pumpAndSettle();
    expect(find.text('Data Sensor Lama'), findsOneWidget);
    expect(find.text('Data lama'), findsNWidgets(4));
    expect(find.text('Normal'), findsNothing);
    expect(t.takeException(), isNull);
    await t.drag(find.byType(ListView), const Offset(0, -700));
    await t.pumpAndSettle();
    expect(find.text('Tugas hari ini'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('Layar besar dan teks 200% tidak overflow', (t) async {
    await _ukuran(t, const Size(440, 956));
    t.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
    await t.pumpWidget(const PratinjauBerandaV2());
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
  });

  testWidgets('Nilai kosong tampil tanda strip, bukan angka tebakan', (
    t,
  ) async {
    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: KartuSensor(
            nama: 'pH',
            nilai: null,
            keterangan: 'Belum ada bacaan',
            keadaan: KeadaanSensor.basi,
          ),
        ),
      ),
    );
    expect(find.textContaining('—'), findsOneWidget);
    expect(find.textContaining('6,1'), findsNothing);
  });

  testWidgets('Tab Alat hanya ada untuk admin', (t) async {
    Future<void> tampil(bool admin) => t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DockMelayang(aktif: 'Beranda', admin: admin),
        ),
      ),
    );
    await tampil(true);
    expect(find.text('Alat'), findsOneWidget);
    await tampil(false);
    expect(find.text('Alat'), findsNothing);
  });
}
