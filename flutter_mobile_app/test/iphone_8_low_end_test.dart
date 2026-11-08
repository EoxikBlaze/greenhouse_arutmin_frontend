import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/login_page.dart';
import 'package:flutter_mobile_app/pages/peringatan_page.dart';
import 'package:flutter_mobile_app/pages/profil_page.dart';
import 'package:flutter_mobile_app/pages/sensor_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/util/performa.dart';
import 'package:flutter_mobile_app/widgets/brand.dart';
import 'package:flutter_mobile_app/widgets/dock.dart';
import 'package:flutter_mobile_app/widgets/ikon.dart';

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

ApiService _buatMockApi() {
  return ApiService(
    client: MockClient((request) async {
      final path = request.url.path;
      if (path.contains('/profil')) {
        return _json({
          'status': true,
          'data': {
            'id': 1,
            'username': 'petani_arutmin',
            'name': 'Petani Kebun 1',
            'role': 'petani',
          }
        }, 200);
      }
      if (path.contains('/alert-logs')) {
        return _json({
          'status': true,
          'data': [
            {
              'id': 101,
              'type': 'TDS_TINGGI',
              'value': 'TDS melebihi ambang batas (1450 ppm)',
              'severity': 'warning',
              'acknowledged': false,
              'created_at': DateTime.now().toIso8601String(),
            }
          ]
        }, 200);
      }
      if (path.contains('/monitoring')) {
        return _json({
          'status': true,
          'data': [
            {
              'id': 1,
              'suhu': 28.5,
              'kelembaban': 75.0,
              'tds': 850.0,
              'ph': 6.2,
              'suhu_air': 25.1,
              'created_at': DateTime.now().toIso8601String(),
            }
          ]
        }, 200);
      }
      return _json({'status': true, 'data': <String, dynamic>{}}, 200);
    }),
  );
}

void main() {
  const iphone8Size = Size(750, 1334); // 375x667 logical points
  const iphone8PixelRatio = 2.0;

  setUp(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  tearDown(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  group('Uji Performa Rendah & Tampilan Layar iPhone 8 (375x667 pt)', () {
    testWidgets(
      'Header Arutmin dan Dock Footer pas sempurna di layar 375px tanpa overflow',
      (tester) async {
        tester.view.physicalSize = iphone8Size;
        tester.view.devicePixelRatio = iphone8PixelRatio;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        await tester.pumpWidget(
          MaterialApp(
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(375, 667),
                textScaler: TextScaler.linear(1.3), // Skala teks maksimum yang diuji
                padding: EdgeInsets.only(top: 20), // Status bar iOS
              ),
              child: Scaffold(
                body: Stack(
                  children: [
                    const Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ArutminHeader(subjudul: 'Dashboard'),
                    ),
                    const Positioned.fill(
                      top: 90,
                      bottom: 80,
                      child: Center(child: Text('Konten Kebun')),
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: DockNav(
                        item: const [
                          DockItem('Beranda', Ikon.beranda),
                          DockItem('Sensor', Ikon.sensor),
                          DockItem('Alert', Ikon.peringatan),
                          DockItem('Profil', Ikon.profil),
                        ],
                        indeks: 0,
                        onPilih: (_) {},
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Tidak boleh ada RenderFlex overflow
        expect(tester.takeException(), isNull);

        // Header Arutmin tampil dan terpasang
        expect(find.byType(ArutminHeader), findsOneWidget);

        // Dock navigasi tampil dan terpasang
        expect(find.byType(DockNav), findsOneWidget);

        // Verifikasi lebar Header tidak melebihi 375px
        final headerRect = tester.getRect(find.byType(ArutminHeader));
        expect(headerRect.width, lessThanOrEqualTo(375.0));

        // Verifikasi lebar Dock Footer tidak melebihi 375px
        final dockRect = tester.getRect(find.byType(DockNav));
        expect(dockRect.width, lessThanOrEqualTo(375.0));
      },
    );

    testWidgets(
      'Halaman Login muat utuh di layar iPhone 8 tanpa overflow',
      (tester) async {
        tester.view.physicalSize = iphone8Size;
        tester.view.devicePixelRatio = iphone8PixelRatio;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        final mockApi = _buatMockApi();

        await tester.pumpWidget(
          MaterialApp(
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(375, 667),
                textScaler: TextScaler.linear(1.2),
              ),
              child: LoginPage(
                api: mockApi,
                onLoggedIn: () {},
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.text('Masuk'), findsOneWidget);
        expect(find.byType(TextFormField), findsNWidgets(2));
      },
    );

    testWidgets(
      'Halaman Profil tidak overflow pada layar 375px dengan skala teks 1.3x',
      (tester) async {
        tester.view.physicalSize = iphone8Size;
        tester.view.devicePixelRatio = iphone8PixelRatio;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        final mockApi = _buatMockApi();

        await tester.pumpWidget(
          MaterialApp(
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(375, 667),
                textScaler: TextScaler.linear(1.3),
              ),
              child: Scaffold(
                body: ProfilPage(
                  api: mockApi,
                  onLogout: () {},
                ),
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.byType(ProfilPage), findsOneWidget);
      },
    );

    testWidgets(
      'Halaman Peringatan pas di iPhone 8 dan filter segmen responsif',
      (tester) async {
        tester.view.physicalSize = iphone8Size;
        tester.view.devicePixelRatio = iphone8PixelRatio;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        final mockApi = _buatMockApi();

        await tester.pumpWidget(
          MaterialApp(
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(375, 667),
                textScaler: TextScaler.linear(1.0),
              ),
              child: Scaffold(
                body: PeringatanPage(api: mockApi),
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);
        expect(find.text('Peringatan'), findsWidgets);
        expect(find.text('Semua'), findsOneWidget);
      },
    );

    testWidgets(
      'Halaman Sensor muat di iPhone 8 dalam mode ringan tanpa beban GPU (0 BackdropFilter)',
      (tester) async {
        tester.view.physicalSize = iphone8Size;
        tester.view.devicePixelRatio = iphone8PixelRatio;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        final mockApi = _buatMockApi();

        await tester.pumpWidget(
          MaterialApp(
            home: MediaQuery(
              data: const MediaQueryData(
                size: Size(375, 667),
                textScaler: TextScaler.linear(1.0),
              ),
              child: Scaffold(
                body: SensorPage(api: mockApi),
              ),
            ),
          ),
        );

        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);

        // Pada mode performa rendah iPhone 8, pastikan BackdropFilter adalah 0
        final jumlahBlur = tester.widgetList<BackdropFilter>(find.byType(BackdropFilter)).length;
        expect(jumlahBlur, 0, reason: 'iPhone 8 mode rendah tidak boleh merender BackdropFilter');
      },
    );
  });
}
