import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'api_service.dart';

/// Peringatan baru yang perlu diberitahukan: belum ditangani dan id-nya di atas [idTerakhir].
/// Panggilan pertama (idTerakhir == null) hanya menetapkan acuan, tanpa notifikasi,
/// supaya peringatan lama tidak membanjiri HP saat aplikasi dibuka.
({List<Map<Object?, Object?>> baru, int? idTerakhir}) saringAlertBaru(
  List<Map<Object?, Object?>> rows,
  int? idTerakhir,
) {
  int? idDari(Map<Object?, Object?> r) =>
      int.tryParse(r['id']?.toString() ?? '');
  final ids = rows.map(idDari).whereType<int>();
  final maks = ids.isEmpty ? idTerakhir : ids.reduce((a, b) => a > b ? a : b);
  final acuanBaru = idTerakhir == null
      ? maks
      : (maks != null && maks > idTerakhir ? maks : idTerakhir);
  if (idTerakhir == null) return (baru: const [], idTerakhir: acuanBaru);
  final baru = rows.where((r) {
    final id = idDari(r);
    return id != null && id > idTerakhir && r['acknowledged'] != true;
  }).toList();
  return (baru: baru, idTerakhir: acuanBaru);
}

/// Notifikasi lokal untuk peringatan sensor/alat.
///
/// shortcut: memeriksa server berkala selama aplikasi hidup (termasuk saat di latar belakang
/// sampai sistem menghentikannya). Push saat aplikasi tertutup penuh butuh Firebase (FCM)
/// dan akses internet dari Pi; tambahkan bila greenhouse sudah terhubung internet.
class NotifikasiService {
  NotifikasiService({FlutterLocalNotificationsPlugin? plugin})
    : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  bool _siap = false;
  int? _idTerakhir;

  static const _kanal = AndroidNotificationDetails(
    'garap_peringatan',
    'Peringatan greenhouse',
    channelDescription: 'pH/TDS di luar batas, air habis, alat offline',
    importance: Importance.high,
    priority: Priority.high,
  );

  Future<void> siapkan() async {
    if (_siap || kIsWeb) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      await _plugin
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
      _siap = true;
    } catch (_) {
      // Platform tanpa dukungan notifikasi (mis. tes widget): aplikasi tetap jalan.
    }
  }

  /// Ambil peringatan terbaru lalu tampilkan yang baru. Galat jaringan diabaikan (dicoba lagi nanti).
  Future<void> periksa(ApiService api) async {
    try {
      final res = await api.getJson('/alert-logs?limit=20');
      final rows = (res is Map && res['data'] is List)
          ? (res['data'] as List).whereType<Map<Object?, Object?>>().toList()
          : <Map<Object?, Object?>>[];
      final hasil = saringAlertBaru(rows, _idTerakhir);
      _idTerakhir = hasil.idTerakhir;
      if (!_siap) return;
      for (final r in hasil.baru.take(3)) {
        final id = int.tryParse(r['id']?.toString() ?? '') ?? 0;
        await _plugin.show(
          id: id,
          title: 'Peringatan: ${r['type'] ?? 'GARAP'}',
          body: r['value']?.toString() ?? 'Ada peringatan baru di greenhouse.',
          notificationDetails: const NotificationDetails(
            android: _kanal,
            iOS: DarwinNotificationDetails(),
          ),
        );
      }
    } catch (_) {}
  }
}
