import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/models/penampung_state.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/widgets/status_penampung.dart';

http.Response _json(Object body, int status) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

/// Baris GET /penampung-states — bigint & numeric datang sebagai teks dari pg.
Map<String, dynamic> _state(String id, {bool lock = false}) => {
  'id_meja': id,
  'status_lock': lock,
  'lock_alasan': lock ? 'retry habis' : null,
  'lock_sejak': lock ? '2026-10-24T03:15:00.000Z' : null,
  'mode_pemeliharaan': false,
  'kejadian_dosis_hari': lock ? 8 : 2,
  'volume_ab_hari_ml': lock ? '120.50' : '10.00',
  'volume_ph_hari_ml': '4.00',
};

final _meja = [
  {'id_meja': '1', 'meja': 'Meja A1'},
  {'id_meja': '2', 'meja': 'Meja B2'},
];

Future<void> _pasang(
  WidgetTester tester,
  ApiService api,
  bool bolehBuka,
) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: StatusPenampungPanel(api: api, bolehBuka: bolehBuka),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('gabungPenampung', () {
    test('memberi nama meja & membaca angka teks dari pg', () {
      final hasil = gabungPenampung([
        _state('2', lock: true),
        _state('9'),
      ], _meja);

      expect(hasil, hasLength(2));
      expect(hasil[0].idMeja, '2');
      expect(hasil[0].nama, 'Meja B2');
      expect(hasil[0].terkunci, isTrue);
      expect(hasil[0].alasan, 'retry habis');
      expect(hasil[0].kejadianHari, 8);
      expect(hasil[0].volumeAbMl, 120.5);
      // id tanpa baris meja → nama cadangan.
      expect(hasil[1].nama, 'Penampung #9');
      expect(hasil[1].terkunci, isFalse);
    });
  });

  testWidgets('menampilkan badge LOCK dan Aman beserta alasannya', (
    tester,
  ) async {
    final api = ApiService(
      client: MockClient(
        (req) async => req.url.path == '/meja'
            ? _json(_meja, 200)
            : _json([_state('1'), _state('2', lock: true)], 200),
      ),
    );

    await _pasang(tester, api, true);

    expect(find.text('Meja A1'), findsOneWidget);
    expect(find.text('Meja B2'), findsOneWidget);
    expect(find.text('Aman'), findsOneWidget);
    expect(find.text('LOCK'), findsOneWidget);
    expect(find.textContaining('retry habis'), findsOneWidget);
    expect(find.textContaining('8 kejadian'), findsOneWidget);
    // Tombol hanya pada penampung yang terkunci.
    expect(find.text('Buka kunci'), findsOneWidget);
  });

  testWidgets('akun lihat-saja (demo) tidak melihat tombol Buka kunci', (
    tester,
  ) async {
    final api = ApiService(
      client: MockClient(
        (req) async => req.url.path == '/meja'
            ? _json(_meja, 200)
            : _json([_state('2', lock: true)], 200),
      ),
    );

    await _pasang(tester, api, false);

    expect(find.text('LOCK'), findsOneWidget);
    expect(find.text('Buka kunci'), findsNothing);
  });

  testWidgets('admin membuka kunci lewat konfirmasi lalu daftar dimuat ulang', (
    tester,
  ) async {
    var terkunci = true;
    String? jalurPost;
    final api = ApiService(
      client: MockClient((req) async {
        if (req.method == 'POST') {
          jalurPost = req.url.path;
          terkunci = false;
          return _json({'status': true, 'status_lock': false}, 200);
        }
        if (req.url.path == '/meja') return _json(_meja, 200);
        return _json([_state('2', lock: terkunci)], 200);
      }),
    );

    await _pasang(tester, api, true);
    await tester.tap(find.text('Buka kunci'));
    await tester.pumpAndSettle();

    // Dialog mengingatkan untuk memeriksa penyebab dulu.
    expect(find.textContaining('Periksa penyebab'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Buka kunci'));
    await tester.pumpAndSettle();

    expect(jalurPost, '/api/aktuator/penampung/2/buka-kunci');
    expect(find.text('LOCK Meja B2 dibuka.'), findsOneWidget);
    expect(find.text('Aman'), findsOneWidget);
  });

  testWidgets('batal di dialog tidak mengirim perintah', (tester) async {
    var adaPost = false;
    final api = ApiService(
      client: MockClient((req) async {
        if (req.method == 'POST') adaPost = true;
        if (req.url.path == '/meja') return _json(_meja, 200);
        return _json([_state('2', lock: true)], 200);
      }),
    );

    await _pasang(tester, api, true);
    await tester.tap(find.text('Buka kunci'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Batal'));
    await tester.pumpAndSettle();

    expect(adaPost, isFalse);
    expect(find.text('LOCK'), findsOneWidget);
  });

  testWidgets('409 dari server tampil sebagai pesan galat', (tester) async {
    final api = ApiService(
      client: MockClient((req) async {
        if (req.method == 'POST') {
          return _json({'message': 'Penampung tidak sedang terkunci.'}, 409);
        }
        if (req.url.path == '/meja') return _json(_meja, 200);
        return _json([_state('2', lock: true)], 200);
      }),
    );

    await _pasang(tester, api, true);
    await tester.tap(find.text('Buka kunci'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Buka kunci'));
    await tester.pumpAndSettle();

    expect(find.text('Penampung tidak sedang terkunci.'), findsOneWidget);
  });
}
