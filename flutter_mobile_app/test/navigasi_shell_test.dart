import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:flutter_mobile_app/widgets/brand.dart';
import 'package:flutter_mobile_app/widgets/dock.dart';
import 'package:flutter_mobile_app/widgets/ikon.dart';
import 'package:flutter_mobile_app/widgets/navigasi_shell.dart';

void main() {
  testWidgets(
    'NavigasiShellScope: header dan footer tetap ada saat membuka dan menutup subpage',
    (tester) async {
      Widget? halamanDalam;
      String? judulHalaman;

      await tester.pumpWidget(
        MaterialApp(
          home: StatefulBuilder(
            builder: (context, setState) {
              void buka(Widget w, String judul) {
                setState(() {
                  halamanDalam = w;
                  judulHalaman = judul;
                });
              }

              void tutup() {
                setState(() {
                  halamanDalam = null;
                  judulHalaman = null;
                });
              }

              return NavigasiShellScope(
                bukaHalaman: buka,
                tutupHalaman: tutup,
                adaHalamanDalam: halamanDalam != null,
                child: Scaffold(
                  body: Stack(
                    children: [
                      // Header tetap di atas
                      Positioned(
                        top: 0,
                        left: 0,
                        right: 0,
                        child: ArutminHeader(
                          subjudul: judulHalaman ?? 'Dashboard',
                          bisaKembali: halamanDalam != null,
                          onKembali: halamanDalam != null ? tutup : null,
                        ),
                      ),
                      // Konten tengah
                      Positioned.fill(
                        top: 90,
                        bottom: 80,
                        child: halamanDalam ??
                            Center(
                              child: Builder(
                                builder: (ctx) => ElevatedButton(
                                  onPressed: () => bukaHalamanApp(
                                    ctx,
                                    const Center(child: Text('Konten Halaman CCTV')),
                                    judul: 'CCTV',
                                  ),
                                  child: const Text('Buka CCTV'),
                                ),
                              ),
                            ),
                      ),
                      // Footer tetap di bawah
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: DockNav(
                          item: const [
                            DockItem('Beranda', Ikon.beranda),
                            DockItem('Sensor', Ikon.sensor),
                          ],
                          indeks: halamanDalam != null ? -1 : 0,
                          onPilih: (_) {},
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      // 1. Kondisi awal: Beranda tampil, header 'Dashboard', tombol 'Buka CCTV', footer ada
      expect(find.text('Arutmin'), findsOneWidget);
      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Buka CCTV'), findsOneWidget);
      expect(find.byType(DockNav), findsOneWidget);
      expect(find.byTooltip('Kembali'), findsNothing);

      // 2. Ketuk Buka CCTV -> beralih ke subpage tanpa membuang header & footer
      await tester.tap(find.text('Buka CCTV'));
      await tester.pumpAndSettle();

      expect(find.text('Arutmin'), findsOneWidget);
      expect(find.text('CCTV'), findsOneWidget);
      expect(find.text('Konten Halaman CCTV'), findsOneWidget);
      expect(find.byType(DockNav), findsOneWidget);
      expect(find.byTooltip('Kembali'), findsOneWidget);

      // 3. Ketuk tombol Kembali di header -> kembali ke Dashboard
      await tester.tap(find.byTooltip('Kembali'));
      await tester.pumpAndSettle();

      expect(find.text('Dashboard'), findsOneWidget);
      expect(find.text('Buka CCTV'), findsOneWidget);
      expect(find.text('Konten Halaman CCTV'), findsNothing);
      expect(find.byType(DockNav), findsOneWidget);
      expect(find.byTooltip('Kembali'), findsNothing);
    },
  );
}
