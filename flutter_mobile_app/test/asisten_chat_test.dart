import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/asisten_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

void main() {
  test('riwayat: pertanyaan yang ditolak/galat dibuang bersama jawabannya',
      () {
    final r = riwayatUntukServer([
      (dariUser: true, teks: 'halo', dibuang: false),
      (dariUser: false, teks: 'Halo! Saya asisten kebun.', dibuang: false),
      (dariUser: true, teks: 'Siapa presiden Amerika?', dibuang: false),
      (dariUser: false, teks: 'Saya khusus hidroponik.', dibuang: true),
      (dariUser: true, teks: 'cek pH', dibuang: false),
      (dariUser: false, teks: 'Backend tidak terjangkau', dibuang: true),
      (dariUser: true, teks: 'kenapa daun menguning?', dibuang: false),
      (dariUser: false, teks: 'Kekurangan nutrisi.', dibuang: false),
    ]);
    expect(r.map((x) => x['teks']), [
      'halo',
      'Halo! Saya asisten kebun.',
      'kenapa daun menguning?',
      'Kekurangan nutrisi.',
    ]);
    expect(r.first['peran'], 'user');
    expect(r[1]['peran'], 'ai');
  });

  test('riwayat: maksimal 8 giliran terakhir', () {
    final r = riwayatUntukServer([
      for (var i = 0; i < 12; i++)
        (dariUser: i.isEven, teks: 'p$i', dibuang: false),
    ]);
    expect(r.length, 8);
    expect(r.first['teks'], 'p4');
  });

  test('429: pesan jeda dari server diteruskan apa adanya', () async {
    final api = ApiService(
      client: MockClient((_) async => http.Response(
            jsonEncode({
              'message':
                  'Terlalu banyak permintaan yang ditolak. Asisten dijeda sementara — coba lagi beberapa menit lagi.',
            }),
            429,
            headers: {'content-type': 'application/json'},
          )),
    );
    await expectLater(
      api.postJson('/api/ai/chat', {'pesan': 'x'}),
      throwsA(isA<ApiException>().having(
          (e) => e.message, 'message', contains('Asisten dijeda'))),
    );
  });

  testWidgets(
      'halaman: luar topik ditolak, pertanyaan berikutnya tanpa riwayat '
      'tertolak; jeda 429 tampil apa adanya', (tester) async {
    final kiriman = <Map<String, dynamic>>[];
    final api = ApiService(
      client: MockClient((req) async {
        final b = jsonDecode(req.body) as Map<String, dynamic>;
        kiriman.add(b);
        Map<String, dynamic> j;
        var kode = 200;
        if ('${b['pesan']}'.contains('presiden')) {
          j = {'jawaban': 'Saya khusus hidroponik.', 'sumber': 'tolak'};
        } else if ('${b['pesan']}'.contains('pH')) {
          j = {'jawaban': 'pH sekarang 6,3.', 'sumber': 'ollama'};
        } else {
          kode = 429;
          j = {'message': 'Asisten dijeda sementara — coba lagi beberapa menit lagi.'};
        }
        return http.Response(jsonEncode(j), kode,
            headers: {'content-type': 'application/json'});
      }),
    );
    await tester.pumpWidget(MaterialApp(home: AsistenPage(api: api)));
    await tester.pump(const Duration(milliseconds: 500));

    Future<void> kirim(String t) async {
      await tester.enterText(find.byType(TextField), t);
      await tester.testTextInput.receiveAction(TextInputAction.send);
      for (var i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    await kirim('Siapa presiden Amerika?');
    expect(find.text('Permintaan ditolak oleh pengaman'), findsOneWidget);

    await kirim('Bagaimana pH sekarang?');
    expect(kiriman[1]['riwayat'], isEmpty,
        reason: 'pertanyaan yang ditolak tidak boleh ikut terkirim');
    expect(find.text('pH sekarang 6,3.'), findsOneWidget);
    expect(find.text('Dijawab AI lokal — cek ulang sebelum bertindak'),
        findsOneWidget);

    await kirim('lagi');
    expect(find.textContaining('Asisten dijeda sementara'), findsOneWidget);
    expect((kiriman[2]['riwayat'] as List).length, 2);
  });
}
