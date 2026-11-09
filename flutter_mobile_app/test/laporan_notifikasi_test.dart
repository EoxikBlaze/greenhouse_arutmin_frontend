import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/laporan_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/laporan_pdf.dart';
import 'package:flutter_mobile_app/services/notifikasi_service.dart';

http.Response _json(Object body) => http.Response(
  jsonEncode(body),
  200,
  headers: {'content-type': 'application/json'},
);

const _ringkasan = {
  'status': true,
  'dibuat': '2026-11-09T10:00:00Z',
  'sensor': {'bacaan': 120, 'ph_rata': 6.1, 'ph_min': 5.8, 'ph_maks': 6.4, 'tds_rata': 900},
  'alert': {'total': 3, 'aktif': 1, 'kritis': 0},
  'panen': {'berhasil': 18, 'gagal': 2, 'kali': 1},
  'tanam': {'semai_baru': 2},
  'batch_berjalan': [
    {
      'tipe': 'pendewasaan',
      'id': 7,
      'varietas': 'Melon',
      'meja': 'Meja A',
      'prediksi': {'tgl_prediksi': '2026-11-11', 'sisa_hari': 2, 'status': 'segera'},
    },
    {'tipe': 'semai', 'id': 9, 'varietas': 'Selada', 'meja': 'Meja B', 'prediksi': null},
  ],
};

const _saran = {
  'status': true,
  'saran': [
    {'sensor': 'ph', 'status': 'perhatian', 'saran': 'pH 6.7 naik menuju batas 7.'},
    {'sensor': 'tds', 'status': 'aman', 'saran': 'TDS 900 ppm stabil.'},
  ],
  'catatan': 'Saran saja. Tidak ada dosis yang dijalankan.',
};

void main() {
  group('saringAlertBaru', () {
    final rows = <Map<Object?, Object?>>[
      {'id': 12, 'acknowledged': false},
      {'id': 11, 'acknowledged': true},
      {'id': 10, 'acknowledged': false},
    ];

    test('panggilan pertama hanya menetapkan acuan, tanpa notifikasi', () {
      final h = saringAlertBaru(rows, null);
      expect(h.baru, isEmpty);
      expect(h.idTerakhir, 12);
    });

    test('hanya id baru yang belum ditangani', () {
      final h = saringAlertBaru(rows, 10);
      expect(h.baru.map((r) => r['id']), [12]);
      expect(h.idTerakhir, 12);
    });

    test('daftar kosong tidak menurunkan acuan', () {
      expect(saringAlertBaru(const [], 12).idTerakhir, 12);
    });
  });

  test('rentangPeriode: 7 hari, bulan ini, semua', () {
    final kini = DateTime(2026, 11, 9, 15);
    final r7 = rentangPeriode(0, kini);
    expect((r7.dari, r7.sampai), ('2026-11-03', '2026-11-09'));
    expect(rentangPeriode(2, kini).dari, '2026-11-01');
    expect(rentangPeriode(3, kini).dari, isNull);
  });

  test('amanPdf mengganti karakter non-ASCII', () {
    expect(amanPdf('5–7 → aman ±3'), '5-7 -> aman +/-3');
    expect(amanPdf(null), '-');
  });

  test('buatPdfLaporan menghasilkan berkas PDF', () async {
    final bytes = await buatPdfLaporan(
      _ringkasan,
      saran: (_saran['saran']! as List).cast<Map<Object?, Object?>>(),
    );
    expect(utf8.decode(bytes.sublist(0, 5), allowMalformed: true), '%PDF-');
  });

  testWidgets('LaporanPage: perkiraan panen, saran, tanpa tombol eksekusi dosis', (tester) async {
    final path = <String>[];
    final api = ApiService(
      client: MockClient((req) async {
        path.add(req.url.toString());
        if (req.url.path == '/api/analitik/ringkasan') return _json(_ringkasan);
        if (req.url.path == '/api/analitik/saran-dosis') return _json(_saran);
        return http.Response('{}', 404);
      }),
      baseUrl: 'http://uji',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: LaporanPage(api: api, kini: DateTime(2026, 11, 9))),
      ),
    );
    await tester.pumpAndSettle();

    expect(path.first, contains('dari=2026-10-11&sampai=2026-11-09'));
    expect(find.textContaining('Melon · Meja A'), findsOneWidget);
    expect(find.text('Segera'), findsOneWidget);
    expect(find.textContaining('durasi siklus belum diatur'), findsOneWidget);
    expect(find.textContaining('naik menuju batas'), findsOneWidget);
    expect(find.textContaining('Tidak ada dosis yang dijalankan'), findsOneWidget);
    expect(find.textContaining('Unduh PDF'), findsOneWidget);
    expect(find.textContaining('Jalankan'), findsNothing);
  });
}
