import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_service.dart';

/// Penyimpan lokal cadangan untuk progres setup (agar bisa dilanjutkan bila aplikasi
/// ditutup saat offline atau sebelum migrasi backend tersedia).
abstract class PenyimpanSetup {
  Future<String?> baca(String kunci);
  Future<void> tulis(String kunci, String? isi);
}

class PenyimpanSetupAman implements PenyimpanSetup {
  const PenyimpanSetupAman();

  static const _simpan = FlutterSecureStorage();

  @override
  Future<String?> baca(String kunci) => _simpan.read(key: kunci);

  @override
  Future<void> tulis(String kunci, String? isi) => isi == null
      ? _simpan.delete(key: kunci)
      : _simpan.write(key: kunci, value: isi);
}

/// Satu langkah resmi SOP Semai Melon GARAP (`backend-nodejs/src/aiMelonModul.js`).
class SopSemaiLangkah {
  const SopSemaiLangkah({
    required this.kode,
    required this.judul,
    required this.durasi,
    required this.ringkasan,
    required this.detail,
  });

  final String kode;
  final String judul;
  final String durasi;
  final String ringkasan;
  final List<String> detail;
}

/// SOP Semai Melon resmi proyek (tidak diubah durasi, bahan, atau angkanya).
const List<SopSemaiLangkah> sopSemaiMelonResmi = [
  SopSemaiLangkah(
    kode: 'rendam_bawang',
    judul: '1. Perendaman & Seleksi Uji Apung',
    durasi: '1 Hari (24 Jam)',
    ringkasan: 'Rendam benih di air ekstrak bawang merah segar & seleksi uji apung.',
    detail: [
      'Rendam benih melon dalam larutan ekstrak bawang merah segar (~4–6 siung per ±150–250 mL air bersih, saring) selama 1 hari (24 jam) di wadah terbuka agar benih tetap mendapat oksigen.',
      'Uji Seleksi: Benih yang tenggelam = bernas (layak semai). Benih yang mengambang = hampa/kopong (pisahkan).',
      'Setelah 24 jam, tiriskan benih tenggelam lalu bilas ringan dengan air bersih.',
    ],
  ),
  SopSemaiLangkah(
    kode: 'peram_kain',
    judul: '2. Pemeraman di Kain Hitam Lembap',
    durasi: '2 Hari (48 Jam)',
    ringkasan: 'Peram benih di lipatan kain hitam lembap di tempat teduh/gelap.',
    detail: [
      'Letakkan benih terpilih di lipatan kain hitam bersih yang lembap (diperas, tidak tergenang becek).',
      'Simpan di tempat teduh/gelap selama 2 hari hingga cangkang pecah dan muncul calon akar putih (radikula).',
      'Cek tiap 12–24 jam supaya kain tetap lembap.',
    ],
  ),
  SopSemaiLangkah(
    kode: 'jemur_pagi',
    judul: '3. Penjemuran / Aklimatisasi Sinar Pagi',
    durasi: '2 Hari',
    ringkasan: 'Kenalkan sinar matahari pagi bertahap untuk mencegah etiolasi (kutilang).',
    detail: [
      'Setelah berkecambah, jemur di sinar matahari pagi (pukul 07.00–10.00 WIB, hindari terik siang >33°C) selama 2 hari sebelum pindah ke rockwool.',
      'Jaga kain alas tetap lembap agar akar putih halus (radikula) tidak mengering.',
    ],
  ),
  SopSemaiLangkah(
    kode: 'pindah_rockwool',
    judul: '4. Pemindahan ke Rockwool & Nutrisi Awal',
    durasi: '10–14 HSS',
    ringkasan: 'Tanam kecambah ke dadu rockwool lembap, nutrisi awal 400–600 PPM.',
    detail: [
      'Potong dadu rockwool ±2,5 × 2,5 × 2,5 cm dan basahi air bersih hingga lembap (tidak tergenang).',
      'Buat lubang ±0,5–1 cm, taruh kecambah dengan ujung akar putih menghadap ke bawah.',
      'Setelah daun lembaga (kotiledon) membuka penuh, beri nutrisi semai ringan 400–600 PPM (pH 5,8–6,5) hingga siap pindah tanam (10–14 HSS, 2–4 daun sejati).',
    ],
  ),
];

