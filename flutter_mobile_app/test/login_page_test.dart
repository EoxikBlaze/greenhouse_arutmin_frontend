import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter_mobile_app/pages/login_page.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/widgets/halaman.dart';

http.Response _json(Object body, int status) => http.Response(
  jsonEncode(body),
  status,
  headers: {'content-type': 'application/json'},
);

Future<void> _isiForm(WidgetTester tester) async {
  await tester.enterText(find.byType(TextFormField).at(0), 'admin');
  await tester.enterText(find.byType(TextFormField).at(1), 'salah-banget');
}

void main() {
  testWidgets('Login berhasil memanggil onLoggedIn', (tester) async {
    final api = ApiService(
      client: MockClient(
        (_) async => _json({'status': true, 'token': 'tok-abc'}, 200),
      ),
    );
    var masuk = false;

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(api: api, onLoggedIn: () => masuk = true),
      ),
    );

    await _isiForm(tester);
    await tester.tap(find.text('Masuk'));
    await tester.pumpAndSettle();

    expect(masuk, isTrue);
    expect(api.isLoggedIn, isTrue);
  });

  testWidgets('Login gagal 422 menampilkan pesan ramah Indonesia', (
    tester,
  ) async {
    final api = ApiService(
      client: MockClient(
        (_) async => _json({
          'message': 'Username / Password salah.',
          'errors': {
            'username': ['Username / Password salah.'],
          },
        }, 422),
      ),
    );
    var masuk = false;

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(api: api, onLoggedIn: () => masuk = true),
      ),
    );

    await _isiForm(tester);
    await tester.tap(find.text('Masuk'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Username / Password salah.'), findsOneWidget);
    expect(masuk, isFalse);
    expect(api.isLoggedIn, isFalse);
  });

  testWidgets('Login saat backend mati menampilkan pesan terjangkau', (
    tester,
  ) async {
    final api = ApiService(
      client: MockClient((_) => throw http.ClientException('refused')),
    );
    var masuk = false;

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(api: api, onLoggedIn: () => masuk = true),
      ),
    );

    await _isiForm(tester);
    await tester.tap(find.text('Masuk'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Sistem tidak terjangkau'), findsOneWidget);
    expect(masuk, isFalse);
  });

  testWidgets('Validasi form menolak isian kosong', (tester) async {
    final api = ApiService(client: MockClient((_) async => _json({}, 500)));
    var dipanggil = false;

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(api: api, onLoggedIn: () => dipanggil = true),
      ),
    );

    await tester.enterText(find.byType(TextFormField).at(0), 'a');
    await tester.tap(find.text('Masuk'));
    await tester.pumpAndSettle();

    expect(dipanggil, isFalse);
    expect(find.textContaining('minimal 3 karakter'), findsWidgets);
  });

  testWidgets('Tombol peran cepat mengisi akun Superadmin, Petani, dan Demo', (
    tester,
  ) async {
    final api = ApiService(client: MockClient((_) async => _json({}, 200)));

    await tester.pumpWidget(
      MaterialApp(
        home: LoginPage(api: api, onLoggedIn: () {}),
      ),
    );

    final chipDemo = find.text('Demo (Hanya Lihat)');
    await tester.ensureVisible(chipDemo);
    await tester.tap(chipDemo);
    await tester.pump();

    final fieldUser = tester.widget<TextFormField>(
      find.byType(TextFormField).at(0),
    );
    expect(fieldUser.controller?.text, 'demo');
    expect(find.text('Ingatkan saya (tetap masuk)'), findsOneWidget);
  });

  testWidgets('PageTop menampilkan tombol Kembali saat berada di tab dalam', (
    tester,
  ) async {
    var kembaliDipanggil = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NavigasiBerandaScope(
            onKembali: () => kembaliDipanggil = true,
            child: const PageTop(eyebrow: 'Pantau', judul: 'Sensor'),
          ),
        ),
      ),
    );

    final tombolKembali = find.byTooltip('Kembali');
    expect(tombolKembali, findsOneWidget);
    await tester.tap(tombolKembali);
    await tester.pump();
    expect(kembaliDipanggil, isTrue);
  });
}
