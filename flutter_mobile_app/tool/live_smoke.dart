// Smoke test END-TO-END terhadap backend yang sedang berjalan.
//
// Bukan bagian dari `flutter test` (sengaja): test otomatis tidak boleh
// bergantung pada server hidup. Jalankan manual saat ingin memastikan
// kontrak Flutter <-> backend benar-benar cocok:
//
//   cd flutter_mobile_app
//   SMOKE_USER=garap \
//   SMOKE_PASS="$(grep '^ADMIN_PASSWORD=' ../backend-nodejs/.env | cut -d= -f2-)" \
//   dart run tool/live_smoke.dart
//
// SMOKE_USER : akun level admin (huruf besar/kecil harus persis seperti
//              di database — seed terakhir: garap / petani / demo).
// SMOKE_PASS : sandi akun tersebut (ada di backend-nodejs/.env).
// Opsional   : API_BASE=http://192.168.x.x:8000 untuk backend di Raspberry Pi.
//
// Keluar dengan kode 0 bila semua langkah lulus.
import 'dart:io';

import 'package:flutter_mobile_app/config.dart';
import 'package:flutter_mobile_app/models/meja.dart';
import 'package:flutter_mobile_app/services/api_service.dart';
import 'package:flutter_mobile_app/services/client_factory.dart';

Future<void> main(List<String> args) async {
  final pass = Platform.environment['SMOKE_PASS'];
  final user = Platform.environment['SMOKE_USER'] ?? 'garap';
  if (pass == null || pass.isEmpty) {
    stderr.writeln('SMOKE_PASS belum diisi (password akun admin).');
    exitCode = 2;
    return;
  }

  final uri = Uri.parse(apiBase);
  stdout.writeln('Backend : ${uri.authority}');

  final api = ApiService();
  var gagal = 0;

  Future<void> langkah(String nama, Future<void> Function() jalan) async {
    try {
      await jalan();
      stdout.writeln('  OK   $nama');
    } on ApiException catch (e) {
      gagal++;
      stderr.writeln('  GAGAL $nama -> [${e.statusCode}] ${e.message}');
    } catch (e) {
      gagal++;
      stderr.writeln('  GAGAL $nama -> $e');
    }
  }

  await langkah('POST /login ($user)', () async {
    await api.login(username: user, password: pass);
    if (!api.isLoggedIn) throw const ApiException(200, 'token tidak tersimpan');
    final u = api.user;
    stdout.writeln('       user=${u?['username']} level=${u?['level']} '
        'token=${api.token!.length} karakter');
  });

  await langkah('GET /meja (13 kolom)', () async {
    final items = await api.fetchMeja();
    if (items.isEmpty) throw const ApiException(200, 'data meja kosong');
    stdout.writeln(
        '       ${items.length} baris, kolom=${Meja.columns.length}');
  });

  await langkah('GET /monitoring/chart-data', () async {
    final items = await api.fetchMonitoring();
    if (items.isEmpty) {
      throw const ApiException(200, 'riwayat kosong');
    }
    stdout.writeln('       ${items.length} baris, '
        'terakhir ph=${items.first.ph} tds=${items.first.tds}');
  });

  await langkah('GET /api/latest-sensor (publik)', () async {
    final data = await api.fetchLatestSensor();
    stdout.writeln('       is_online=${data['is_online']} '
        'water_control=${data['water_control'] != null}');
  });

  await langkah('GET /meja tanpa token -> 401 terstruktur', () async {
    // Pakai klien pabrik (bypass proxy) + tanpa header Authorization.
    final res = await buatKlienHttp()
        .get(Uri.parse('${Uri.parse(apiBase).resolve('/meja')}'),
            headers: const {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 10));
    if (res.statusCode != 401) {
      throw ApiException(
          res.statusCode, 'harap 401, dapat ${res.statusCode}');
    }
    stdout.writeln('       401 -> ${res.body.trim()}');
  });

  stdout.writeln(gagal == 0
      ? '\nSEMUA LANGKAH LULUS.'
      : '\n$gagal langkah gagal.');
  exitCode = gagal == 0 ? 0 : 1;
}