/// Hasil perhitungan Uji Lab Nutrisi (menampilkan rumus server `/iot-v41/ujilab`
/// dan rumus firmware v6 `README_v6.md` secara transparan).
class HasilUjiLabNutrisi {
  const HasilUjiLabNutrisi({
    required this.volumeSampel,
    required this.ppmAwal,
    required this.mlA,
    required this.mlB,
    required this.ppmAkhir,
    required this.perubahanPpm,
    required this.perubahanPersen,
    required this.ppmPerMlServer,
    required this.ppmPerMlAbV6,
  });

  final double volumeSampel;
  final double ppmAwal;
  final double mlA;
  final double mlB;
  final double ppmAkhir;
  final double perubahanPpm;
  final double perubahanPersen;

  /// Rumus backend `iotV41.js`: `((akhir - awal) * volume) / (ml_a + ml_b)`.
  final double ppmPerMlServer;

  /// Rumus firmware v6 `README_v6.md`: `mL A = mL B = Δppm * volume / ppm_per_ml_ab`,
  /// sehingga bila `ml_a == ml_b`, `ppm_per_ml_ab = ((akhir - awal) * volume) / ml_per_pompa` (= 2 × `ppmPerMlServer`).
  final double ppmPerMlAbV6;
}

/// Hitung hasil uji lab nutrisi. Mengembalikan `null` bila input tidak valid.
HasilUjiLabNutrisi? hitungUjiLabNutrisi({
  required double volumeSampel,
  required double ppmAwal,
  required double mlA,
  required double mlB,
  required double ppmAkhir,
}) {
  if (volumeSampel < 0.1 ||
      volumeSampel > 1000 ||
      ppmAwal < 0 ||
      ppmAkhir <= ppmAwal ||
      mlA <= 0 ||
      mlB <= 0) {
    return null;
  }
  double bulat(double v, int d) {
    var faktor = 1.0;
    for (var i = 0; i < d; i++) {
      faktor *= 10;
    }
    return (v * faktor).roundToDouble() / faktor;
  }

  final naik = ppmAkhir - ppmAwal;
  final persen = ppmAwal > 0 ? (naik / ppmAwal) * 100.0 : 100.0;
  final totalMl = mlA + mlB;
  final rataMlPerPompa = totalMl / 2.0;
  final serverPpmPerMl = (naik * volumeSampel) / totalMl;
  final v6PpmPerMlAb = (naik * volumeSampel) / rataMlPerPompa;

  return HasilUjiLabNutrisi(
    volumeSampel: bulat(volumeSampel, 2),
    ppmAwal: bulat(ppmAwal, 1),
    mlA: bulat(mlA, 2),
    mlB: bulat(mlB, 2),
    ppmAkhir: bulat(ppmAkhir, 1),
    perubahanPpm: bulat(naik, 1),
    perubahanPersen: bulat(persen, 1),
    ppmPerMlServer: bulat(serverPpmPerMl, 2),
    ppmPerMlAbV6: bulat(v6PpmPerMlAb, 2),
  );
}

/// Hitung laju pompa (mL/detik). Mengembalikan `null` bila tidak valid.
double? hitungLajuPompa({required double ml, required double detik}) {
  if (ml <= 0 || detik <= 0) return null;
  return ((ml / detik) * 100).roundToDouble() / 100;
}

/// Status prasyarat penyelesaian wizard setup.
class StatusPrasyaratSetup {
  const StatusPrasyaratSetup({
    required this.wajibTerpenuhi,
    required this.kurangWajib,
    required this.belumKonfirmasiAlat,
  });

  final bool wajibTerpenuhi;
  final List<String> kurangWajib;
  final List<String> belumKonfirmasiAlat;
}

/// Model progres wizard setup per penampung.
class SetupProgress {
  const SetupProgress({
    this.idMeja = 1,
    this.setupSelesai = false,
    this.setupSelesaiPada,
    this.langkahAktif = 0,
    this.kalibrasi = const {},
    this.tandon = const {},
    this.ujiLab = const {},
    this.tutorialSemai = const {},
    this.catatanSemai = const {},
    this.sinkronServer = true,
  });

  final int idMeja;
  final bool setupSelesai;
  final String? setupSelesaiPada;
  final int langkahAktif;
  final Map<String, dynamic> kalibrasi;
  final Map<String, dynamic> tandon;
  final Map<String, dynamic> ujiLab;
  final Map<String, bool> tutorialSemai;
  final Map<String, dynamic> catatanSemai;
  final bool sinkronServer;

