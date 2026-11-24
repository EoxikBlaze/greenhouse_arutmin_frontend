import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/peringatan_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

void main() {
  testWidgets('PeringatanPage: menampilkan alert logs, filter segmen, dan tandai selesai',
      (tester) async {
    final postPaths = <String>[];

    final api = ApiService(
      client: MockClient((request) async {
        if (request.method == 'GET') {
          if (request.url.path == '/alert-logs') {
            return _json({
              'status': true,
              'total': 2,
              'aktif': 1,
              'data': [
                {
                  'id': 42,
                  'type': 'sensor_ph',
                  'value': 'Nilai pH 7.8 melebihi batas 6.5',
                  'severity': 'critical',
                  'acknowledged': false,
                  'created_at': '2026-11-07T08:00:00.000Z',
                },
                {
                  'id': 41,
                  'type': 'sensor_ec',
                  'value': 'EC normal 1200 ppm',
                  'severity': 'info',
                  'acknowledged': true,
                  'created_at': '2026-11-06T10:00:00.000Z',
                },
              ],
            }, 200);
          }
          if (request.url.path == '/iot-v41/state') {
            return _json({
              'status': true,
              'params': {
                'tahan_dosing': false,
                'pemeliharaan': false,
                'ec_setpoint': 1200,
              },
            }, 200);
          }
        }
        if (request.method == 'POST') {
          postPaths.add(request.url.path);
          if (request.url.path == '/login') {
            return _json({
              'token': 'tok-admin',
              'user': {'level': 'admin', 'username': 'admin'},
            }, 200);
          }
          if (request.url.path == '/alert-logs/42/ack') {
            return _json({'status': true, 'message': 'Peringatan ditandai selesai.'}, 200);
          }
          if (request.url.path == '/iot-v41/reset-peringatan') {
            return _json({'status': true, 'message': 'Permintaan reset dicatat.'}, 200);
          }
        }
        return _json({'status': false}, 404);
      }),
    );
    await api.login(username: 'admin', password: 'secret');

    await tester.pumpWidget(
      MaterialApp(
        home: PeringatanPage(api: api),
      ),
    );
    await tester.pumpAndSettle();

    // 1. Header dan ringkasan
    expect(find.text('Peringatan'), findsWidgets);
    expect(find.text('Peringatan aktif'), findsOneWidget);
    expect(find.text('Total tercatat'), findsOneWidget);

    // 2. Alert items
    expect(find.text('SENSOR_PH'), findsOneWidget);
    expect(find.text('Nilai pH 7.8 melebihi batas 6.5'), findsOneWidget);
    expect(find.text('KRITIS'), findsOneWidget);
    expect(find.text('aktif'), findsOneWidget);
    expect(find.text('tandai selesai'), findsOneWidget);

    // 3. Filter 'Aktif'
    await tester.tap(find.text('Aktif'));
    await tester.pumpAndSettle();
    expect(find.text('SENSOR_PH'), findsOneWidget);
    expect(find.text('SENSOR_EC'), findsNothing);

    // 4. Filter 'Selesai'
    await tester.tap(find.text('Selesai'));
    await tester.pumpAndSettle();
    expect(find.text('SENSOR_PH'), findsNothing);
    expect(find.text('SENSOR_EC'), findsOneWidget);

    // 5. Kembali ke 'Semua' dan klik 'tandai selesai'
    await tester.tap(find.text('Semua'));
    await tester.pumpAndSettle();
    expect(find.text('tandai selesai'), findsOneWidget);

    await tester.ensureVisible(find.text('tandai selesai'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('tandai selesai'));
    await tester.pumpAndSettle();

    expect(postPaths.contains('/alert-logs/42/ack'), isTrue);
  });
}
