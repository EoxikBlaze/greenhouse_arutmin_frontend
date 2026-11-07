import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/util/performa.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';
import 'package:flutter_mobile_app/widgets/motion.dart';

void main() {
  tearDown(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  group('PerformaRender & Mode Ringan (Hemat Daya)', () {
    test('tentukanPerforma beralih sesuai kondisi ambang atau hemat daya', () {
      expect(tentukanPerforma(2.4), TingkatPerforma.bagus);
      expect(tentukanPerforma(48.0), TingkatPerforma.ringan);
      expect(tentukanPerforma(2.4, hematData: true), TingkatPerforma.ringan);
    });

    test('PerformaRender.mulai() mengaktifkan mode ringan secara konsisten', () {
      final hasil = PerformaRender.mulai(pengaliSimulasiCpu: 1.0);
      expect(hasil, TingkatPerforma.ringan);
      expect(PerformaRender.ringan, isTrue);
    });

    test('Mode ringan tetap stabil saat ada laporan lonjakan durasi frame', () {
      PerformaRender.laporkanDurasiFrame(120.0, pengaliSimulasiCpu: 20.0);
      expect(PerformaRender.tingkat.value, TingkatPerforma.ringan);
      expect(PerformaRender.ringan, isTrue);
    });

    testWidgets(
      'Mode ringan mematikan seluruh BackdropFilter dan animasi berat secara otomatis',
      (tester) async {
        PerformaRender.atur(TingkatPerforma.ringan);

        Widget bangunHalamanUji() {
          return ValueListenableBuilder<TingkatPerforma>(
            valueListenable: PerformaRender.tingkat,
            builder: (context, perf, _) => MaterialApp(
              home: KacaScope(
                mode: ModeKaca.standar,
                performaRingan: perf == TingkatPerforma.ringan,
                child: Scaffold(
                  body: Stack(
                    children: [
                      const Positioned.fill(child: LatarCair()),
                      BackdropGroup(
                        child: ListView(
                          children: [
                            for (var i = 0; i < 12; i++)
                              FadeUp(
                                delay: FadeUp.urutan(i),
                                child: KacaCair(
                                  varian: i == 0
                                      ? KacaVarian.chrome
                                      : KacaVarian.panel,
                                  child: Row(
                                    children: [
                                      const PulseDot(color: Colors.green),
                                      const SizedBox(width: 8),
                                      CountUp(nilai: (i + 1) * 10.0),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        // Render langsung dalam mode Ringan (bawaan sistem baru)
        final swRingan = Stopwatch()..start();
        await tester.pumpWidget(bangunHalamanUji());
        for (var f = 0; f < 10; f++) {
          await tester.pump(const Duration(milliseconds: 16));
        }
        swRingan.stop();

        final jumlahBlurRingan = tester
            .widgetList<BackdropFilter>(find.byType(BackdropFilter))
            .length;
        final jumlahGambarLatarRingan = tester
            .widgetList<Image>(find.byType(Image))
            .length;

        // Pada mode ringan: 0 BackdropFilter dan hanya 1 gambar latar aktif (hemat memori dan GPU)
        expect(jumlahBlurRingan, 0);
        expect(jumlahGambarLatarRingan, 1);
        expect(PerformaRender.ringan, isTrue);
      },
    );
  });
}
