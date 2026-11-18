import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/services/api_service.dart';

/// Balasan streaming: tiap baris NDJSON dikirim sebagai potongan terpisah.
MockClient _klien(List<String> potongan, {int status = 200, String jenis = 'application/x-ndjson'}) =>
    MockClient.streaming((req, _) async {
      expect(req.headers['Accept'], 'application/x-ndjson');
      return http.StreamedResponse(
        Stream.fromIterable(potongan.map(utf8.encode)),
        status,
        headers: {'content-type': jenis},
      );
    });

String _b(Map<String, Object?> o) => '${jsonEncode(o)}\n';

void main() {
  test('postAliran meneruskan kalimat bertahap lalu mengembalikan jawaban akhir', () async {
    final api = ApiService(
      baseUrl: 'http://x',
      client: _klien([
        _b({'tipe': 'kalimat', 'teks': 'pH aman.'}),
        '{"tipe":"kalimat",', '"teks":"Suhu normal."}\n',
        _b({'tipe': 'selesai', 'jawaban': 'pH aman. Suhu normal.', 'sumber': 'ollama'}),
      ]),
    );
    final terlihat = <List<String>>[];
    final d = await api.postAliran('/api/ai/chat', {'pesan': 'x'}, onKalimat: terlihat.add);
    expect(terlihat, [
      ['pH aman.'],
      ['pH aman.', 'Suhu normal.'],
    ]);
    expect(d['jawaban'], 'pH aman. Suhu normal.');
    expect(d['sumber'], 'ollama');
  });

  test('backend lama (JSON biasa) tetap terbaca', () async {
    final api = ApiService(
      baseUrl: 'http://x',
      client: _klien([jsonEncode({'jawaban': 'halo', 'sumber': 'sapaan'})], jenis: 'application/json'),
    );
    final d = await api.postAliran('/api/ai/chat', {'pesan': 'halo'}, onKalimat: (_) {});
    expect(d['jawaban'], 'halo');
  });

  test('aliran terputus tanpa baris selesai → ApiException', () async {
    final api = ApiService(
      baseUrl: 'http://x',
      client: _klien([_b({'tipe': 'kalimat', 'teks': 'pH aman.'})]),
    );
    expect(
      () => api.postAliran('/api/ai/chat', {'pesan': 'x'}, onKalimat: (_) {}),
      throwsA(isA<ApiException>()),
    );
  });

  test('galat 429 tetap jadi ApiException dengan status', () async {
    final api = ApiService(
      baseUrl: 'http://x',
      client: _klien([jsonEncode({'message': 'Tunggu sebentar.'})], status: 429, jenis: 'application/json'),
    );
    await expectLater(
      api.postAliran('/api/ai/chat', {'pesan': 'x'}, onKalimat: (_) {}),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'statusCode', 429)),
    );
  });
}
