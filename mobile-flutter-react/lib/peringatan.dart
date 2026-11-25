import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:workmanager/workmanager.dart';

const garapUrl = String.fromEnvironment('GARAP_URL', defaultValue: 'https://garap.net');
const _kunciToken = 'garap_token';
const _kunciSudah = 'peringatan_sudah';
const _tugas = 'cek-peringatan';

final _notif = FlutterLocalNotificationsPlugin();
const _simpan = FlutterSecureStorage();

/// Peringatan yang sedang terjadi dan belum pernah dinotifikasi (sekali per kejadian).
List<Map<String, dynamic>> pilihBaru(List<dynamic> data, Set<String> sudah) => data
    .whereType<Map<String, dynamic>>()
    .where((a) => a['sedang_terjadi'] == true && !sudah.contains('${a['id']}'))
    .toList();

String judulPeringatan(String type) {
  const judul = {
    'estop': 'E-STOP', 'estop_fisik': 'E-STOP fisik', 'alat_offline': 'Alat offline',
    'data_tidak_masuk': 'Data sensor tidak masuk', 'air_rendah': 'Air rendah', 'sensor_ph': 'pH di luar batas',
    'sensor_tds': 'Nutrisi di luar batas', 'sensor_waterTemp': 'Suhu air', 'sensor_airTemp': 'Suhu udara',
    'sensor_humidity': 'Kelembapan',
  };
  if (judul[type] != null) return judul[type]!;
  if (type.startsWith('kunci_')) return 'Alat terkunci: ${type.substring(6).replaceAll('_', ' ')}';
  return type.replaceAll('_', ' ');
}

Future<void> siapkanNotifikasi() async {
  await _notif.initialize(settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')));
}

Future<void> mintaIzinNotifikasi() async {
  await _notif
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.requestNotificationsPermission();
}

/// Token disalin dari sesi web (localStorage `vsf-auth`) agar pemeriksaan latar belakang bisa memanggil API.
Future<void> simpanToken(String? token) async {
  if (token == null || token.isEmpty) {
    await _simpan.delete(key: _kunciToken);
  } else {
    await _simpan.write(key: _kunciToken, value: token);
  }
}

Future<void> cekPeringatan() async {
  final token = await _simpan.read(key: _kunciToken);
  if (token == null) return;
  final http.Response res;
  try {
    res = await http.get(Uri.parse('$garapUrl/alert-logs'), headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
    }).timeout(const Duration(seconds: 20));
  } catch (_) {
    return; // jaringan putus: coba lagi di putaran berikutnya
  }
  if (res.statusCode == 401) return simpanToken(null);
  if (res.statusCode != 200) return;

  final Object? isi;
  try {
    isi = jsonDecode(res.body);
  } catch (_) {
    return;
  }
  final data = isi is Map<String, dynamic> && isi['data'] is List ? isi['data'] as List : const [];
  final pref = await SharedPreferences.getInstance();
  final sudah = (pref.getStringList(_kunciSudah) ?? const []).toSet();
  final baru = pilihBaru(data, sudah);

  for (final a in baru) {
    final kritis = a['severity'] == 'critical';
    final id = '${a['id']}';
    await _notif.show(
      id: id.hashCode & 0x7fffffff,
      title: judulPeringatan('${a['type']}'),
      body: '${a['value'] ?? ''}',
      notificationDetails: NotificationDetails(
        android: kritis
            ? const AndroidNotificationDetails('peringatan_kritis', 'Peringatan kritis',
                channelDescription: 'Peringatan merah dari alat GARAP', importance: Importance.max, priority: Priority.high)
            : const AndroidNotificationDetails('peringatan_info', 'Peringatan kuning',
                channelDescription: 'Peringatan ringan, tanpa bunyi', importance: Importance.low, playSound: false),
      ),
    );
    sudah.add(id);
  }
  if (baru.isNotEmpty) {
    final daftar = sudah.toList();
    await pref.setStringList(_kunciSudah, daftar.sublist(daftar.length > 300 ? daftar.length - 300 : 0));
  }
}

@pragma('vm:entry-point')
void penjadwal() {
  Workmanager().executeTask((_, _) async {
    WidgetsFlutterBinding.ensureInitialized();
    await siapkanNotifikasi();
    await cekPeringatan();
    return true;
  });
}

/// Android membatasi tugas berkala minimal 15 menit; saat app terbuka diperiksa tiap menit.
Future<void> jadwalkanLatarBelakang() async {
  await Workmanager().initialize(penjadwal);
  await Workmanager().registerPeriodicTask(_tugas, _tugas,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
      constraints: Constraints(networkType: NetworkType.connected));
}
