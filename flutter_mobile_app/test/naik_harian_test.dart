import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/naik_harian_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

void main() {
  test('kenaikan per hari: melon 400 → 2400 dalam 60 hari ≈ 33,3; isian tak lengkap/terbalik → null', () {
    expect(kenaikanPerHari(400, 2400, 60), closeTo(33.33, 0.01));
    expect(kenaikanPerHari(400, 2400, 40), 50);
    expect(kenaikanPerHari(400, 2400, 0), isNull);
    expect(kenaikanPerHari(2400, 400, 60), isNull);
    expect(kenaikanPerHari(null, 2400, 60), isNull);
  });

  testWidgets(
    'halaman: daftar tanaman, isi target melon → PUT benar + peringatan ambang',
    (tester) async {
      final kiriman = <http.Request>[];
      final api = ApiService(
        client: MockClient((req) async {
          kiriman.add(req);
          if (req.method == 'GET') {
            return http.Response(
              jsonEncode({
                'data': [
                  {
                    'id_tanaman': '55',
                    'nama_tanaman': 'Melon',
                    'ppm_awal': null,
                    'ppm_target': null,
                    'hari_capai': null,
                    'per_hari': null,
                  },
                  {
                    'id_tanaman': '3',
                    'nama_tanaman': 'Selada',
                    'ppm_awal': '400.00',
                    'ppm_target': '900.00',
                    'hari_capai': 20,
                    'per_hari': 25,
                  },
                ],
                'ambang_tds': {'min': 50, 'max': 1300},
              }),
              200,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode({
              'status': true,
              'message': 'Target Melon disimpan: 400 → 2400 ppm dalam 60 hari.',
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      await tester.pumpWidget(MaterialApp(home: NaikHarianPage(api: api)));
      await tester.pump(const Duration(milliseconds: 300));
      expect(
        find.text('Belum diatur — memakai preset per tahap.'),
        findsOneWidget,
      );
      expect(find.text('400 → 900 ppm'), findsOneWidget);
      expect(find.text('20 hari · naik ±25 ppm/hari'), findsOneWidget);

      await tester.tap(find.text('Melon'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 60));
      }
      final isian = find.byType(TextField);
      await tester.enterText(isian.at(0), '2400');
      await tester.enterText(isian.at(1), '60');
      await tester.pump();
      expect(find.text('Naik ±33,3 ppm per hari.'), findsOneWidget);
      expect(
        find.textContaining('Ambang alert TDS saat ini 1300 ppm'),
        findsOneWidget,
      );

      await tester.tap(find.text('Simpan'));
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 60));
      }
      final put = kiriman.firstWhere((r) => r.method == 'PUT');
      expect(put.url.path, '/dosing/naik-harian/55');
      expect(jsonDecode(put.body), {
        'ppm_awal': 400,
        'ppm_target': 2400,
        'hari_capai': 60,
      });
    },
  );
}
