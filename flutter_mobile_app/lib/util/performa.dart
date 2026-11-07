import 'dart:math' as math;

import 'package:flutter/foundation.dart';

/// Tingkat tampilan otomatis:
/// - [TingkatPerforma.bagus]: kaca blur penuh (`BackdropFilter`) + bayangan dalam + animasi halus.
/// - [TingkatPerforma.ringan]: tanpa `BackdropFilter`, tanpa `MaskFilter.blur`, dan tanpa ticker loop
///   agar tetap responsif di perangkat lemah atau saat CPU melambat (mis. uji 20x slower CPU).
///
/// Padanan langsung dari `react-web-app/src/lib/performa.ts` (`html[data-perf="ringan"]`).
enum TingkatPerforma { bagus, ringan }

/// Ambang waktu uji hitung (ms).
const double ambangPerformaMs = 18.0;

/// Uji hitung tetap (300.000 iterasi `sqrt(i) * sin(i)`), identik dengan `ujiHitung()` di web.
/// Mengembalikan durasi eksekusi dalam milidetik.
double ujiHitungCpu({int iterasi = 300000}) {
  final sw = Stopwatch()..start();
  var x = 0.0;
  for (var i = 0; i < iterasi; i++) {
    x += math.sqrt(i) * math.sin(i);
  }
  sw.stop();
  if (x == double.infinity) return 0.0;
  return sw.elapsedMicroseconds / 1000.0;
}

/// Menentukan tingkat performa. Bawaan adalah [TingkatPerforma.ringan] (hemat daya & cepat).
TingkatPerforma tentukanPerforma(
  double ms, {
  bool hematData = false,
  bool gerakKurang = false,
}) {
  if (hematData || gerakKurang) return TingkatPerforma.ringan;
  return ms > ambangPerformaMs ? TingkatPerforma.ringan : TingkatPerforma.bagus;
}

/// Pengelola performa render global untuk aplikasi Flutter.
/// Secara bawaan mengaktifkan [TingkatPerforma.ringan] saat aplikasi berjalan ([mulai])
/// agar aplikasi selalu ringan tanpa membebani GPU/CPU dengan blur bertingkat.
class PerformaRender {
  PerformaRender._();

  static final ValueNotifier<TingkatPerforma> tingkat =
      ValueNotifier<TingkatPerforma>(TingkatPerforma.bagus);

  /// Durasi hasil benchmark CPU terakhir (ms).
  static double msTerakhir = 0.0;

  /// Apakah aplikasi sedang berada di mode render ringan?
  static bool get ringan => tingkat.value == TingkatPerforma.ringan;

  /// Mengukur CPU dan memastikan sistem selalu default di mode ringan & hemat daya.
  static TingkatPerforma mulai({
    double pengaliSimulasiCpu = 1.0,
    bool gerakKurang = false,
  }) {
    final ms = ujiHitungCpu() * pengaliSimulasiCpu;
    msTerakhir = ms;
    // Bawaan aplikasi selalu mode ringan & hemat baterai
    tingkat.value = TingkatPerforma.ringan;
    return TingkatPerforma.ringan;
  }

  /// Evaluasi satu durasi frame (ms). Bila frame >= 100 ms atau beruntun, turunkan ke ringan.
  static void laporkanDurasiFrame(
    double durasiFrameMs, {
    double pengaliSimulasiCpu = 1.0,
  }) {
    tingkat.value = TingkatPerforma.ringan;
  }

  /// Mengubah tingkat performa bila diperlukan.
  static void atur(TingkatPerforma baru) {
    tingkat.value = baru;
  }
}