  double? get volumeTandonL {
    final v = tandon['volume_l'];
    return v is num ? v.toDouble() : double.tryParse('$v');
  }

  bool get tutorialLengkap =>
      sopSemaiMelonResmi.every((s) => tutorialSemai[s.kode] == true);

  int get jumlahBenihDisemai {
    final v = catatanSemai['jumlah_disemai'];
    return v is num ? v.toInt() : int.tryParse('$v') ?? 0;
  }

  int get jumlahBenihDirencanakan {
    final v = catatanSemai['jumlah_direncanakan'];
    return v is num ? v.toInt() : int.tryParse('$v') ?? 0;
  }

  SetupProgress copyWith({
    int? idMeja,
    bool? setupSelesai,
    String? setupSelesaiPada,
    int? langkahAktif,
    Map<String, dynamic>? kalibrasi,
    Map<String, dynamic>? tandon,
    Map<String, dynamic>? ujiLab,
    Map<String, bool>? tutorialSemai,
    Map<String, dynamic>? catatanSemai,
    bool? sinkronServer,
  }) {
    return SetupProgress(
      idMeja: idMeja ?? this.idMeja,
      setupSelesai: setupSelesai ?? this.setupSelesai,
      setupSelesaiPada: setupSelesaiPada ?? this.setupSelesaiPada,
      langkahAktif: langkahAktif ?? this.langkahAktif,
      kalibrasi: kalibrasi ?? this.kalibrasi,
      tandon: tandon ?? this.tandon,
      ujiLab: ujiLab ?? this.ujiLab,
      tutorialSemai: tutorialSemai ?? this.tutorialSemai,
      catatanSemai: catatanSemai ?? this.catatanSemai,
      sinkronServer: sinkronServer ?? this.sinkronServer,
    );
  }

  Map<String, dynamic> toProgresJson() => {
    'langkah_aktif': langkahAktif,
    'kalibrasi': kalibrasi,
    'tandon': tandon,
    'uji_lab': ujiLab,
    'tutorial_semai': tutorialSemai,
    'catatan_semai': catatanSemai,
  };

  factory SetupProgress.fromApi(
    Map<String, dynamic> json, {
    bool sinkronServer = true,
  }) {
    final p = json['setup_progres'] is Map
        ? Map<String, dynamic>.from(json['setup_progres'] as Map)
        : <String, dynamic>{};
    final tutRaw = p['tutorial_semai'];
    final tut = <String, bool>{};
    if (tutRaw is Map) {
      for (final e in tutRaw.entries) {
        tut['${e.key}'] = e.value == true;
      }
    }
    return SetupProgress(
      idMeja: (json['id_meja'] as num?)?.toInt() ?? 1,
      setupSelesai: json['setup_selesai'] == true,
      setupSelesaiPada: json['setup_selesai_pada']?.toString(),
      langkahAktif: ((p['langkah_aktif'] as num?)?.toInt() ?? 0).clamp(0, 5),
      kalibrasi: p['kalibrasi'] is Map
          ? Map<String, dynamic>.from(p['kalibrasi'] as Map)
          : const {},
      tandon: p['tandon'] is Map
          ? Map<String, dynamic>.from(p['tandon'] as Map)
          : const {},
      ujiLab: p['uji_lab'] is Map
          ? Map<String, dynamic>.from(p['uji_lab'] as Map)
          : const {},
      tutorialSemai: tut,
      catatanSemai: p['catatan_semai'] is Map
          ? Map<String, dynamic>.from(p['catatan_semai'] as Map)
          : const {},
      sinkronServer: sinkronServer,
    );
  }
}

