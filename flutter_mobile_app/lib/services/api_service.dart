import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/meja.dart';
import '../models/monitoring_entry.dart';
import 'client_factory.dart';

/// Kegagalan API dengan pesan ramah berbahasa Indonesia.
///
/// [statusCode] `null` berarti server tidak terjangkau (offline/timeout).
class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);

  final int? statusCode;
  final String message;

  @override
  String toString() => message;
}

/// Klien API GARAP.
///
/// Mengikuti arsitektur yang sudah ada: paket `http` murni (tanpa dio),
/// token disimpan di memori (tanpa dependensi penyimpanan baru).
/// [client] bisa disuntikkan agar unit test dapat memakai mock tanpa server.
class ApiService {
  ApiService({
    http.Client? client,
    String? baseUrl,
    this.timeout = const Duration(seconds: apiTimeoutSeconds),
  })  : _client = client ?? buatKlienHttp(),
        baseUrl = baseUrl ?? apiBase;

  final http.Client _client;
  final String baseUrl;

  /// Batas waktu tunggu tiap request (bisa dipendekkan untuk pengujian).
  final Duration timeout;

  String? _token;

  /// Profil akun dari balasan login (`{status, message, token, user, redirect}`).
  /// Hanya metadata non-sensitif (id, username, email, level, is_demo).
  Map<String, dynamic>? _user;

  /// Token JWT aktif (null = belum login).
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _token != null;

  /// Dipanggil otomatis saat server menjawab 401 (token kedaluwarsa/dicabut)
  /// agar UI bisa segera kembali ke halaman login.
  void Function()? onUnauthorized;

  /// Hapus sesi (dipanggil tombol Keluar).
  void clearSession() {
    _token = null;
    _user = null;
  }

