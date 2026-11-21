import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/pantau_semai_page.dart';
import 'package:flutter_mobile_app/pages/pengaturan_page.dart';
import 'package:flutter_mobile_app/pages/setup_wizard_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/setup_service.dart';
import 'package:flutter_mobile_app/widgets/wizard_baru/kepala_wizard.dart';

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
          'token': 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImxldmVsIjoiYWRtaW4ifQ.sig',
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

void main() {
  test('hitungUjiLabNutrisi menghitung perubahan PPM, persen, server & v6', () {
    final h = hitungUjiLabNutrisi(
      volumeSampel: 1,
      ppmAwal: 100,
      mlA: 5,
      mlB: 5,
      ppmAkhir: 1100,
    );
    expect(h, isNotNull);
    expect(h!.perubahanPpm, 1000);
    expect(h.perubahanPersen, 1000);
    expect(h.ppmPerMlServer, 100);
    expect(h.ppmPerMlAbV6, 200);

    expect(
      hitungUjiLabNutrisi(
        volumeSampel: 1,
        ppmAwal: 500,
        mlA: 5,
        mlB: 5,
        ppmAkhir: 400,
      ),
      isNull,
    );
  });

  test('cekPrasyaratSelesai menolak bila prasyarat wajib belum lengkap', () {
    const kosong = SetupProgress();
    final r1 = cekPrasyaratSelesai(kosong);
    expect(r1.wajibTerpenuhi, isFalse);
    expect(r1.kurangWajib.length, greaterThanOrEqualTo(4));

    final lengkap = SetupProgress(
      tandon: {'volume_l': 100, 'konfigurasi_dikonfirmasi': true},
      ujiLab: {'tersimpan_server': true, 'dikonfirmasi_alat': true},
      tutorialSemai: {
        for (final s in sopSemaiMelonResmi) s.kode: true,
      },
      catatanSemai: {'jumlah_disemai': 24},
    );
    final r2 = cekPrasyaratSelesai(lengkap);
    expect(r2.wajibTerpenuhi, isTrue);
    expect(r2.kurangWajib, isEmpty);
  });

  test('SetupService fallback ke cache lokal saat server 404', () async {
    final mem = _MemoriSetup();
    final client = MockClient((_) async => http.Response('{}', 404));
    final api = ApiService(client: client, baseUrl: 'http://localhost:8000');
    final svc = SetupService(penyimpan: mem);

    const p = SetupProgress(
      idMeja: 1,
      langkahAktif: 2,
      tandon: {'volume_l': 80},
    );
    final saved = await svc.simpanProgres(api, p);
    expect(saved.sinkronServer, isFalse);

    final loaded = await svc.muatStatusSetup(api, idMeja: 1);
    expect(loaded.langkahAktif, 2);
    expect(loaded.volumeTandonL, 80);
  });

  testWidgets('SetupWizardPage menampilkan konflik buffer pH, peringatan isi air, dan SOP semai', (tester) async {
    final api = _buatMockApi();
    await api.login(username: 'admin', password: 'secret');
    final svc = SetupService(penyimpan: _MemoriSetup());

    await tester.pumpWidget(
      MaterialApp(
        home: SetupWizardPage(
          api: api,
          setupService: svc,
          onSelesai: (_) {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Perbedaan Acuan Buffer'), findsOneWidget);
    expect(find.text('Kalibrasi sensor pH'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(StepperBulat),
        matching: find.text('2'),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.textContaining('Pengisian air wajib dipantau. Tetap berada di dekat tandon'),
      findsOneWidget,
    );

    await tester.tap(find.text('Lanjut'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lanjut'));
    await tester.pumpAndSettle();
    expect(find.textContaining('1 Hari (24 Jam)'), findsOneWidget);
    expect(find.textContaining('2 Hari (48 Jam)'), findsOneWidget);
  });

  testWidgets('PengaturanPage dan PantauSemaiPage dapat dirender tanpa galat', (tester) async {
    final api = _buatMockApi();
    await api.login(username: 'admin', password: 'secret');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: PengaturanPage(api: api, aktif: false)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Pengaturan & Pusat Alat'), findsOneWidget);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: PantauSemaiPage(api: api, aktif: false)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('Mode Alat v6:'), findsOneWidget);
  });
}
