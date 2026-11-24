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
            'name': 'Petani Kebun Hidroponik',
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

/// Definisi profil perangkat uji
class ProfilPerangkat {
  const ProfilPerangkat({
    required this.nama,
    required this.lebarPt,
    required this.tinggiPt,
    required this.pixelRatio,
    required this.statusBarPt,
    required this.bottomSafePt,
  });

  final String nama;
  final double lebarPt;
  final double tinggiPt;
  final double pixelRatio;
  final double statusBarPt;
  final double bottomSafePt;

  Size get ukuranFisik => Size(lebarPt * pixelRatio, tinggiPt * pixelRatio);
  Size get ukuranLogis => Size(lebarPt, tinggiPt);
  EdgeInsets get padding => EdgeInsets.only(top: statusBarPt, bottom: bottomSafePt);
}

void main() {
  // Matriks perangkat yang diuji sesuai permintaan pengguna
  const perangkatDaftar = [
    ProfilPerangkat(
      nama: 'iPhone Mini (360x780 pt)',
      lebarPt: 360,
      tinggiPt: 780,
      pixelRatio: 3.0,
      statusBarPt: 44,
      bottomSafePt: 34,
    ),
    ProfilPerangkat(
      nama: 'iPhone Basic 15/16 (393x852 pt)',
      lebarPt: 393,
      tinggiPt: 852,
      pixelRatio: 3.0,
      statusBarPt: 47,
      bottomSafePt: 34,
    ),
    ProfilPerangkat(
      nama: 'iPhone Pro Max (430x932 pt)',
      lebarPt: 430,
      tinggiPt: 932,
      pixelRatio: 3.0,
      statusBarPt: 47,
      bottomSafePt: 34,
    ),
    ProfilPerangkat(
      nama: 'iPad Mini (744x1133 pt)',
      lebarPt: 744,
      tinggiPt: 1133,
      pixelRatio: 2.0,
      statusBarPt: 24,
      bottomSafePt: 20,
    ),
    ProfilPerangkat(
      nama: 'iPad 13 Inch Portrait (1024x1366 pt)',
      lebarPt: 1024,
      tinggiPt: 1366,
      pixelRatio: 2.0,
      statusBarPt: 24,
      bottomSafePt: 20,
    ),
    ProfilPerangkat(
      nama: 'iPad 13 Inch Landscape (1366x1024 pt)',
      lebarPt: 1366,
      tinggiPt: 1024,
      pixelRatio: 2.0,
      statusBarPt: 24,
      bottomSafePt: 20,
    ),
  ];

  setUp(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  tearDown(() {
    PerformaRender.atur(TingkatPerforma.ringan);
  });

  group('Matriks Pengujian Multi-Ukuran Layar (iPhone Mini s/d iPad 13")', () {
    for (final dev in perangkatDaftar) {
      testWidgets(
        '${dev.nama}: Header & Footer Dock bebas overflow pada teks 1.3x',
        (tester) async {
          tester.view.physicalSize = dev.ukuranFisik;
          tester.view.devicePixelRatio = dev.pixelRatio;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          await tester.pumpWidget(
            MaterialApp(
              home: MediaQuery(
                data: MediaQueryData(
                  size: dev.ukuranLogis,
                  textScaler: const TextScaler.linear(1.3),
                  padding: dev.padding,
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
                      Positioned.fill(
                        top: 90,
                        bottom: 80,
                        child: Center(
                          child: Text(
                            'Area Kerja: ${dev.nama}',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
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

          expect(tester.takeException(), isNull,
              reason: '${dev.nama} tidak boleh memiliki RenderFlex overflow');
          expect(find.byType(ArutminHeader), findsOneWidget);
          expect(find.byType(DockNav), findsOneWidget);

          final headerRect = tester.getRect(find.byType(ArutminHeader));
          expect(headerRect.width, lessThanOrEqualTo(dev.lebarPt));

          final dockRect = tester.getRect(find.byType(DockNav));
          expect(dockRect.width, lessThanOrEqualTo(dev.lebarPt));
        },
      );

      testWidgets(
        '${dev.nama}: Halaman Login muat tanpa overflow',
        (tester) async {
          tester.view.physicalSize = dev.ukuranFisik;
          tester.view.devicePixelRatio = dev.pixelRatio;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final mockApi = _buatMockApi();

          await tester.pumpWidget(
            MaterialApp(
              home: MediaQuery(
                data: MediaQueryData(
                  size: dev.ukuranLogis,
                  textScaler: const TextScaler.linear(1.2),
                  padding: dev.padding,
                ),
                child: LoginPage(api: mockApi, onLoggedIn: () {}),
              ),
            ),
          );

          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull,
              reason: 'Login pada ${dev.nama} tidak boleh overflow');
          expect(find.text('Masuk'), findsOneWidget);
        },
      );

      testWidgets(
        '${dev.nama}: Halaman Peringatan pas tanpa overflow',
        (tester) async {
          tester.view.physicalSize = dev.ukuranFisik;
          tester.view.devicePixelRatio = dev.pixelRatio;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final mockApi = _buatMockApi();

          await tester.pumpWidget(
            MaterialApp(
              home: MediaQuery(
                data: MediaQueryData(
                  size: dev.ukuranLogis,
                  textScaler: const TextScaler.linear(1.1),
                  padding: dev.padding,
                ),
                child: Scaffold(
                  body: PeringatanPage(api: mockApi),
                ),
              ),
            ),
          );

          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull,
              reason: 'PeringatanPage pada ${dev.nama} tidak boleh overflow');
          expect(find.text('Peringatan'), findsWidgets);
        },
      );

      testWidgets(
        '${dev.nama}: Halaman Sensor KPI responsif tanpa overflow',
        (tester) async {
          tester.view.physicalSize = dev.ukuranFisik;
          tester.view.devicePixelRatio = dev.pixelRatio;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final mockApi = _buatMockApi();

          await tester.pumpWidget(
            MaterialApp(
              home: MediaQuery(
                data: MediaQueryData(
                  size: dev.ukuranLogis,
                  textScaler: const TextScaler.linear(1.0),
                  padding: dev.padding,
                ),
                child: Scaffold(
                  body: SensorPage(api: mockApi),
                ),
              ),
            ),
          );

          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull,
              reason: 'SensorPage pada ${dev.nama} tidak boleh overflow');
        },
      );

      testWidgets(
        '${dev.nama}: Halaman Profil pas tanpa overflow pada teks 1.3x',
        (tester) async {
          tester.view.physicalSize = dev.ukuranFisik;
          tester.view.devicePixelRatio = dev.pixelRatio;
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
          });

          final mockApi = _buatMockApi();

          await tester.pumpWidget(
            MaterialApp(
              home: MediaQuery(
                data: MediaQueryData(
                  size: dev.ukuranLogis,
                  textScaler: const TextScaler.linear(1.3),
                  padding: dev.padding,
                ),
                child: Scaffold(
                  body: ProfilPage(api: mockApi, onLogout: () {}),
                ),
              ),
            ),
          );

          await tester.pumpAndSettle();

          expect(tester.takeException(), isNull,
              reason: 'ProfilPage pada ${dev.nama} tidak boleh overflow');
          expect(find.byType(ProfilPage), findsOneWidget);
        },
      );
    }
  });
}
