import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/util/performa.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';
import 'package:flutter_mobile_app/widgets/motion.dart';

void main() {
  tearDown(() {
    PerformaRender.atur(TingkatPerforma.bagus);
  });

  group('PerformaRender & Benchmark 20x Slower CPU', () {
    test('CPU normal (<= 18 ms) menghasilkan mode bagus', () {
      expect(tentukanPerforma(2.4), TingkatPerforma.bagus);
      expect(tentukanPerforma(18.0), TingkatPerforma.bagus);
    });

    test('CPU 20x lebih lambat (> 18 ms) otomatis turun ke mode ringan', () {
      final msNormal = ujiHitungCpu();
      // Simulasi 20x slower CPU (minimal > 18 ms bahkan pada chip M-series tercepat)
      final hasil = PerformaRender.mulai(pengaliSimulasiCpu: 20.0);
      if (msNormal * 20.0 > ambangPerformaMs) {
        expect(hasil, TingkatPerforma.ringan);
        expect(PerformaRender.ringan, isTrue);
      }
      expect(tentukanPerforma(48.0), TingkatPerforma.ringan);
    });

    test('Deteksi frame lambat (20x CPU throttling di tengah sesi) menurunkan ke mode ringan', () {
      PerformaRender.atur(TingkatPerforma.bagus);
      expect(PerformaRender.ringan, isFalse);

      // Simulasi lonjakan Long Task (>= 100 ms) saat 20x CPU throttling dinyalakan
      PerformaRender.laporkanDurasiFrame(120.0, pengaliSimulasiCpu: 20.0);
      expect(PerformaRender.tingkat.value, TingkatPerforma.ringan);
      expect(PerformaRender.ringan, isTrue);
    });

    test('3 frame lambat berturut-turut (>= 45 ms) otomatis menurunkan ke mode ringan', () {
      PerformaRender.atur(TingkatPerforma.bagus);
      PerformaRender.laporkanDurasiFrame(50.0);
      expect(PerformaRender.ringan, isFalse);
      PerformaRender.laporkanDurasiFrame(52.0);
      expect(PerformaRender.ringan, isFalse);
      PerformaRender.laporkanDurasiFrame(48.0);
      expect(PerformaRender.ringan, isTrue);
    });

    testWidgets(
      'Mode ringan (20x slower CPU) mematikan seluruh BackdropFilter dan animasi berat secara otomatis',
      (tester) async {
        PerformaRender.atur(TingkatPerforma.bagus);

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

        // 1. Render dalam mode Bagus (CPU normal)
        final swBagus = Stopwatch()..start();
        await tester.pumpWidget(bangunHalamanUji());
        for (var f = 0; f < 10; f++) {
          await tester.pump(const Duration(milliseconds: 16));
        }
        swBagus.stop();
        final jumlahBlurBagus = tester
            .widgetList<BackdropFilter>(find.byType(BackdropFilter))
            .length;
        final jumlahGambarLatarBagus = tester
            .widgetList<Image>(find.byType(Image))
            .length;
        expect(jumlahBlurBagus, greaterThan(0));
        expect(jumlahGambarLatarBagus, 2);

        // 2. Simulasikan 20x slower CPU di tengah sesi → otomatis turun ke Ringan
        PerformaRender.laporkanDurasiFrame(160.0, pengaliSimulasiCpu: 20.0);
        expect(PerformaRender.ringan, isTrue);

        final swRingan = Stopwatch()..start();
        await tester.pump();
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

        // Pada mode ringan (20x slower CPU): 0 BackdropFilter dan hanya 1 gambar latar aktif!
        // ignore: avoid_print
        print(
          'BENCHMARK_FLUTTER: '
          'Bagus(blur=$jumlahBlurBagus, gambar=$jumlahGambarLatarBagus, 10frame=${swBagus.elapsedMicroseconds / 1000.0}ms) -> '
          'Ringan_20xCPU(blur=$jumlahBlurRingan, gambar=$jumlahGambarLatarRingan, 10frame=${swRingan.elapsedMicroseconds / 1000.0}ms)',
        );
        expect(jumlahBlurRingan, 0);
        expect(jumlahGambarLatarRingan, 1);
      },
    );
  });
}
