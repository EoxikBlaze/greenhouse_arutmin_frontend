import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/beranda_petani.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {'content-type': 'application/json'},
);

Future<ApiService> _masuk(Map<String, Object?> dashboard) async {
  final api = ApiService(
    client: MockClient((req) async {
      switch (req.url.path) {
        case '/login':
          return _json({
            'token': 'tok',
            'user': {'username': 'tes', 'level': 'petani'},
          });
        case '/dashboard':
          return _json(dashboard);
      }
      return http.Response('{}', 404);
    }),
  );
  await api.login(username: 'tes', password: 'rahasia');
  return api;
}

Future<void> _tampil(WidgetTester t, ApiService api) async {
  t.view.physicalSize = const Size(390, 1200);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(
    MaterialApp(
      home: Scaffold(body: BerandaPetani(api: api, aktif: false)),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  testWidgets('Alat hidup: kartu "Aman" dengan angka koma', (t) async {
    final api = await _masuk({
      'iotStatus': {
        'online': true,
        'last_seen': DateTime.now().toUtc().toIso8601String(),
      },
      'latest_sensor': {
        'ph': 6.1,
        'tds': 640,
        'waterTemp': 26.2,
        'airTemp': 29.9,
      },
      'ambang': {
        'ph': {'min': 5.5, 'max': 6.8},
      },
    });
    await _tampil(t, api);
    expect(find.text('Aman'), findsNWidgets(4));
    expect(find.text('Data lama'), findsNothing);
    expect(find.textContaining('6,1'), findsOneWidget);
    expect(find.text('Data Sensor Lama'), findsNothing);
    expect(t.takeException(), isNull);
  });

  testWidgets('Alat mati: banner data lama dan semua kartu "Data lama"', (
    t,
  ) async {
    final api = await _masuk({
      'iotStatus': {
        'online': false,
        'last_seen': DateTime.now()
            .subtract(const Duration(hours: 3))
            .toUtc()
            .toIso8601String(),
      },
      'latest_sensor': {
        'ph': 6.1,
        'tds': 640,
        'waterTemp': 26.2,
        'airTemp': 29.9,
      },
    });
    await _tampil(t, api);
    expect(find.text('Data Sensor Lama'), findsOneWidget);
    expect(find.text('Data lama'), findsNWidgets(4));
    expect(find.text('Aman'), findsNothing);
    expect(t.takeException(), isNull);
  });

  testWidgets('Nilai kosong: tanda strip dan "Belum ada data", bukan angka', (
    t,
  ) async {
    final api = await _masuk({
      'iotStatus': {'online': true},
      'latest_sensor': {'ph': 6.1},
    });
    await _tampil(t, api);
    expect(find.text('Belum ada data'), findsNWidgets(3));
    expect(find.textContaining('—'), findsNWidgets(3));
    expect(find.text('Aman'), findsOneWidget);
    expect(t.takeException(), isNull);
  });

  testWidgets('Di luar batas: kartu "Perlu dicek"', (t) async {
    final api = await _masuk({
      'iotStatus': {
        'online': true,
        'last_seen': DateTime.now().toUtc().toIso8601String(),
      },
      'latest_sensor': {
        'ph': 9.4,
        'tds': 640,
        'waterTemp': 26.2,
        'airTemp': 29.9,
      },
      'ambang': {
        'ph': {'min': 5.5, 'max': 6.8},
      },
    });
    await _tampil(t, api);
    expect(find.textContaining('Perlu dicek'), findsOneWidget);
    expect(find.text('Aman'), findsNWidgets(3));
    expect(t.takeException(), isNull);
  });
}
