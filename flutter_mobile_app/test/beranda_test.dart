import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/dashboard_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/widgets/ikon.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';
import 'package:flutter_mobile_app/widgets/tren_batang.dart';

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {'content-type': 'application/json'},
);

/// [n] bacaan pH; [datar] = semua nilai sama (rentang data nol).
List<Map<String, Object?>> _bacaan(int n, {bool datar = false}) => [
  for (var i = 0; i < n; i++)
    {
      'id': '$i',
      'ph': datar ? 6.2 : 5.5 + i * 0.05,
      'waterTemp': 24.0,
      'tds': 800,
      'created_at': DateTime.utc(2026, 10, 28, 6, i).toIso8601String(),
    },
];

Future<ApiService> _masuk(
  String level,
  List<Map<String, Object?>> chart,
) async {
  final api = ApiService(
    client: MockClient((req) async {
      switch (req.url.path) {
        case '/login':
          return _json({
            'token': 'tok',
            'user': {'username': 'tes', 'level': level},
          });
        case '/dashboard':
          return _json({
            'iotStatus': {'online': true},
            'water_control': {'mode': 'AUTO', 'valve_state': 'CLOSED'},
            'latest_sensor': {'ph': 6.2, 'tds': 800},
            'total_semai': 2,
            'semai_aktif': 1,
          });
        case '/monitoring/chart-data':
          return _json(chart);
      }
      return http.Response('{}', 404);
    }),
  );
  await api.login(username: 'tes', password: 'rahasia');
  return api;
}

Future<void> _pasang(WidgetTester tester, Widget isi) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: isi)),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('TrenBatang', () {
    testWidgets('memotong ke 14 bacaan terakhir', (tester) async {
      final api = await _masuk('admin', _bacaan(20));
      await _pasang(tester, TrenBatang(api: api));
      expect(find.byType(FractionallySizedBox), findsNWidgets(14));
      expect(
        find.textContaining('Terbaru', findRichText: true),
        findsOneWidget,
      );
    });

    testWidgets('daftar kosong menampilkan pesan, bukan grafik', (
      tester,
    ) async {
      final api = await _masuk('admin', const []);
      await _pasang(tester, TrenBatang(api: api));
      expect(find.text('Belum ada bacaan untuk ditampilkan.'), findsOneWidget);
      expect(find.byType(FractionallySizedBox), findsNothing);
    });

    testWidgets('deret datar (rentang nol) tetap tergambar tanpa galat', (
      tester,
    ) async {
      final api = await _masuk('admin', _bacaan(5, datar: true));
      await _pasang(tester, TrenBatang(api: api));
      expect(find.byType(FractionallySizedBox), findsNWidgets(5));
      expect(tester.takeException(), isNull);
    });
  });

  group('Menu Beranda per peran', () {
    Future<void> bukaMenu(WidgetTester tester, String level) async {
      final api = await _masuk(level, _bacaan(3));
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: DashboardPage(api: api, aktif: false)),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Ikon.menu));
      await tester.pumpAndSettle();
    }

    // Teks "Kontrol air" juga dipakai judul bagian di Beranda, jadi cari di dalam sheet saja.
    Finder diSheet(String teks) =>
        find.descendant(of: find.byType(SheetKaca), matching: find.text(teks));

    testWidgets('admin melihat Meja tanaman dan Kontrol air', (tester) async {
      await bukaMenu(tester, 'admin');
      expect(diSheet('Meja tanaman'), findsOneWidget);
      expect(diSheet('Kontrol air'), findsOneWidget);
    });

    testWidgets('petani tidak melihat Meja tanaman maupun Kontrol air', (
      tester,
    ) async {
      await bukaMenu(tester, 'user');
      expect(diSheet('Meja tanaman'), findsNothing);
      expect(diSheet('Kontrol air'), findsNothing);
      expect(diSheet('Sensor realtime'), findsOneWidget);
    });

    testWidgets('demo tidak melihat Asisten AI dan Meja tanaman', (
      tester,
    ) async {
      await bukaMenu(tester, 'demo');
      expect(diSheet('Asisten AI'), findsNothing);
      expect(diSheet('Meja tanaman'), findsNothing);
    });
  });
}