/// Evaluasi prasyarat penyelesaian wizard setup.
StatusPrasyaratSetup cekPrasyaratSelesai(SetupProgress p) {
  final kurang = <String>[];
  final belumAlat = <String>[];

  final vol = p.volumeTandonL;
  if (vol == null || vol < 5 || vol > 5000) {
    kurang.add('Volume efektif tandon (5–5000 L) belum diisi.');
  } else if (p.tandon['konfigurasi_dikonfirmasi'] != true) {
    belumAlat.add('Volume tandon belum dikonfirmasi perangkat ESP32.');
  }

  for (final k in ['ph', 'ec', 'pompa_a', 'pompa_b', 'pompa_ph_up', 'pompa_ph_down']) {
    final item = p.kalibrasi[k];
    if (item is! Map || item['tersimpan_server'] != true) {
      belumAlat.add('Kalibrasi $k belum tercatat.');
    } else if (item['dikonfirmasi_alat'] != true) {
      belumAlat.add('Kalibrasi $k belum dikonfirmasi perangkat.');
    }
  }

  if (p.ujiLab['tersimpan_server'] != true) {
    kurang.add('Hasil uji lab nutrisi belum dihitung & disimpan.');
  } else if (p.ujiLab['dikonfirmasi_alat'] != true) {
    belumAlat.add('Parameter uji lab (ppm_per_ml_ab) belum dikonfirmasi ESP32.');
  }

  if (!p.tutorialLengkap) {
    kurang.add('Checklist 4 langkah tutorial semai melon belum selesai.');
  }

  if (p.jumlahBenihDisemai <= 0) {
    kurang.add('Jumlah benih yang benar-benar disemai belum dicatat.');
  }

  return StatusPrasyaratSetup(
    wajibTerpenuhi: kurang.isEmpty,
    kurangWajib: kurang,
    belumKonfirmasiAlat: belumAlat,
  );
}

/// Layanan pembacaan dan penyimpanan status setup wizard lintas perangkat.
class SetupService {
  SetupService({PenyimpanSetup? penyimpan})
    : _penyimpan = penyimpan ?? const PenyimpanSetupAman();

  final PenyimpanSetup _penyimpan;

  String _kunciLokal(ApiService api, int idMeja) {
    final uid = api.user?['id']?.toString() ?? 'anon';
    return 'garap_setup_${uid}_$idMeja';
  }

  Future<SetupProgress> muatStatusSetup(
    ApiService api, {
    int idMeja = 1,
  }) async {
    try {
      final res = await api.getJson('/iot-v41/setup-status?id_meja=$idMeja');
      if (res is Map<String, dynamic>) {
        final progres = SetupProgress.fromApi(res, sinkronServer: true);
        await _simpanLokal(api, progres);
        return progres;
      }
    } on ApiException catch (_) {
      // Fallback ke cache lokal bila server belum bermigrasi (404) atau offline.
    }
    return _bacaLokal(api, idMeja);
  }

  Future<SetupProgress> simpanProgres(
    ApiService api,
    SetupProgress progres,
  ) async {
    await _simpanLokal(api, progres);
    if (api.role != 'admin') {
      return progres.copyWith(sinkronServer: false);
    }
    try {
      final res = await api.putJson('/iot-v41/setup-status', {
        'id_meja': progres.idMeja,
        'setup_selesai': progres.setupSelesai,
        'setup_progres': progres.toProgresJson(),
      });
      if (res is Map<String, dynamic>) {
        final sinkron = SetupProgress.fromApi(res, sinkronServer: true);
        await _simpanLokal(api, sinkron);
        return sinkron;
      }
    } on ApiException {
      return progres.copyWith(sinkronServer: false);
    }
    return progres.copyWith(sinkronServer: false);
  }

  Future<SetupProgress> tandaiSelesai(
    ApiService api,
    SetupProgress progres,
  ) {
    return simpanProgres(
      api,
      progres.copyWith(
        setupSelesai: true,
        setupSelesaiPada: DateTime.now().toIso8601String(),
      ),
    );
  }

  Future<void> _simpanLokal(ApiService api, SetupProgress p) async {
    try {
      final payload = jsonEncode({
        'id_meja': p.idMeja,
        'setup_selesai': p.setupSelesai,
        'setup_selesai_pada': p.setupSelesaiPada,
        'setup_progres': p.toProgresJson(),
      });
      await _penyimpan.tulis(_kunciLokal(api, p.idMeja), payload);
    } catch (_) {}
  }

  Future<SetupProgress> _bacaLokal(ApiService api, int idMeja) async {
    try {
      final raw = await _penyimpan.baca(_kunciLokal(api, idMeja));
      if (raw != null && raw.isNotEmpty) {
        final d = jsonDecode(raw);
        if (d is Map<String, dynamic>) {
          return SetupProgress.fromApi(d, sinkronServer: false);
        }
      }
    } catch (_) {}
    return SetupProgress(idMeja: idMeja, sinkronServer: false);
  }
}
