import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/widgets/status_penampung.dart';

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {'content-type': 'application/json'},
);

void main() {
  testWidgets('polling tidak memanggil /meja lagi; tarik-segarkan memanggil', (
    tester,
  ) async {
    final dipanggil = <String>[];
    final api = ApiService(
      client: MockClient((req) async {
        dipanggil.add(req.url.path);
        return req.url.path == '/meja'
            ? _json([
                {'id_meja': '1', 'meja': 'Meja A1'},
              ])
            : _json(<Object>[]);
      }),
    );
    final kunci = GlobalKey<StatusPenampungPanelState>();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatusPenampungPanel(key: kunci, api: api, bolehBuka: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(dipanggil.where((p) => p == '/meja'), hasLength(1));

    await kunci.currentState!.muat(segarkanMeja: false);
    await kunci.currentState!.muat(segarkanMeja: false);
    expect(dipanggil.where((p) => p == '/meja'), hasLength(1));
    expect(dipanggil.where((p) => p == '/penampung-states'), hasLength(3));

    await kunci.currentState!.muat();
    expect(dipanggil.where((p) => p == '/meja'), hasLength(2));
  });
}
