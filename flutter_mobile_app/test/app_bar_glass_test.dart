import 'package:flutter/material.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/sesi_store.dart';
import 'package:flutter_mobile_app/widgets/app_bar_glass.dart';
import 'package:flutter_mobile_app/widgets/halaman.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakePenyimpan implements PenyimpanSesi {
  String? _token;
  @override
  Future<String?> baca() async => _token;
  @override
  Future<void> tulis(String? isi) async => _token = isi;
}

void main() {
  testWidgets('AppBarGlass: judul tampil dan tombol kembali menutup halaman', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const Scaffold(
                    appBar: AppBarGlass(judul: 'Daftar Meja'),
                    body: SizedBox(),
                  ),
                ),
              ),
              child: const Text('buka'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('buka'));
    await tester.pumpAndSettle();
    expect(find.text('Daftar Meja'), findsOneWidget);

    await tester.tap(find.byTooltip('Kembali'));
    await tester.pumpAndSettle();
    expect(find.text('Daftar Meja'), findsNothing);
    expect(find.text('buka'), findsOneWidget);
  });

  testWidgets('PageTop: pada tab utama tidak ada tombol kembali, tombol AI tampil', (
    tester,
  ) async {
    final api = ApiService(penyimpan: _FakePenyimpan());

    await tester.pumpWidget(
      MaterialApp(
        home: ApiServiceScope(
          api: api,
          child: const Scaffold(
            body: PageTop(eyebrow: 'Pantau', judul: 'Sensor'),
          ),
        ),
      ),
    );

    // Di tab utama (canPop false & onKembali null) tidak ada tombol kembali
    expect(find.byTooltip('Kembali'), findsNothing);
    // Tombol AI dan Tema selalu siap di kepala halaman
    expect(find.byTooltip('Tanya Asisten AI GARAP'), findsOneWidget);
  });

  testWidgets('AppBarGlass: tombol AI membuka AsistenPage', (
    tester,
  ) async {
    final api = ApiService(penyimpan: _FakePenyimpan());

    await tester.pumpWidget(
      MaterialApp(
        home: ApiServiceScope(
          api: api,
          child: const Scaffold(
            appBar: AppBarGlass(judul: 'Kamera CCTV'),
            body: SizedBox(),
          ),
        ),
      ),
    );

    expect(find.byTooltip('Tanya Asisten AI GARAP'), findsOneWidget);
    await tester.tap(find.byTooltip('Tanya Asisten AI GARAP'));
    await tester.pumpAndSettle();

    // Berhasil membuka Asisten kebun
    expect(find.text('Asisten AI'), findsOneWidget);
  });
}