  Future<Map<String, String>> _headers({bool withContentType = false}) async {
    return {
      'Accept': 'application/json',
      if (withContentType) 'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  Future<dynamic> _request(String path,
      {Object? body, Duration? batas}) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      final http.Response res;
      if (body == null) {
        res = await _client
            .get(uri, headers: await _headers())
            .timeout(batas ?? timeout);
      } else {
        res = await _client
            .post(
              uri,
              headers: await _headers(withContentType: true),
              body: jsonEncode(body),
            )
            .timeout(batas ?? timeout);
      }
      return _handle(res);
    } on ApiException {
      rethrow;
    } catch (_) {
      // Timeout / koneksi ditolak / DNS gagal — semuanya dibawa ke pesan
      // yang menyebut alamat backend agar pengguna tahu harus menyalakan apa.
      throw ApiException(
          null,
          'Backend tidak terjangkau ($baseUrl). Pastikan server sedang '
          'berjalan dan perangkat terhubung ke jaringan yang sama.');
    }
  }

  dynamic _handle(http.Response res) {
    dynamic data;
    try {
      data = jsonDecode(res.body);
    } catch (_) {
      data = null;
    }
    final map = data is Map<String, dynamic> ? data : null;

    if (res.statusCode >= 200 && res.statusCode < 300) return data;

    if (res.statusCode == 401) {
      _token = null;
      _user = null;
      onUnauthorized?.call();
      throw const ApiException(
          401, 'Anda belum masuk atau sesi sudah berakhir. Silakan login ulang.');
    }
    if (res.statusCode == 403) {
      final msg = map?['message']?.toString() ?? '';
      throw ApiException(
          403,
          msg.isEmpty
              ? 'Akses ditolak. Akun Anda tidak punya izin untuk data ini.'
              : 'Akses ditolak. $msg');
    }
    if (res.statusCode == 422) {
      throw ApiException(422, _pesan422(map));
    }
    if (res.statusCode == 429) {
      throw const ApiException(
          429, 'Terlalu banyak percobaan. Coba lagi dalam satu menit.');
    }
    if (res.statusCode == 404) {
      throw const ApiException(404, 'Data tidak ditemukan di server (404).');
    }
    if (res.statusCode >= 500) {
      throw ApiException(
          res.statusCode, 'Server sedang bermasalah (HTTP ${res.statusCode}). Coba lagi nanti.');
    }
    throw ApiException(res.statusCode,
        map?['message']?.toString() ?? 'Permintaan gagal (HTTP ${res.statusCode}).');
  }

  /// Gabungkan `message` + detail `errors` dari balasan 422 backend
  /// (kontrak Laravel/Express: `{message, errors:{field:[...]}}`).
  String _pesan422(Map<String, dynamic>? body) {
    final msg = body?['message']?.toString().trim() ?? '';
    final errors = body?['errors'];
    final detail = <String>[];
    if (errors is Map) {
      errors.forEach((_, v) {
        if (v is List && v.isNotEmpty) {
          detail.add(v.first.toString());
        } else if (v != null) {
          detail.add(v.toString());
        }
      });
    }
    final gabungan = detail.join(' ').trim();
    if (gabungan.isEmpty) {
      return msg.isEmpty ? 'Data tidak valid.' : msg;
    }
    if (msg.isEmpty || gabungan.contains(msg)) return gabungan;
    return '$msg $gabungan';
  }

  // ── Pembantu generik (dipakai halaman dashboard, kontrol, tanam, profil) ──

  /// GET JSON mentah (butuh token bila endpoint-nya dilindungi).
  Future<dynamic> getJson(String path) => _request(path);

  /// POST JSON; badan kosong dikirim sebagai `{}` agar tetap berupa POST.
  Future<dynamic> postJson(String path,
          [Map<String, dynamic>? body, Duration? batas]) =>
      _request(path, body: body ?? const <String, dynamic>{}, batas: batas);

  /// Peran efektif — meniru `roleFromLevel` di web:
  /// demo (is_demo / level demo), admin, selain itu petani.
  String get role {
    final u = _user;
    if (u == null) return 'petani';
    final level = u['level']?.toString().toLowerCase();
    if (u['is_demo'] == true || level == 'demo') return 'demo';
    if (level == 'admin') return 'admin';
    return 'petani';
  }

  // ── Endpoint ────────────────────────────────────────────────────────

  /// POST /login — sukses mengembalikan token dan menyimpannya di memori.
  Future<String> login({
    required String username,
    required String password,
  }) async {
    final data = await _request('/login', body: {
      'username': username,
      'password': password,
    });
    final token = data is Map<String, dynamic> ? data['token']?.toString() : null;
    if (token == null || token.isEmpty) {
      throw const ApiException(
          200, 'Login berhasil tetapi token tidak diterima server.');
    }
    _token = token;
    // `user` opsional dalam kontrak, tetapi selalu ada pada backend ini.
    _user = data is Map<String, dynamic> && data['user'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(data['user'] as Map)
        : null;
    return token;
  }

  /// GET /meja — daftar meja (13 kolom per baris, butuh token).
  Future<List<Meja>> fetchMeja() async {
    final data = await _request('/meja');
    if (data is! List) {
      throw const ApiException(200, 'Respons daftar meja tidak sesuai kontrak.');
    }
    return data
        .whereType<Map<String, dynamic>>()
        .map(Meja.fromMap)
        .toList(growable: false);
  }

  /// GET /monitoring/chart-data — riwayat monitoring (butuh token).
  Future<List<MonitoringEntry>> fetchMonitoring() async {
    final data = await _request('/monitoring/chart-data');
    if (data is! List) {
      throw const ApiException(
          200, 'Respons daftar monitoring tidak sesuai kontrak.');
    }
    return data
        .whereType<Map<String, dynamic>>()
        .map(MonitoringEntry.fromMap)
        .toList(growable: false);
  }

  /// GET /api/latest-sensor — polling sensor publik (tanpa token).
  Future<Map<String, dynamic>> fetchLatestSensor() async {
    final data = await _request('/api/latest-sensor');
    if (data is! Map<String, dynamic>) {
      throw const ApiException(
          200, 'Respons sensor terbaru tidak sesuai kontrak.');
    }
    return data;
  }
}
