import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/riwayat_monitoring_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {'content-type': 'application/json'},
);

Future<void> _pasang(WidgetTester tester, int jumlah) async {
  final api = ApiService(
    client: MockClient(
      (req) async => _json([
        for (var i = 0; i < jumlah; i++)
          {
            'id': '$i',
            'id_meja': '1',
            'ph': 6.2,
            'created_at': '2026-10-22T14:05:00.000Z',
          },
      ]),
    ),
  );
  await tester.pumpWidget(MaterialApp(home: RiwayatMonitoringPage(api: api)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('100 catatan: 30 tampil dulu, tombol menambah 30', (
    tester,
  ) async {
    await _pasang(tester, 100);
    expect(
      find.text('Menampilkan 30 dari 100 catatan sensor terbaru'),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(
      find.text('Tampilkan 30 lagi'),
      400,
      scrollable: find.byType(Scrollable).first,
    );

    await tester.tap(find.text('Tampilkan 30 lagi'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Menampilkan 60 dari 100 catatan sensor terbaru'),
      -400,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.text('Menampilkan 60 dari 100 catatan sensor terbaru'),
      findsOneWidget,
    );
  });

  testWidgets('catatan sedikit: tanpa tombol tambah', (tester) async {
    await _pasang(tester, 5);
    expect(find.text('Tampilkan 30 lagi'), findsNothing);
    expect(
      find.text('Menampilkan 5 dari 5 catatan sensor terbaru'),
      findsOneWidget,
    );
  });

  testWidgets('tanpa catatan: pesan kosong dalam Panel', (tester) async {
    await _pasang(tester, 0);
    expect(find.text('Belum ada data monitoring.'), findsOneWidget);
  });
}
