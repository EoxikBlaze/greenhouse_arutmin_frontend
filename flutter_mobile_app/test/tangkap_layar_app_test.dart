import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/asisten_page.dart';
import 'package:flutter_mobile_app/pages/dashboard_page.dart';
import 'package:flutter_mobile_app/pages/profil_page.dart';
import 'package:flutter_mobile_app/pages/tanam_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/theme/tokens.dart';
import 'package:flutter_mobile_app/util/performa.dart';
import 'package:flutter_mobile_app/widgets/brand.dart';
import 'package:flutter_mobile_app/widgets/dock.dart';
import 'package:flutter_mobile_app/widgets/halaman.dart';
import 'package:flutter_mobile_app/widgets/ikon.dart';
import 'package:flutter_mobile_app/widgets/kaca.dart';

http.Response _json(Object body, [int status = 200]) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

ApiService _buatMockApi() {
  final api = ApiService(
    client: MockClient((req) async {
      final p = req.url.path;
      if (p == '/login') {
        return _json({
          'token': 'mock-jwt-token',
          'user': {
            'id': 1,
            'username': 'garap',
            'email': 'admin@politala.ac.id',
            'level': 'admin',
          },
        });
      }
      if (p == '/dashboard') {
        return _json({
          'iotStatus': {'online': true},
          'water_control': {'mode': 'AUTO', 'valve_state': 'CLOSED'},
          'latest_sensor': {
            'ph': 6.2,
            'tds': 850,
            'waterTemp': 24.5,
            'temp': 28.0,
            'humidity': 72.0,
          },
          'total_semai': 3,
          'semai_aktif': 2,
        });
      }
      if (p == '/monitoring/chart-data') {
        return _json([
          for (var i = 0; i < 12; i++)
            {
              'id': '$i',
              'ph': 6.0 + (i % 3) * 0.1,
              'waterTemp': 24.0 + (i % 2) * 0.4,
              'tds': 820 + i * 8,
              'created_at': DateTime.utc(2026, 11, 9, 8, i).toIso8601String(),
            }
        ]);
      }
      if (p == '/tanam') {
        return _json({
          'list': [
            {
              'id': 1,
              'nama_tanaman': 'Melon Golden',
              'meja': 'Meja 1 (Semai)',
              'tahap': 'semai',
              'hari_ke': 4,
              'total_hari': 10,
              'jumlah': 50,
              'tanggal_semai': '2026-11-05',
            },
            {
              'id': 2,
              'nama_tanaman': 'Melon Rock',
              'meja': 'Meja 2 (Peremajaan)',
              'tahap': 'peremajaan',
              'hari_ke': 14,
              'total_hari': 25,
              'jumlah': 40,
              'tanggal_semai': '2026-10-26',
            },
          ]
        });
      }
      if (p == '/tanam/pilihan') {
        return _json({
          'tanaman': [
            {'id': 118, 'nama': 'Melon', 'semai': 10, 'peremajaan': 15, 'pendewasaan': 45},
            {'id': 119, 'nama': 'Selada Romaine', 'semai': 7, 'peremajaan': 10, 'pendewasaan': 25},
            {'id': 120, 'nama': 'Pakcoy Hijau', 'semai': 7, 'peremajaan': 10, 'pendewasaan': 28},
          ],
          'meja': [
            {'id': 1, 'nama': 'Meja 1 (Semai)', 'jumlah_lubang': 200},
            {'id': 2, 'nama': 'Meja 2 (Peremajaan)', 'jumlah_lubang': 150},
            {'id': 3, 'nama': 'Meja 3 (Pendewasaan A)', 'jumlah_lubang': 100},
            {'id': 4, 'nama': 'Meja 4 (Pendewasaan B)', 'jumlah_lubang': 100},
          ],
        });
      }
      if (p == '/api/ai/chat') {
        return _json({
          'jawaban': 'Diagnosa menyeluruh: 1 kritis, 2 perlu perhatian, 5 sehat dari 8 komponen.\n\nTindakan yang disarankan:\n• Koneksi alat sensor: Nyalakan alat sensor, lalu cek Wi-Fi dan kunci alat\n• Tahap tanam: Mulai siklus di halaman Tanam\n• CCTV: Aktifkan atau tambah kamera di halaman CCTV',
          'status': 'KRITIS',
          'sumber': 'diagnosa',
          'tabel': [
            {
              'judul': 'Hasil pemeriksaan',
              'kolom': ['Komponen', 'Status', 'Detail', 'Saran'],
              'baris': [
                ['Penyimpanan data', 'OK', 'terhubung · 2 ms', '-'],
                ['Migrasi skema', 'OK', '26 migrasi tercatat', '-'],
                ['Koneksi alat sensor', 'KRITIS', 'belum ada satu pun bacaan', 'Nyalakan alat sensor, lalu cek Wi-Fi'],
                ['Nilai sensor', 'OK', 'semua dalam ambang', '-'],
                ['Alert', 'OK', 'tidak ada alert terbuka', '-'],
                ['Penampung & dosing', 'OK', 'semua penampung normal', '-'],
                ['Tahap tanam', 'PERHATIAN', 'belum ada data tanam', 'Mulai siklus di halaman Tanam'],
              ]
            }
          ],
          'saran_pertanyaan': [
            'Bagaimana cara atur pH?',
            'Berapa target TDS melon?',
            'Tampilkan tabel sensor terbaru',
            'Langkah selanjutnya',
          ],
          'gambar': <Map<String, dynamic>>[],
          'tautan': <Map<String, dynamic>>[],
        });
      }
      if (p == '/alert-logs') {
        return _json({'aktif': 0, 'daftar': <Map<String, dynamic>>[]});
      }
      if (p == '/profil') {
        return _json({
          'user': {
            'username': 'garap',
            'email': 'admin@politala.ac.id',
            'level': 'admin',
          }
        });
      }
      return _json({});
    }),
  );
  return api;
}

