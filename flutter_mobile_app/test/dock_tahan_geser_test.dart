import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/widgets/dock.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<List<int>> pasang(WidgetTester t, {int mulai = 0}) async {
    final dipilih = <int>[];
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: SizedBox(
              width: 400,
              child: DockNav(
                item: const [
                  DockItem('A', Icons.home),
                  DockItem('B', Icons.show_chart),
                  DockItem('C', Icons.eco),
                  DockItem('D', Icons.person),
                ],
                indeks: mulai,
                onPilih: dipilih.add,
              ),
            ),
          ),
        ),
      ),
    );
    return dipilih;
  }

  testWidgets('ketuk biasa tetap berpindah tab', (t) async {
    final dipilih = await pasang(t);
    await t.tap(find.text('C'));
    await t.pumpAndSettle();
    expect(dipilih, [2]);
  });

  testWidgets('tahan pil lalu geser dan lepas berpindah ke tab terdekat', (
    t,
  ) async {
    final dipilih = await pasang(t);
    final pusatA = t.getCenter(find.text('A'));
    final g = await t.startGesture(pusatA);
    await t.pump(const Duration(milliseconds: 700)); // melewati ambang tahan
    await g.moveBy(const Offset(220, 0)); // ±2 tab ke kanan (lebar tab ≈ 97)
    await t.pump();
    await g.up();
    await t.pumpAndSettle();
    expect(dipilih, [2]);
  });

  testWidgets('menahan di luar pil hijau tidak mengangkat atau berpindah', (
    t,
  ) async {
    final dipilih = await pasang(t);
    final g = await t.startGesture(t.getCenter(find.text('C')));
    await t.pump(const Duration(milliseconds: 700));
    await g.moveBy(const Offset(-150, 0));
    await t.pump();
    await g.up();
    await t.pumpAndSettle();
    expect(dipilih, isEmpty);
  });

  testWidgets('tahan lalu lepas di tempat semula tidak memicu perpindahan', (
    t,
  ) async {
    final dipilih = await pasang(t, mulai: 1);
    final g = await t.startGesture(t.getCenter(find.text('B')));
    await t.pump(const Duration(milliseconds: 700));
    await g.up();
    await t.pumpAndSettle();
    // lepas di tempat semula = tetap di tab aktif (boleh memanggil ulang tab yang sama, tidak pindah)
    expect(dipilih.where((i) => i != 1), isEmpty);
  });

  testWidgets(
    'pil langsung terangkat saat disentuh (tanpa menunggu tahan lama)',
    (t) async {
      await pasang(t, mulai: 3);
      final g = await t.startGesture(t.getCenter(find.text('D')));
      await t.pump(const Duration(milliseconds: 50));
      final skala = t.widget<AnimatedScale>(find.byType(AnimatedScale));
      expect(skala.scale, greaterThan(1));
      await g.up();
      await t.pumpAndSettle();
    },
  );
}
