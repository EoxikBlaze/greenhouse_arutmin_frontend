import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/models/meja.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

/// Payload contoh /meja — 13 kolom persis seperti kontrak backend.
Map<String, dynamic> _barisMeja() => {
      'id_meja': '1',
      'meja': 'Meja A1',
      'jumlah_lubang': 20,
      'jenis_talang': 'NFT',
      'kapasitas_penampung_l': 100,
      'jumlah_talang': 4,
      'lubang_per_talang': 5,
      'panjang_talang_m': 6.5,
      'laju_per_talang_lpm': 1.25,
      'kenaikan_air_cm': 40,
      'created_at': '2026-10-01T00:00:00.000Z',
      'updated_at': '2026-10-02T00:00:00.000Z',
      'expires_at': null,
    };

Map<String, dynamic> _barisMonitoring() => {
      'id': '100012',
      'id_meja': '1',
      'waterTemp': 26.9,
      'ph': 6.5,
      'tds': 1200,
      'airTemp': 31,
      'humidity': 66,
      'water_level': 'Sedang',
      'ec_ms_cm': 1.4,
      'created_at': '2026-10-14T22:43:58.000Z',
      'updated_at': '2026-10-14T22:43:58.000Z',
    };

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

void main() {
  group('ApiService.login', () {
    test('sukses: menyimpan token dan mengirim JSON yang benar', () async {
      late http.Request seen;
      final api = ApiService(
        client: MockClient((req) async {
          seen = req;
          return _json({
            'status': true,
            'message': 'Login berhasil.',
            'token': 'tok-abc',
            'user': {'username': 'admin', 'level': 'admin'},
          }, 200);
        }),
      );

      final token = await api.login(username: 'admin', password: 'rahasia');

      expect(token, 'tok-abc');
      expect(api.isLoggedIn, isTrue);
      expect(api.token, 'tok-abc');
      expect(seen.method, 'POST');
      expect(seen.url.path, '/login');
      expect(seen.headers['content-type'], contains('application/json'));
      expect(jsonDecode(seen.body),
          {'username': 'admin', 'password': 'rahasia'});
    });

    test('422 salah password: pesan ramah dari backend', () async {
      final api = ApiService(
        client: MockClient((_) async => _json({
              'message': 'Username / Password salah.',
              'errors': {
                'username': ['Username / Password salah.']
              },
              'input': {'username': 'admin'},
            }, 422)),
      );

      await expectLater(
        api.login(username: 'admin', password: 'salah'),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 422)
            .having((e) => e.message, 'message',
                contains('Username / Password salah.'))),
      );
      expect(api.isLoggedIn, isFalse);
    });

    test('422 validasi field: pesan Indonesia dari kontrak backend', () async {
      final api = ApiService(
        client: MockClient((_) async => _json({
              'message': 'Data tidak valid.',
              'errors': {
                'username': ['Nama pengguna wajib diisi (min 3 karakter).']
              },
            }, 422)),
      );

      await expectLater(
        api.login(username: 'x', password: 'y'),
        throwsA(isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Nama pengguna wajib diisi (min 3 karakter).'))),
      );
    });
  });

  group('ApiService.fetchMeja', () {
    test('sukses: 13 kolom terurai + header Authorization terkirim', () async {
      late http.Request seen;
      final api = ApiService(
        client: MockClient((req) async {
          seen = req;
          if (req.url.path == '/login') {
            return _json({'status': true, 'token': 'tok-abc'}, 200);
          }
          return _json([_barisMeja()], 200);
        }),
      );
      await api.login(username: 'admin', password: 'rahasia');

      final hasil = await api.fetchMeja();

      expect(seen.url.path, '/meja');
      expect(seen.headers['Authorization'], 'Bearer tok-abc');
      expect(hasil, hasLength(1));

      final m = hasil.single;
      expect(Meja.columns, hasLength(13));
      expect(m.idMeja, '1');
      expect(m.meja, 'Meja A1');
      expect(m.jumlahLubang, 20);
      expect(m.jenisTalang, 'NFT');
      expect(m.kapasitasPenampungL, 100);
      expect(m.jumlahTalang, 4);
      expect(m.lubangPerTalang, 5);
      expect(m.panjangTalangM, 6.5);
      expect(m.lajuPerTalangLpm, 1.25);
      expect(m.kenaikanAirCm, 40);
      expect(m.createdAt, '2026-10-01T00:00:00.000Z');
      expect(m.updatedAt, '2026-10-02T00:00:00.000Z');
      expect(m.expiresAt, isNull);
    });

    test('401: pesan ramah, token dibersihkan, onUnauthorized terpanggil',
        () async {
      var dipanggil = false;
      final api = ApiService(
        client: MockClient(
            (_) async => _json({'message': 'Tidak terautentikasi.'}, 401)),
      );
      api.onUnauthorized = () => dipanggil = true;

      await expectLater(
        api.fetchMeja(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 401)
            .having((e) => e.message, 'message', contains('login ulang'))),
      );
      expect(dipanggil, isTrue);
      expect(api.isLoggedIn, isFalse);
    });

    test('403: pesan akses ditolak yang ramah', () async {
      final api = ApiService(
        client: MockClient(
            (_) async => _json({'message': 'Akses ditolak.'}, 403)),
      );

      await expectLater(
        api.fetchMeja(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 403)
            .having((e) => e.message, 'message', contains('Akses ditolak'))),
      );
    });

    test('422: pesan validasi backend yang ramah', () async {
      final api = ApiService(
        client: MockClient((_) async => _json({
              'message': 'Data tidak valid.',
              'errors': {
                'id_meja': ['id_meja tidak terdaftar.']
              },
            }, 422)),
      );

      await expectLater(
        api.fetchMeja(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 422)
            .having((e) => e.message, 'message',
                contains('id_meja tidak terdaftar.'))),
      );
    });

    test('server merespons bukan JSON/list: tetap error yang jelas', () async {
      final api = ApiService(
        client: MockClient((_) async =>
            http.Response('<html></html>', 200,
                headers: {'content-type': 'text/html'})),
      );

      await expectLater(
        api.fetchMeja(),
        throwsA(isA<ApiException>().having(
            (e) => e.message, 'message', contains('tidak sesuai kontrak'))),
      );
    });
  });

  group('ApiService.fetchMonitoring', () {
    test('sukses: daftar riwayat terurai', () async {
      late http.Request seen;
      final api = ApiService(
        client: MockClient((req) async {
          seen = req;
          if (req.url.path == '/login') {
            return _json({'status': true, 'token': 'tok-abc'}, 200);
          }
          return _json([_barisMonitoring()], 200);
        }),
      );
      await api.login(username: 'admin', password: 'rahasia');

      final hasil = await api.fetchMonitoring();

      expect(seen.url.path, '/monitoring/chart-data');
      expect(seen.headers['Authorization'], 'Bearer tok-abc');
      expect(hasil, hasLength(1));
      final e = hasil.single;
      expect(e.id, '100012');
      expect(e.waterTemp, 26.9);
      expect(e.ph, 6.5);
      expect(e.tds, 1200);
      expect(e.airTemp, 31);
      expect(e.humidity, 66);
      expect(e.waterLevel, 'Sedang');
      expect(e.createdAt, '2026-10-14T22:43:58.000Z');
    });
  });

  group('ApiService kondisi jaringan', () {
    test('server mati: pesan "Backend tidak terjangkau"', () async {
      final api = ApiService(
        client: MockClient((_) =>
            throw http.ClientException('Connection refused')),
      );

      await expectLater(
        api.fetchMeja(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', isNull)
            .having(
                (e) => e.message, 'message', contains('Backend tidak terjangkau'))),
      );
    });

    test('timeout: pesan "Backend tidak terjangkau", statusCode null', () async {
      final api = ApiService(
        timeout: const Duration(milliseconds: 50),
        client: MockClient((_) async => await Future.delayed(
            const Duration(seconds: 2), () => _json({'ok': true}, 200))),
      );

      await expectLater(
        api.fetchLatestSensor(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', isNull)
            .having(
                (e) => e.message, 'message', contains('Backend tidak terjangkau'))),
      );
    });
  });

  group('ApiService.fetchLatestSensor (publik)', () {
    test('sukses tanpa token', () async {
      late http.Request seen;
      final api = ApiService(
        client: MockClient((req) async {
          seen = req;
          return _json({
            'is_online': true,
            'sensor': {'ph': 6.4},
          }, 200);
        }),
      );

      final data = await api.fetchLatestSensor();
      expect(seen.url.path, '/api/latest-sensor');
      expect(seen.headers.containsKey('Authorization'), isFalse);
      expect(data['is_online'], isTrue);
    });

    test('gagal: 500 diberi pesan ramah', () async {
      final api = ApiService(
        client: MockClient((_) async => _json({'message': 'Ups'}, 500)),
      );

      await expectLater(
        api.fetchLatestSensor(),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 500)
            .having((e) => e.message, 'message', contains('Server sedang bermasalah'))),
      );
    });
  });
}
