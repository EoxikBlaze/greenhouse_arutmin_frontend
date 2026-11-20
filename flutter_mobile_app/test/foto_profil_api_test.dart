import 'dart:typed_data';

import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test(
    'getBytes /profil/foto: 200 mengembalikan byte gambar apa adanya',
    () async {
      final gambar = Uint8List.fromList([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
      final api = ApiService(
        client: MockClient((req) async {
          expect(req.url.path, '/profil/foto');
          return http.Response.bytes(gambar, 200);
        }),
      );
      expect(await api.getBytes('/profil/foto'), gambar);
    },
  );

  test(
    'getBytes /profil/foto: 404 (belum ada foto) menjadi ApiException 404',
    () async {
      final api = ApiService(
        client: MockClient(
          (_) async =>
              http.Response('{"message":"Belum ada foto profil."}', 404),
        ),
      );
      await expectLater(
        api.getBytes('/profil/foto'),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 404)),
      );
    },
  );
}
