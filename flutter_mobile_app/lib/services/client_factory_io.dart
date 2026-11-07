import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// Klien untuk platform berbasis VM.
///
/// `HttpClient` bawaan Dart mengikuti `HTTP_PROXY`/`HTTPS_PROXY` dari
/// lingkungan proses. Karena backend selalu lokal/LAN (tanpa proxy), proxy
/// itu dilewati agar koneksi tidak rusak di mesin yang menjalankan proxy
/// lokal (mis. pencegat trafik untuk pengembangan).
bool _hostLokalAman(String host) {
  final h = host.toLowerCase();
  if (h == 'localhost' || h == '127.0.0.1' || h == '::1') return true;
  if (h.endsWith('.local')) return true;
  if (h.startsWith('192.168.') || h.startsWith('10.')) return true;
  final m = RegExp(r'^172\.(\d+)\.').firstMatch(h);
  if (m != null) {
    final oktet2 = int.tryParse(m.group(1) ?? '') ?? 0;
    if (oktet2 >= 16 && oktet2 <= 31) return true;
  }
  return false;
}

http.Client buatKlienHttp() {
  final dalaman = HttpClient();
  dalaman.findProxy = (_) => 'DIRECT';
  dalaman.badCertificateCallback =
      (X509Certificate _, String host, int _) => _hostLokalAman(host);
  return IOClient(dalaman);
}
