import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

/// Tingkat tampilan otomatis:
/// - [TingkatPerforma.bagus]: kaca blur penuh (`BackdropFilter`) + bayangan dalam + animasi halus.
/// - [TingkatPerforma.ringan]: tanpa `BackdropFilter`, tanpa `MaskFilter.blur`, dan tanpa ticker loop
///   agar tetap responsif di perangkat lemah atau saat CPU melambat (mis. uji 20x slower CPU).
///
/// Padanan langsung dari `react-web-app/src/lib/performa.ts` (`html[data-perf="ringan"]`).
enum TingkatPerforma { bagus, ringan }

/// Ambang waktu uji hitung (ms). Di perangkat normal ±1–4 ms; pada CPU yang melambat
/// (mis. 20x slower CPU) nilainya > 18 ms sehingga otomatis turun ke [TingkatPerforma.ringan].
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
  // Gunakan x agar loop tidak dieliminasi kompiler AOT/JIT.
  if (x == double.infinity) return 0.0;
  return sw.elapsedMicroseconds / 1000.0;
}

/// Menentukan tingkat performa dari hasil ukur `ms` dan opsi aksesibilitas/hemat daya.
TingkatPerforma tentukanPerforma(
  double ms, {
  bool hematData = false,
  bool gerakKurang = false,
}) {
  if (hematData || gerakKurang) return TingkatPerforma.ringan;
  return ms > ambangPerformaMs ? TingkatPerforma.ringan : TingkatPerforma.bagus;
}

/// Pengelola performa render global untuk aplikasi Flutter.
///
/// Mengukur kecepatan CPU saat aplikasi dimulai ([mulai]) dan memantau `FrameTiming`
/// secara langsung (padanan `PerformanceObserver('longtask')` di web). Bila terdeteksi
/// frame berat beruntun (mis. saat perangkat melambat 20x atau panas), sistem render
/// otomatis diturunkan ke [TingkatPerforma.ringan] tanpa memutus interaksi pengguna.
class PerformaRender {
  PerformaRender._();

  static final ValueNotifier<TingkatPerforma> tingkat =
      ValueNotifier<TingkatPerforma>(TingkatPerforma.bagus);

  /// Durasi hasil benchmark CPU terakhir (ms).
  static double msTerakhir = 0.0;

  static bool _terpasang = false;
  static int _frameLambatBeruntun = 0;

  /// Apakah aplikasi sedang berada di mode render ringan?
  static bool get ringan => tingkat.value == TingkatPerforma.ringan;

  /// Mengukur CPU saat startup dan memasang pemantau frame lambat (`FrameTiming`).
  ///
  /// [pengaliSimulasiCpu] dapat diisi `20.0` pada pengujian untuk mensimulasikan
  /// kondisi **20x slower CPU** secara deterministik.
  static TingkatPerforma mulai({
    double pengaliSimulasiCpu = 1.0,
    bool gerakKurang = false,
  }) {
    final pertama = ujiHitungCpu() * pengaliSimulasiCpu;
    // Uji kedua hanya bila sampel pertama berada di zona ragu (18–45 ms karena GC sesaat).
    final ms = (pertama > ambangPerformaMs && pertama <= ambangPerformaMs * 2.5)
        ? math.min(pertama, ujiHitungCpu() * pengaliSimulasiCpu)
        : pertama;
    msTerakhir = ms;
    final hasil = tentukanPerforma(ms, gerakKurang: gerakKurang);
    tingkat.value = hasil;
    _frameLambatBeruntun = 0;

    if (hasil == TingkatPerforma.bagus && !_terpasang) {
      try {
        SchedulerBinding.instance.addTimingsCallback(_pantauFrame);
        _terpasang = true;
      } catch (_) {
        // Binding belum siap di unit test murni.
      }
    }
    return hasil;
  }

  /// Dipanggil otomatis oleh `SchedulerBinding` setiap beberapa frame, atau langsung dari pengujian.
  static void _pantauFrame(List<FrameTiming> timings) {
    if (tingkat.value == TingkatPerforma.ringan) return;
    for (final t in timings) {
      final totalMs = t.totalSpan.inMicroseconds / 1000.0;
      final kerjaMs =
          (t.buildDuration.inMicroseconds + t.rasterDuration.inMicroseconds) /
          1000.0;
      laporkanDurasiFrame(math.max(totalMs, kerjaMs));
      if (tingkat.value == TingkatPerforma.ringan) break;
    }
  }

  /// Evaluasi satu durasi frame (ms). Bila frame >= 100 ms (setara Long Task di web)
  /// dan CPU melambat, atau 3 frame berturut-turut >= 45 ms, turunkan ke [TingkatPerforma.ringan].
  static void laporkanDurasiFrame(
    double durasiFrameMs, {
    double pengaliSimulasiCpu = 1.0,
  }) {
    if (tingkat.value == TingkatPerforma.ringan) return;
    if (durasiFrameMs >= 100.0) {
      final cekCpu = ujiHitungCpu() * pengaliSimulasiCpu;
      msTerakhir = cekCpu;
      if (cekCpu > ambangPerformaMs || durasiFrameMs >= 150.0) {
        tingkat.value = TingkatPerforma.ringan;
        _frameLambatBeruntun = 0;
        return;
      }
    }
    if (durasiFrameMs >= 45.0) {
      _frameLambatBeruntun++;
      if (_frameLambatBeruntun >= 3) {
        tingkat.value = TingkatPerforma.ringan;
        _frameLambatBeruntun = 0;
      }
    } else {
      _frameLambatBeruntun = 0;
    }
  }

  /// Mengubah tingkat performa secara manual (mis. dari halaman Akun atau pengujian).
  static void atur(TingkatPerforma baru) {
    _frameLambatBeruntun = 0;
    tingkat.value = baru;
  }
}
