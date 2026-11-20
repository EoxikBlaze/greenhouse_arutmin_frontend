import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/analisis_harian_panel.dart';
import 'package:flutter_mobile_app/pages/asisten_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/notifikasi_service.dart';

const _lap = {
  'id': 5,
  'tanggal': '2026-11-17',
  'pemicu': 'jadwal',
  'isi': {
    'judul': 'Analisis harian 2026-11-17',
    'prioritas': 'tinggi',
    'ringkasan_utama': 'Periksa alat sensor.',
    'bagian': [
      {
        'judul': 'Kondisi sensor terkini',
        'butir': ['pH: tidak tersedia.'],
      },
      {
        'judul': 'Saran',
        'butir': ['Koreksi nutrisi/pH hanya lewat alur persetujuan dosing.'],
      },
    ],
  },
};

ApiService _api({bool kosong = false}) => ApiService(
  client: MockClient((req) async {
    final p = req.url.path;
    Object? data;
    if (p.endsWith('/terbaru')) {
      data = kosong ? null : _lap;
    } else if (p.endsWith('/analisis-harian')) {
      data = kosong
          ? []
          : [
              {'id': 5, 'tanggal': '2026-11-17', 'prioritas': 'tinggi'},
            ];
    }
    return http.Response(
      jsonEncode({'status': true, 'data': data}),
      200,
      headers: {'content-type': 'application/json'},
    );
  }),
);

Widget _bungkus(Widget w) => MaterialApp(home: Scaffold(body: w));

void main() {
  test('notifikasi analisis: sekali per tanggal', () {
    expect(analisisPerluNotif(null, null), isNull);
    expect(analisisPerluNotif(_lap, null), '2026-11-17');
    expect(analisisPerluNotif(_lap, '2026-11-17'), isNull);
    expect(analisisPerluNotif(_lap, '2026-11-16'), '2026-11-17');
  });

  testWidgets('panel menampilkan laporan terbaru per bagian', (t) async {
    await t.pumpWidget(_bungkus(AnalisisHarianPanel(api: _api())));
    await t.pumpAndSettle();
    expect(find.text('Analisis harian 2026-11-17'), findsOneWidget);
    expect(find.text('KONDISI SENSOR TERKINI'), findsOneWidget);
    expect(find.text('pH: tidak tersedia.'), findsOneWidget);
    expect(find.textContaining('PRIORITAS TINGGI'), findsOneWidget);
    // bukan admin → tanpa tombol jalankan
    expect(find.text('Jalankan sekarang'), findsNothing);
  });

  testWidgets('panel kosong', (t) async {
    await t.pumpWidget(_bungkus(AnalisisHarianPanel(api: _api(kosong: true))));
    await t.pumpAndSettle();
    expect(find.textContaining('Belum ada analisis'), findsOneWidget);
  });

  testWidgets('asisten: tab Analisis Harian di dalam chatbot', (t) async {
    await t.pumpWidget(
      MaterialApp(home: AsistenPage(api: _api(), tanpaAppBar: true)),
    );
    await t.pump();
    await t.tap(find.text('Analisis Harian'));
    await t.pumpAndSettle();
    expect(find.byType(AnalisisHarianPanel), findsOneWidget);
    expect(find.text('Analisis harian 2026-11-17'), findsOneWidget);
  });
}
