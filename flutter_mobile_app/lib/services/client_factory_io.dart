import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// Klien untuk platform berbasis VM.
///
/// `HttpClient` bawaan Dart mengikuti `HTTP_PROXY`/`HTTPS_PROXY` dari
/// lingkungan proses. Karena backend selalu lokal/LAN (tanpa proxy), proxy
/// itu dilewati agar koneksi tidak rusak di mesin yang menjalankan proxy
/// lokal (mis. pencegat trafik untuk pengembangan).
http.Client buatKlienHttp() {
  final dalaman = HttpClient()..findProxy = (_) => 'DIRECT';
  return IOClient(dalaman);
}
