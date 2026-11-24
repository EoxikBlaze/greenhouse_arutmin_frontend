import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/setup_wizard_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/setup_service.dart';

class _MemoriSetup implements PenyimpanSetup {
  final Map<String, String> data = {};

  @override
  Future<String?> baca(String kunci) async => data[kunci];

  @override
  Future<void> tulis(String kunci, String? isi) async {
    if (isi == null) {
      data.remove(kunci);
    } else {
      data[kunci] = isi;
    }
  }
}

ApiService _buatMockApi({bool online = true}) {
  final client = MockClient((req) async {
    if (req.url.path == '/login') {
      return http.Response(
        jsonEncode({
          'token':
              'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImxldmVsIjoiYWRtaW4ifQ.sig',
          'user': {'id': 1, 'username': 'admin', 'level': 'admin'},
        }),
        200,
      );
    }
    if (req.url.path == '/iot-v41/setup-status') {
      return http.Response(
        jsonEncode({
          'id_meja': 1,
          'setup_selesai': false,
          'setup_progres': {'langkah_aktif': 0},
        }),
        200,
      );
    }
    if (req.url.path == '/iot-v41/state') {
      return http.Response(
        jsonEncode({
          'kondisi': {
            'basi': false,
            'umur_detik': 5,
            'ph': 6.86,
            'ph_volt': 2.51,
            'ec_us': 1413,
          },
        }),
        200,
      );
    }
    if (req.url.path == '/api/aktuator/status') {
      return http.Response(
        jsonEncode({
          'estop': false,
          'perangkat': [
            {
              'kode': 'aktuator-01',
              'peran': 'gabungan',
              'online': online,
              'estop_aktif': false,
              'estop_fisik': false,
            },
          ],
          'v6': {
            'level_air': 'RENDAH',
            'mode': 'SIAP',
            'pemeliharaan': '0',
            'kunci': '',
          },
        }),
        200,
      );
    }
    if (req.url.path == '/api/aktuator/perintah') {
      return http.Response(jsonEncode({'data': <Map<String, dynamic>>[]}), 200);
    }
    if (req.url.path == '/tanam/pilihan') {
      return http.Response(
        jsonEncode({
          'tanaman': [
            {'id': 1, 'nama': 'Melon Inthanon'},
          ],
          'meja': [
            {'id': 1, 'nama': 'Meja 1'},
          ],
        }),
        200,
      );
    }
    if (req.url.path == '/tanam') {
      return http.Response(jsonEncode({'list': <Map<String, dynamic>>[]}), 200);
    }
    return http.Response('{}', 200);
  });
  return ApiService(client: client, baseUrl: 'http://localhost:8000');
}

Future<void> _pasang(WidgetTester t, {VoidCallback? onLewati}) async {
  t.view.physicalSize = const Size(900, 1400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  final api = _buatMockApi();
  await api.login(username: 'admin', password: 'secret');
  await t.pumpWidget(
    MaterialApp(
      home: SetupWizardPage(
        api: api,
        setupService: SetupService(penyimpan: _MemoriSetup()),
        onSelesai: (_) {},
        onKeluar: () {},
        onLewati: onLewati,
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  testWidgets('Wizard punya tombol Lewati setup yang memanggil onLewati', (
    t,
  ) async {
    var dilewati = 0;
    await _pasang(t, onLewati: () => dilewati++);
    expect(find.text('Lewati setup'), findsOneWidget);
    await t.tap(find.text('Lewati setup'));
    await t.pump();
    expect(dilewati, 1);
  });

  testWidgets('Tanpa onLewati tombol tidak tampil (mode ulang di Pengaturan)', (
    t,
  ) async {
    await _pasang(t);
    expect(find.text('Lewati setup'), findsNothing);
  });
}