Future<void> _ambilSnapshot(WidgetTester tester, GlobalKey key, String path) async {
  await tester.runAsync(() async {
    final boundary = key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 2.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    final bytes = byteData!.buffer.asUint8List();
    File(path).writeAsBytesSync(bytes);
  });
}

void main() {
  const artifactDir = '/Users/rizki/.gemini/antigravity/brain/be678dc8-fedc-4edd-b615-904b460aae2e';

  setUp(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  testWidgets('Ambil Screenshot 1: Beranda Dashboard dengan Header Pinned & Tombol AI', (tester) async {
    final key = GlobalKey();
    tester.view.physicalSize = const Size(1179, 2556);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final api = _buatMockApi();
    await api.login(username: 'garap', password: 'password123');

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: Tok.fontIsi,
          scaffoldBackgroundColor: Tok.page,
        ),
        home: RepaintBoundary(
          key: key,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 59, bottom: 34),
            ),
            child: ApiServiceScope(
              api: api,
              child: Scaffold(
                extendBody: true,
                body: Stack(
                  children: [
                    const Positioned.fill(child: LatarCair()),
                    Positioned.fill(
                      top: 59 + 92.0,
                      child: DashboardPage(api: api),
                    ),
                    const Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ArutminHeader(
                        subjudul: 'Dashboard',
                        inisial: 'GA',
                      ),
                    ),
                    Positioned(
                      right: 20,
                      bottom: 86,
                      child: SafeArea(
                        top: false,
                        child: Material(
                          color: Colors.transparent,
                          child: Container(
                            height: 44,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.42),
                                  blurRadius: 14,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.28),
                                width: 1.2,
                              ),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.auto_awesome, color: Colors.white, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'Tanya AI',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                SizedBox(width: 8),
                                CircleAvatar(radius: 4, backgroundColor: Color(0xFF10B981)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 0,
                      child: SafeArea(
                        top: false,
                        minimum: const EdgeInsets.only(bottom: 12),
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: DockNav(
                            item: const [
                              DockItem('Beranda', Ikon.beranda),
                              DockItem('Sensor', Ikon.sensor),
                              DockItem('Kontrol', Ikon.air),
                              DockItem('Tanam', Ikon.tanam),
                              DockItem('Akun', Ikon.profil),
                            ],
                            indeks: 0,
                            onPilih: (_) {},
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }
    await _ambilSnapshot(tester, key, '$artifactDir/screenshot_flutter_dashboard.png');
  });

  testWidgets('Ambil Screenshot 2: Sheet Mulai Tanam Baru dengan Stepper & Timeline', (tester) async {
    final key = GlobalKey();
    tester.view.physicalSize = const Size(1179, 2556);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final api = _buatMockApi();
    await api.login(username: 'garap', password: 'password123');

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: Tok.fontIsi,
          scaffoldBackgroundColor: Tok.page,
        ),
        home: RepaintBoundary(
          key: key,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 59, bottom: 34),
            ),
            child: ApiServiceScope(
              api: api,
              child: Scaffold(
                body: Stack(
                  children: [
                    const Positioned.fill(child: LatarCair()),
                    Positioned.fill(
                      top: 59 + 92.0,
                      child: TanamPage(api: api),
                    ),
                    const Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ArutminHeader(
                        subjudul: 'Jadwal Tanam',
                        inisial: 'GA',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }

    // Buka Sheet Mulai Tanam
    final tombolMulai = find.text('Mulai tanam baru');
    expect(tombolMulai, findsOneWidget);
    await tester.tap(tombolMulai);
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }

    await _ambilSnapshot(tester, key, '$artifactDir/screenshot_flutter_tanam_sheet.png');
  });

  testWidgets('Ambil Screenshot 3: Asisten AI Chat dengan Status Badge & Follow-up Chips', (tester) async {
    final key = GlobalKey();
    tester.view.physicalSize = const Size(1179, 2556);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final api = _buatMockApi();
    await api.login(username: 'garap', password: 'password123');

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: Tok.fontIsi,
          scaffoldBackgroundColor: Tok.page,
        ),
        home: RepaintBoundary(
          key: key,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 59, bottom: 34),
            ),
            child: ApiServiceScope(
              api: api,
              child: Scaffold(
                body: Stack(
                  children: [
                    const Positioned.fill(child: LatarCair()),
                    Positioned.fill(
                      top: 59 + 92.0,
                      child: AsistenPage(api: api, tanpaAppBar: true),
                    ),
                    const Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ArutminHeader(
                        subjudul: 'Asisten GARAP',
                        bisaKembali: true,
                        inisial: 'GA',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }

    // Ketuk tombol pintasan "Diagnosa menyeluruh"
    final pintasan = find.text('Diagnosa menyeluruh');
    expect(pintasan, findsWidgets);
    await tester.tap(pintasan.first);
    for (var i = 0; i < 15; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }

    await _ambilSnapshot(tester, key, '$artifactDir/screenshot_flutter_asisten_ai.png');
  });

  testWidgets('Ambil Screenshot 4: Profil Akun Rapi Tanpa Terpotong', (tester) async {
    final api = _buatMockApi();
    await api.login(username: 'garap', password: 'password123');
    final key = GlobalKey();

    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(useMaterial3: true, fontFamily: Tok.fontIsi),
        home: RepaintBoundary(
          key: key,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 59, bottom: 34),
            ),
            child: ApiServiceScope(
              api: api,
              child: Scaffold(
                body: Stack(
                  children: [
                    const Positioned.fill(child: LatarCair()),
                    Positioned.fill(
                      top: 59 + 92.0 - 12,
                      child: Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: ProfilPage(api: api, onLogout: () {}),
                      ),
                    ),
                    const Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ArutminHeader(
                        subjudul: 'Profil Akun',
                        bisaKembali: false,
                        inisial: 'GA',
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 0,
                      child: SafeArea(
                        top: false,
                        minimum: const EdgeInsets.only(bottom: 12),
                        child: Align(
                          alignment: Alignment.bottomCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 520),
                            child: DockNav(
                              item: const [
                                DockItem('Beranda', Ikon.beranda),
                                DockItem('Sensor', Ikon.sensor),
                                DockItem('Kontrol', Ikon.air),
                                DockItem('Tanam', Ikon.tanam),
                                DockItem('Akun', Ikon.profil),
                              ],
                              indeks: 4,
                              onPilih: (_) {},
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );

    for (var i = 0; i < 15; i++) {
      await tester.pump(const Duration(milliseconds: 30));
    }

    expect(find.text('Profil Akun'), findsOneWidget);
    expect(find.text('Administrator'), findsOneWidget);
    expect(find.text('Riwayat monitoring'), findsOneWidget);

    await _ambilSnapshot(tester, key, '$artifactDir/screenshot_flutter_profil_akun.png');
  });
}
