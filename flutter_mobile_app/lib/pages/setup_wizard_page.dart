import 'dart:async';

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/setup_service.dart';
import '../theme/tokens.dart';
import '../widgets/ikon.dart';
import '../widgets/motion.dart';
import '../util/format.dart';
import '../widgets/wizard_baru/kartu_langkah.dart';
import '../widgets/wizard_baru/kepala_wizard.dart';

/// Wizard Setup bertahap untuk pengguna baru atau penampung yang belum siap,
/// serta dapat dibuka ulang dari Pengaturan tanpa menghapus riwayat lama.
class SetupWizardPage extends StatefulWidget {
  const SetupWizardPage({
    super.key,
    required this.api,
    required this.onSelesai,
    this.progresAwal,
    this.langkahAwal,
    this.modeUlang = false,
    this.onKeluar,
    this.onLewati,
    this.tanpaAppBar = false,
    this.setupService,
  });

  final ApiService api;
  final ValueChanged<SetupProgress> onSelesai;
  final SetupProgress? progresAwal;
  final int? langkahAwal;
  final bool modeUlang;
  final VoidCallback? onKeluar;

  /// Bila diisi, header menampilkan tombol "Lewati setup". Melewati TIDAK menandai
  /// setup selesai di server; hanya menutup wizard untuk sesi ini.
  final VoidCallback? onLewati;
  final bool tanpaAppBar;
  final SetupService? setupService;

  @override
  State<SetupWizardPage> createState() => _SetupWizardPageState();
}

class _SetupWizardPageState extends State<SetupWizardPage> {
  late final SetupService _setupSvc;
  late SetupProgress _progres;
  late int _langkah;

  bool _memuat = true;
  bool _sibuk = false;
  String? _galat;
  String? _pesan;

  // Data live dari server & alat
  Map<String, dynamic>? _stateV41;
  Map<String, dynamic>? _statusAktuator;
  List<Map<String, dynamic>> _perintahTerbaru = const [];
  List<Map<String, dynamic>> _daftarTanaman = const [];
  List<Map<String, dynamic>> _daftarTanam = const [];
  late final PollTimer _poll;

  // Langkah 1 — Kalibrasi
  String _bufferPh1 = '4.01';
  String _bufferPh2 = '6.86'; // Konflik tercatat: 6.86 (Sensor.cpp/Melon) vs 7.00 (Kontrol.cpp/kalibrasi.js)
  final _bacaPh1Ctrl = TextEditingController();
  final _bacaPh2Ctrl = TextEditingController();
  final _bacaEc1Ctrl = TextEditingController();
  final _bacaEc2Ctrl = TextEditingController();
  String _pompaAktif = 'A';
  bool _gelasUkurSiap = false;
  final _detikUjiCtrl = TextEditingController(text: '15');
  final _mlTakarCtrl = TextEditingController();
  int? _idPerintahUjiPompa;

  // Langkah 2 — Volume & Isi Air
  final _volumeCtrl = TextEditingController();
  int? _idPerintahIsiAir;

  // Langkah 3 — Uji Lab Nutrisi
  final _labVolCtrl = TextEditingController(text: '1');
  final _labAwalCtrl = TextEditingController();
  final _labMlACtrl = TextEditingController();
  final _labMlBCtrl = TextEditingController();
  final _labAkhirCtrl = TextEditingController();
  HasilUjiLabNutrisi? _hasilLab;

  // Langkah 5 — Jumlah Semai
  int? _idTanamanDipilih;
  final _jumlahRencanaCtrl = TextEditingController();
  final _jumlahDisemaiCtrl = TextEditingController();

  static const _judulLangkah = [
    'Kalibrasi Alat',
    'Volume & Isi Air',
    'Uji Lab Nutrisi',
    'Tutorial Semai',
    'Jumlah Semai',
    'Selesai Setup',
  ];

  /// Nama setup di kartu header dan satu kalimat petunjuk di bawah judul.
  static const _subjudulHeader = [
    'Setup Kalibrasi',
    'Setup Penampung',
    'Setup Uji Lab',
    'Tutorial Semai',
    'Jumlah Semai',
    'Selesai Setup',
  ];
  static const _petunjuk = [
    'Kalibrasi alat sebelum mulai menanam.',
    'Atur volume dan isi air penampung.',
    'Catat hasil uji lab nutrisi.',
    'Pelajari alur semai sebelum mulai.',
    'Catat jumlah benih yang disemai.',
    'Periksa semua langkah, lalu selesaikan.',
  ];

  bool get _bolehUbah => widget.api.role == 'admin';

  @override
  void initState() {
    super.initState();
    _setupSvc = widget.setupService ?? SetupService();
    _progres = widget.progresAwal ?? const SetupProgress();
    _langkah = (widget.langkahAwal ?? _progres.langkahAktif).clamp(0, 5);
    _isiDariProgres(_progres);
    _poll = PollTimer(const Duration(seconds: 5), () => _muatStatus(senyap: true));
    _poll.atur(true);
    _muatAwal();
  }

  void _isiDariProgres(SetupProgress p) {
    final buf2 = p.kalibrasi['buffer_ph_2']?.toString();
    if (buf2 == '6.86' || buf2 == '7.00') _bufferPh2 = buf2!;
    final vol = p.volumeTandonL;
    if (vol != null && vol > 0 && _volumeCtrl.text.isEmpty) {
      _volumeCtrl.text = vol == vol.roundToDouble()
          ? vol.toInt().toString()
          : vol.toString();
    }
    if (p.ujiLab.isNotEmpty) {
      _labVolCtrl.text = '${p.ujiLab['volume_sampel'] ?? '1'}';
      _labAwalCtrl.text = '${p.ujiLab['ppm_awal'] ?? ''}';
      _labMlACtrl.text = '${p.ujiLab['ml_a'] ?? ''}';
      _labMlBCtrl.text = '${p.ujiLab['ml_b'] ?? ''}';
      _labAkhirCtrl.text = '${p.ujiLab['ppm_akhir'] ?? ''}';
      _hitungLabLokal();
    }
    if (p.catatanSemai.isNotEmpty) {
      final r = p.catatanSemai['jumlah_direncanakan'];
      final d = p.catatanSemai['jumlah_disemai'];
      if (r != null) _jumlahRencanaCtrl.text = '$r';
      if (d != null) _jumlahDisemaiCtrl.text = '$d';
      if (p.catatanSemai['id_tanaman'] is num) {
        _idTanamanDipilih = keIntWajib(p.catatanSemai['id_tanaman']);
      }
    }
  }

  @override
  void dispose() {
    _poll.dispose();
    _bacaPh1Ctrl.dispose();
    _bacaPh2Ctrl.dispose();
    _bacaEc1Ctrl.dispose();
    _bacaEc2Ctrl.dispose();
    _detikUjiCtrl.dispose();
    _mlTakarCtrl.dispose();
    _volumeCtrl.dispose();
    _labVolCtrl.dispose();
    _labAwalCtrl.dispose();
    _labMlACtrl.dispose();
    _labMlBCtrl.dispose();
    _labAkhirCtrl.dispose();
    _jumlahRencanaCtrl.dispose();
    _jumlahDisemaiCtrl.dispose();
    super.dispose();
  }

  Future<void> _muatAwal() async {
    setState(() => _memuat = true);
    try {
      if (widget.progresAwal == null) {
        final p = await _setupSvc.muatStatusSetup(widget.api);
        if (mounted) {
          _progres = p;
          if (widget.langkahAwal == null) _langkah = p.langkahAktif;
          _isiDariProgres(p);
        }
      }
      await _muatStatus(senyap: true);
    } finally {
      if (mounted) setState(() => _memuat = false);
    }
  }

  Future<void> _muatStatus({bool senyap = false}) async {
    try {
      final hasil = await Future.wait<dynamic>([
        widget.api.getJson('/iot-v41/state').catchError((_) => null),
        widget.api.getJson('/api/aktuator/status').catchError((_) => null),
        widget.api.getJson('/api/aktuator/perintah?batas=15').catchError((_) => null),
        widget.api.getJson('/tanam/pilihan').catchError((_) => null),
        widget.api.getJson('/tanam').catchError((_) => null),
      ]);
      if (!mounted) return;
      setState(() {
        if (hasil[0] is Map<String, dynamic>) {
          _stateV41 = hasil[0] as Map<String, dynamic>;
        }
        if (hasil[1] is Map<String, dynamic>) {
          _statusAktuator = hasil[1] as Map<String, dynamic>;
        }
        if (hasil[2] is Map && hasil[2]['data'] is List) {
          _perintahTerbaru = (hasil[2]['data'] as List)
              .whereType<Map<Object?, Object?>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
        if (hasil[3] is Map && hasil[3]['tanaman'] is List) {
          _daftarTanaman = (hasil[3]['tanaman'] as List)
              .whereType<Map<Object?, Object?>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          if (_idTanamanDipilih == null && _daftarTanaman.isNotEmpty) {
            final melon = _daftarTanaman.firstWhere(
              (t) => '${t['nama']}'.toLowerCase().contains('melon'),
              orElse: () => _daftarTanaman.first,
            );
            _idTanamanDipilih = keInt(melon['id']);
          }
        }
        if (hasil[4] is Map && hasil[4]['list'] is List) {
          _daftarTanam = (hasil[4]['list'] as List)
              .whereType<Map<Object?, Object?>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
        _galat = null;
      });
      _sinkronKonfirmasiPerintah();
    } catch (e) {
      if (!mounted || senyap) return;
      setState(() => _galat = e.toString());
    }
  }

  /// Periksa apakah perintah yang dikirim sebelumnya sudah mendapat konfirmasi perangkat.
  void _sinkronKonfirmasiPerintah() {
    var berubah = false;
    var tandon = Map<String, dynamic>.from(_progres.tandon);
    var ujiLab = Map<String, dynamic>.from(_progres.ujiLab);

    Map<String, dynamic>? cariPerintah(dynamic id) {
      if (id == null) return null;
      for (final p in _perintahTerbaru) {
        if ('${p['id']}' == '$id') return p;
      }
      return null;
    }

    final pTandon = cariPerintah(tandon['konfigurasi_perintah_id']);
    if (pTandon != null && pTandon['status'] == 'selesai' && tandon['konfigurasi_dikonfirmasi'] != true) {
      tandon['konfigurasi_dikonfirmasi'] = true;
      berubah = true;
    }
    final pLab = cariPerintah(ujiLab['konfigurasi_perintah_id']);
    if (pLab != null && pLab['status'] == 'selesai' && ujiLab['dikonfirmasi_alat'] != true) {
      ujiLab['dikonfirmasi_alat'] = true;
      berubah = true;
    }

    if (berubah) {
      final baru = _progres.copyWith(tandon: tandon, ujiLab: ujiLab);
      _progres = baru;
      _setupSvc.simpanProgres(widget.api, baru);
    }
  }

  Future<void> _simpanLangkah(SetupProgress baru) async {
    setState(() => _progres = baru.copyWith(langkahAktif: _langkah));
    final tersimpan = await _setupSvc.simpanProgres(widget.api, _progres);
    if (mounted) setState(() => _progres = tersimpan);
  }

  void _pindahLangkah(int tujuan) {
    final target = tujuan.clamp(0, 5);
    setState(() {
      _langkah = target;
      _pesan = null;
      _galat = null;
    });
    _simpanLangkah(_progres.copyWith(langkahAktif: target));
  }

  // ── Helper status perangkat ──

  Map<String, dynamic>? get _perangkatUtama {
    final list = _statusAktuator?['perangkat'];
    if (list is! List || list.isEmpty) return null;
    final maps = list.whereType<Map<Object?, Object?>>().map((e) => Map<String, dynamic>.from(e)).toList();
    if (maps.isEmpty) return null;
    return maps.firstWhere(
      (p) => p['kode'] == 'aktuator-01' || p['peran'] == 'gabungan',
      orElse: () => maps.first,
    );
  }

  Map<String, dynamic> get _v6 {
    final v = _statusAktuator?['v6'];
    return v is Map ? Map<String, dynamic>.from(v) : const {};
  }

  Map<String, dynamic> get _kondisi {
    final k = _stateV41?['kondisi'];
    return k is Map ? Map<String, dynamic>.from(k) : const {};
  }

  bool get _alatOnline => _perangkatUtama?['online'] == true;
  bool get _estopAktif =>
      _statusAktuator?['estop'] == true ||
      _perangkatUtama?['estop_aktif'] == true ||
      _perangkatUtama?['estop_fisik'] == true;
  bool get _bacaanSegar => _kondisi['basi'] == false;
  bool get _pemeliharaanAlatAktif {
    final p = _v6['pemeliharaan']?.toString().toLowerCase();
    return p == '1' || p == 'true' || p == 'aktif';
  }

  String? get _kunciAlat {
    final k = _v6['kunci']?.toString().trim();
    return (k != null && k.isNotEmpty) ? k : null;
  }

  bool get _adaUjiPompaBerjalan => _perintahTerbaru.any(
    (p) => p['tipe'] == 'UJI_POMPA' && (p['status'] == 'menunggu' || p['status'] == 'dikirim'),
  );

  Map<String, dynamic>? _statusPerintah(int? id) {
    if (id == null) return null;
    for (final p in _perintahTerbaru) {
      if ('${p['id']}' == '$id') return p;
    }
    return null;
  }

  // ── Aksi Langkah 1: Kalibrasi & Pemeliharaan ──

  Future<void> _kirimPemeliharaan(bool aktif) async {
    if (!_bolehUbah || _sibuk) return;
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      await widget.api.postJson('/iot-v41/pemeliharaan', {'aksi': 'pemeliharaan', 'aktif': aktif});
      await widget.api.postJson('/api/aktuator/perintah', {
        'tipe': 'PEMELIHARAAN',
        'parameter': {'aksi': aktif ? 'MULAI' : 'SELESAI'},
        'alasan': 'Setup wizard kalibrasi',
      });
      if (!mounted) return;
      setState(() {
        _pesan = aktif
            ? 'Perintah PEMELIHARAAN (MULAI) diantre. Tunggu konfirmasi alat sebelum uji pompa.'
            : 'Perintah PEMELIHARAAN (SELESAI) diantre.';
      });
      await _muatStatus(senyap: true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  Future<void> _simpanKalibrasiPh() async {
    final b1 = double.tryParse(_bacaPh1Ctrl.text.replaceAll(',', '.'));
    final b2 = double.tryParse(_bacaPh2Ctrl.text.replaceAll(',', '.'));
    if (b1 == null || b2 == null) {
      setState(() => _galat = 'Isi kedua bacaan pH saat probe dicelup ke buffer $_bufferPh1 dan $_bufferPh2.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      final res = await widget.api.postJson('/iot-v41/kalibrasi-dua-titik', {
        'sensor': 'ph',
        'baca4': b1,
        'baca7': b2,
        if (_kondisi['ph_volt'] != null) 'volt4': _kondisi['ph_volt'],
      });
      final kal = Map<String, dynamic>.from(_progres.kalibrasi);
      kal['buffer_ph_1'] = _bufferPh1;
      kal['buffer_ph_2'] = _bufferPh2;
      kal['ph'] = {
        'tersimpan_server': true,
        'dikonfirmasi_alat': res is Map && res['id_perintah'] != null ? false : false,
        'baca1': b1,
        'baca2': b2,
        'buffer1': _bufferPh1,
        'buffer2': _bufferPh2,
        'id_perintah': res is Map ? res['id_perintah'] : null,
        'waktu': DateTime.now().toIso8601String(),
      };
      await _simpanLangkah(_progres.copyWith(kalibrasi: kal));
      if (!mounted) return;
      setState(() {
        _pesan = res is Map ? (res['message']?.toString() ?? 'Kalibrasi pH dicatat.') : 'Kalibrasi pH dicatat.';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  Future<void> _simpanKalibrasiEc() async {
    final e1 = double.tryParse(_bacaEc1Ctrl.text.replaceAll(',', '.'));
    final e2 = double.tryParse(_bacaEc2Ctrl.text.replaceAll(',', '.'));
    if (e1 == null || e2 == null) {
      setState(() => _galat = 'Isi kedua bacaan EC (µS/cm) untuk larutan 1.413 dan 12.880 µS/cm.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      final res = await widget.api.postJson('/iot-v41/kalibrasi-dua-titik', {
        'sensor': 'ec',
        'baca1': e1,
        'baca2': e2,
      });
      final kal = Map<String, dynamic>.from(_progres.kalibrasi);
      kal['ec'] = {
        'tersimpan_server': true,
        'dikonfirmasi_alat': false,
        'baca1': e1,
        'baca2': e2,
        'id_perintah': res is Map ? res['id_perintah'] : null,
        'waktu': DateTime.now().toIso8601String(),
      };
      await _simpanLangkah(_progres.copyWith(kalibrasi: kal));
      if (!mounted) return;
      setState(() {
        _pesan = res is Map ? (res['message']?.toString() ?? 'Kalibrasi EC dicatat.') : 'Kalibrasi EC dicatat.';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  Future<void> _mulaiUjiPompa() async {
    if (!_bolehUbah || _sibuk) return;
    if (!_alatOnline) {
      setState(() => _galat = 'Alat sedang offline. Tidak dapat mengirim perintah uji pompa.');
      return;
    }
    if (!_pemeliharaanAlatAktif) {
      setState(() => _galat = 'Mode pemeliharaan belum dikonfirmasi aktif oleh perangkat ESP32.');
      return;
    }
    if (!_gelasUkurSiap) {
      setState(() => _galat = 'Centang konfirmasi gelas ukur siap terlebih dahulu.');
      return;
    }
    if (_adaUjiPompaBerjalan) {
      setState(() => _galat = 'Masih ada uji pompa yang sedang berjalan/antre. Tunggu selesai.');
      return;
    }
    final detik = int.tryParse(_detikUjiCtrl.text.trim());
    if (detik == null || detik < 5 || detik > 120) {
      setState(() => _galat = 'Durasi uji pompa harus 5–120 detik.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      final res = await widget.api.postJson('/iot-v41/uji-pompa', {
        'pompa': _pompaAktif,
        'detik': detik,
      });
      if (!mounted) return;
      setState(() {
        _idPerintahUjiPompa = res is Map && res['id_perintah'] is num
            ? keIntWajib(res['id_perintah'])
            : null;
        _pesan = res is Map ? res['message']?.toString() : 'Uji pompa masuk antrean.';
      });
      await _muatStatus(senyap: true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  Future<void> _simpanLajuPompa() async {
    final detik = double.tryParse(_detikUjiCtrl.text.replaceAll(',', '.'));
    final ml = double.tryParse(_mlTakarCtrl.text.replaceAll(',', '.'));
    if (detik == null || ml == null || hitungLajuPompa(ml: ml, detik: detik) == null) {
      setState(() => _galat = 'Isi durasi uji (detik) dan hasil takar gelas ukur (mL) yang valid.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      final keyPompa = _pompaAktif.toLowerCase();
      final res = await widget.api.postJson('/iot-v41/kalibrasi-pompa', {
        'pompa': keyPompa,
        'detik': detik,
        'ml': ml,
      });
      final laju = hitungLajuPompa(ml: ml, detik: detik)!;
      final kal = Map<String, dynamic>.from(_progres.kalibrasi);
      kal['pompa_$keyPompa'] = {
        'tersimpan_server': true,
        'dikonfirmasi_alat': false,
        'detik': detik,
        'ml': ml,
        'laju': laju,
        'id_perintah': res is Map ? res['id_perintah'] : null,
        'waktu': DateTime.now().toIso8601String(),
      };
      await _simpanLangkah(_progres.copyWith(kalibrasi: kal));
      if (!mounted) return;
      setState(() {
        _mlTakarCtrl.clear();
        _pesan = res is Map ? res['message']?.toString() : 'Laju pompa disimpan.';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  // ── Aksi Langkah 2: Volume & Pengisian Air ──

  Future<void> _simpanVolumeTandon() async {
    final vol = double.tryParse(_volumeCtrl.text.replaceAll(',', '.'));
    if (vol == null || vol < 5 || vol > 5000) {
      setState(() => _galat = 'Volume efektif tandon wajib 5–5000 liter (batas firmware v6).');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      await widget.api.putJson('/iot-v41/pengaturan', {'volume_l': vol.round()});
      int? idPerintah;
      try {
        final cfg = await widget.api.postJson('/api/aktuator/konfigurasi', {
          'parameter': {'volume_l': vol.round()},
          'alasan': 'Setup wizard: volume tandon',
        });
        if (cfg is Map && cfg['perintah'] is Map && cfg['perintah']['id'] is num) {
          idPerintah = keIntWajib(cfg['perintah']['id']);
        }
      } catch (_) {}
      final tandon = Map<String, dynamic>.from(_progres.tandon);
      tandon['volume_l'] = vol.round();
      tandon['tersimpan_server'] = true;
      tandon['konfigurasi_perintah_id'] = idPerintah;
      tandon['konfigurasi_dikonfirmasi'] = false;
      tandon['waktu'] = DateTime.now().toIso8601String();
      await _simpanLangkah(_progres.copyWith(tandon: tandon));
      if (!mounted) return;
      setState(() {
        _pesan = idPerintah != null
            ? 'Volume ${vol.round()} L disimpan di server dan diantre ke alat (menunggu konfirmasi perangkat).'
            : 'Volume ${vol.round()} L disimpan di server (belum dikonfirmasi perangkat).';
      });
      await _muatStatus(senyap: true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  String? _alasanBlokirIsiAir() {
    final vol = _progres.volumeTandonL;
    if (vol == null || vol < 5 || vol > 5000) {
      return 'Simpan volume efektif tandon (5–5000 L) terlebih dahulu.';
    }
    if (!_alatOnline) return 'Perangkat ESP32 sedang offline.';
    if (_estopAktif) return 'E-STOP aktif. Lepas E-STOP dan reset alat terlebih dahulu.';
    final level = _v6['level_air']?.toString().toUpperCase();
    if (level == null || level.isEmpty) {
      return 'Status pelampung (float) belum diterima dari perangkat.';
    }
    if (level == 'ERROR') return 'Pelampung (float) dalam kondisi ERROR. Periksa kabel pelampung.';
    if (level == 'PENUH') return 'Pelampung atas sudah menyatakan tandon PENUH.';
    if (_kunciAlat != null) return 'Alat terkunci ($_kunciAlat). Buka kunci terlebih dahulu.';
    return null;
  }

  Future<void> _kirimIsiAir(String aksi) async {
    if (!_bolehUbah || _sibuk) return;
    if (aksi == 'MULAI') {
      final blokir = _alasanBlokirIsiAir();
      if (blokir != null) {
        setState(() => _galat = blokir);
        return;
      }
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      final res = await widget.api.postJson('/api/aktuator/perintah', {
        'tipe': 'ISI_AIR',
        'parameter': {'penampung': _progres.idMeja, 'aksi': aksi},
        'alasan': 'Setup wizard: isi air tandon',
      });
      if (!mounted) return;
      final id = res is Map && res['perintah'] is Map && res['perintah']['id'] is num
          ? keIntWajib(res['perintah']['id'])
          : null;
      setState(() {
        _idPerintahIsiAir = id;
        _pesan = aksi == 'MULAI'
            ? 'Perintah ISI_AIR (MULAI) diantre. Tetap pantau tandon sampai perangkat melaporkan selesai.'
            : 'Perintah ISI_AIR (STOP) diantre.';
      });
      await _muatStatus(senyap: true);
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  // ── Aksi Langkah 3: Uji Lab Nutrisi ──

  void _hitungLabLokal() {
    final vol = double.tryParse(_labVolCtrl.text.replaceAll(',', '.')) ?? 0;
    final awal = double.tryParse(_labAwalCtrl.text.replaceAll(',', '.')) ?? -1;
    final mlA = double.tryParse(_labMlACtrl.text.replaceAll(',', '.')) ?? 0;
    final mlB = double.tryParse(_labMlBCtrl.text.replaceAll(',', '.')) ?? 0;
    final akhir = double.tryParse(_labAkhirCtrl.text.replaceAll(',', '.')) ?? 0;
    setState(() {
      _hasilLab = hitungUjiLabNutrisi(
        volumeSampel: vol,
        ppmAwal: awal,
        mlA: mlA,
        mlB: mlB,
        ppmAkhir: akhir,
      );
    });
  }

  Future<void> _simpanUjiLab() async {
    _hitungLabLokal();
    final h = _hasilLab;
    if (h == null) {
      setState(() => _galat = 'Periksa angka uji lab: PPM akhir harus > PPM awal, volume 0,1–1000 L, dan mL A/B > 0.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      await widget.api.postJson('/iot-v41/ujilab', {
        'jenis': 'ec',
        'volume': h.volumeSampel,
        'awal': h.ppmAwal,
        'akhir': h.ppmAkhir,
        'ml_a': h.mlA,
        'ml_b': h.mlB,
      });
      int? idPerintah;
      try {
        final cfg = await widget.api.postJson('/api/aktuator/konfigurasi', {
          'parameter': {'ppm_per_ml_ab': h.ppmPerMlAbV6},
          'alasan': 'Setup wizard: hasil uji lab nutrisi',
        });
        if (cfg is Map && cfg['perintah'] is Map && cfg['perintah']['id'] is num) {
          idPerintah = keIntWajib(cfg['perintah']['id']);
        }
      } catch (_) {}

      final dataLab = {
        'volume_sampel': h.volumeSampel,
        'ppm_awal': h.ppmAwal,
        'ml_a': h.mlA,
        'ml_b': h.mlB,
        'ppm_akhir': h.ppmAkhir,
        'perubahan_ppm': h.perubahanPpm,
        'perubahan_persen': h.perubahanPersen,
        'ppm_per_ml_server': h.ppmPerMlServer,
        'ppm_per_ml_ab_v6': h.ppmPerMlAbV6,
        'waktu': DateTime.now().toIso8601String(),
        'tersimpan_server': true,
        'dikonfirmasi_alat': false,
        'konfigurasi_perintah_id': idPerintah,
      };
      await _simpanLangkah(_progres.copyWith(ujiLab: dataLab));
      if (!mounted) return;
      setState(() {
        _pesan = idPerintah != null
            ? 'Hasil uji lab disimpan di server dan ppm_per_ml_ab (${h.ppmPerMlAbV6}) diantre ke ESP32.'
            : 'Hasil uji lab disimpan di server (konfigurasi ke alat menunggu koneksi/admin).';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  // ── Aksi Langkah 5: Jumlah Semai ──

  Future<void> _simpanJumlahSemai() async {
    final rencana = int.tryParse(_jumlahRencanaCtrl.text.trim());
    final disemai = int.tryParse(_jumlahDisemaiCtrl.text.trim());
    if (disemai == null || disemai <= 0) {
      setState(() => _galat = 'Jumlah benih yang benar-benar disemai wajib bilangan bulat > 0.');
      return;
    }
    setState(() {
      _sibuk = true;
      _galat = null;
      _pesan = null;
    });
    try {
      int? idSemai;
      String? namaTanaman;
      if (_idTanamanDipilih != null) {
        final t = _daftarTanaman.firstWhere(
          (e) => keInt(e['id']) == _idTanamanDipilih,
          orElse: () => const {},
        );
        namaTanaman = t['nama']?.toString();
      }
      final res = await widget.api.postJson('/tanam/mulai', {
        if (_idTanamanDipilih != null) 'id_tanaman': _idTanamanDipilih,
        'id_meja': _progres.idMeja,
        'jumlah_benih': disemai,
        if (rencana != null) 'keterangan': 'Rencana: $rencana benih, disemai: $disemai benih (Setup Wizard)',
      });
      if (res is Map && res['data'] is Map && res['data']['id_semai'] is num) {
        idSemai = keIntWajib(res['data']['id_semai']);
      }
      final catatan = {
        'id_tanaman': _idTanamanDipilih,
        'nama_tanaman': namaTanaman ?? 'Melon',
        'jumlah_direncanakan': rencana ?? disemai,
        'jumlah_disemai': disemai,
        'id_semai': idSemai,
        'waktu': DateTime.now().toIso8601String(),
      };
      await _simpanLangkah(_progres.copyWith(catatanSemai: catatan));
      await _muatStatus(senyap: true);
      if (!mounted) return;
      setState(() {
        _pesan = 'Catatan semai ($disemai benih) berhasil disimpan ke alur tanam.';
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _galat = e.message);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  // ── Penyelesaian Setup ──

  Future<void> _selesaikanWizard() async {
    final prasyarat = cekPrasyaratSelesai(_progres);
    if (!prasyarat.wajibTerpenuhi) {
      setState(() => _galat = prasyarat.kurangWajib.first);
      return;
    }
    setState(() => _sibuk = true);
    try {
      final akhir = await _setupSvc.tandaiSelesai(widget.api, _progres);
      if (!mounted) return;
      widget.onSelesai(akhir);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = Stack(
      children: [
        Positioned.fill(
          child: Image.asset(
            'assets/latar/beranda-melon.png',
            fit: BoxFit.cover,
            excludeFromSemantics: true,
          ),
        ),
        const Positioned.fill(child: ColoredBox(color: Color(0x40FFFFFF))),
        SafeArea(
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 840),
              child: Column(
                children: [
                  if (!widget.tanpaAppBar)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                      child: HeaderWizardKartu(
                        subjudul: widget.modeUlang
                            ? 'Panduan & Setup Alat'
                            : _subjudulHeader[_langkah],
                        onKeluar: widget.onKeluar,
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 6),
                    child: JudulWizard(petunjuk: _petunjuk[_langkah]),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: StepperBulat(
                      judul: _judulLangkah,
                      aktif: _langkah,
                      onPilih: _pindahLangkah,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 6, 20, 4),
                    child: ChipLangkah(
                      nomor: _langkah + 1,
                      jumlah: _judulLangkah.length,
                      judul: _judulLangkah[_langkah],
                      trailing: widget.onLewati == null
                          ? null
                          : TextButton(
                              onPressed: widget.onLewati,
                              style: TextButton.styleFrom(
                                minimumSize: const Size(48, 48),
                                foregroundColor: const Color(0xFF42662B),
                              ),
                              child: const Text(
                                'Lewati setup',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13.5,
                                ),
                              ),
                            ),
                    ),
                  ),
                  Expanded(
                    child: _memuat
                        ? const Center(child: CircularProgressIndicator())
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                            children: [
                              if (!_bolehUbah)
                                _BannerInfo(
                                  ikon: Ikon.kunci,
                                  warna: Tok.warningTeks,
                                  teks: 'Akun ${widget.api.role} hanya dapat melihat panduan ini. Perubahan kalibrasi & konfigurasi alat hanya oleh admin.',
                                ),
                              if (_galat != null)
                                _BannerInfo(
                                  ikon: Ikon.peringatan,
                                  warna: Tok.errorTeks,
                                  teks: _galat!,
                                ),
                              if (_pesan != null)
                                _BannerInfo(
                                  ikon: Ikon.ok,
                                  warna: Tok.hijauTeks,
                                  teks: _pesan!,
                                ),
                              if (_langkah == 0) _bangunLangkah1Kalibrasi(),
                              if (_langkah == 1) _bangunLangkah2Tandon(),
                              if (_langkah == 2) _bangunLangkah3UjiLab(),
                              if (_langkah == 3) _bangunLangkah4TutorialSemai(),
                              if (_langkah == 4) _bangunLangkah5JumlahSemai(),
                              if (_langkah == 5) _bangunLangkah6Penyelesaian(),
                            ],
                          ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: _NavigasiBawahWizard(
                      langkah: _langkah,
                      sibuk: _sibuk,
                      onSebelumnya: _langkah > 0 ? () => _pindahLangkah(_langkah - 1) : null,
                      onBerikutnya: _langkah < 5 ? () => _pindahLangkah(_langkah + 1) : null,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );

    if (widget.tanpaAppBar) return body;
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: body,
    );
  }

  // ── UI Langkah 1: Kalibrasi Alat ──

  Widget _bangunLangkah1Kalibrasi() {
    final cmdUji = _statusPerintah(_idPerintahUjiPompa);
    final pompaList = [
      ('A', 'Pompa A (Nutrisi A)'),
      ('B', 'Pompa B (Nutrisi B)'),
      ('PH_UP', 'Pompa pH Up'),
      ('PH_DOWN', 'Pompa pH Down'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _KartuStatusAlatRingkas(
          online: _alatOnline,
          segar: _bacaanSegar,
          pemeliharaan: _pemeliharaanAlatAktif,
          estop: _estopAktif,
          ph: _kondisi['ph'],
          phVolt: _kondisi['ph_volt'],
          ecUs: _kondisi['ec_us'],
          umurDetik: _kondisi['umur_detik'],
        ),
        const SizedBox(height: 12),
        KartuLangkah(
          nomor: '1',
          judul: 'Kalibrasi sensor pH',
          petunjuk: 'Persiapan: Bilas probe pH dengan air bersih, keringkan perlahan dengan tisu, lalu celupkan ke larutan buffer pertama. Tunggu angka stabil sebelum mencatat.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Tok.warning.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(Tok.rSm),
                  border: Border.all(color: Tok.warning.withValues(alpha: 0.45)),
                ),
                child: Text(
                  'Perbedaan Acuan Buffer di Proyek: Firmware Sensor.cpp & Modul Melon memakai 6.86 & 4.01, sedangkan Kontrol.cpp & kalibrasi.js memakai 7.00 & 4.01. Pilih botol buffer yang benar-benar Anda pakai:',
                  style: TextStyle(fontSize: 12.5, color: Tok.warningTeks, fontWeight: FontWeight.w600),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _bufferPh1,
                      decoration: const InputDecoration(labelText: 'Buffer 1 (Asam)'),
                      items: const [
                        DropdownMenuItem(value: '4.01', child: Text('4.01')),
                        DropdownMenuItem(value: '4.00', child: Text('4.00')),
                      ],
                      onChanged: (v) => setState(() => _bufferPh1 = v ?? '4.01'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _bufferPh2,
                      decoration: const InputDecoration(labelText: 'Buffer 2 (Netral)'),
                      items: const [
                        DropdownMenuItem(value: '6.86', child: Text('6.86')),
                        DropdownMenuItem(value: '7.00', child: Text('7.00')),
                      ],
                      onChanged: (v) => setState(() => _bufferPh2 = v ?? '6.86'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _bacaPh1Ctrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: 'Bacaan di $_bufferPh1'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _bacaPh2Ctrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: 'Bacaan di $_bufferPh2'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _bolehUbah && !_sibuk ? _simpanKalibrasiPh : null,
                icon: const Icon(Ikon.kalibrasi, size: 18),
                label: const Text('Simpan Kalibrasi pH'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        KartuLangkah(
          nomor: '2',
          judul: 'Kalibrasi sensor EC',
          petunjuk: 'Persiapan: Celupkan probe EC ke larutan standar 1.413 µS/cm dan 12.880 µS/cm secara bergantian, bilas di antaranya.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _bacaEc1Ctrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Bacaan 1.413 µS/cm'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _bacaEc2Ctrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Bacaan 12.880 µS/cm'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _bolehUbah && !_sibuk ? _simpanKalibrasiEc : null,
                icon: const Icon(Ikon.kalibrasi, size: 18),
                label: const Text('Simpan Kalibrasi EC'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        KartuLangkah(
          nomor: '3–6',
          judul: 'Uji & Kalibrasi Laju 4 Pompa',
          petunjuk: 'Satu pompa pada satu waktu. Wajib aktifkan Mode Pemeliharaan di alat dan siapkan gelas ukur sebelum menyalakan pompa uji.',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _bolehUbah && !_sibuk ? () => _kirimPemeliharaan(!_pemeliharaanAlatAktif) : null,
                      icon: Icon(_pemeliharaanAlatAktif ? Ikon.berhenti : Ikon.ambang, size: 18),
                      label: Text(_pemeliharaanAlatAktif ? 'Matikan Pemeliharaan' : 'Aktifkan Pemeliharaan di Alat'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                _pemeliharaanAlatAktif
                    ? 'Status di alat: PEMELIHARAAN AKTIF (dikonfirmasi perangkat).'
                    : 'Status di alat: BELUM AKTIF / menunggu konfirmasi perangkat.',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _pemeliharaanAlatAktif ? Tok.hijauTeks : Tok.warningTeks,
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _pompaAktif,
                decoration: const InputDecoration(labelText: 'Pilih Pompa'),
                items: [
                  for (final p in pompaList)
                    DropdownMenuItem(value: p.$1, child: Text(p.$2)),
                ],
                onChanged: (v) => setState(() => _pompaAktif = v ?? 'A'),
              ),
              CheckboxListTile(
                value: _gelasUkurSiap,
                contentPadding: EdgeInsets.zero,
                title: const Text('Gelas ukur sudah terpasang & selang terendam', style: TextStyle(fontSize: 13.5)),
                onChanged: (v) => setState(() => _gelasUkurSiap = v == true),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _detikUjiCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Durasi uji (5–120 dtk)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _mlTakarCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Hasil takar (mL)'),
                    ),
                  ),
                ],
              ),
              if (cmdUji != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Status perintah uji #${cmdUji['id']}: ${cmdUji['status']}',
                  style: TextStyle(fontSize: 12.5, color: Tok.navyTeks, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _bolehUbah && !_sibuk && !_adaUjiPompaBerjalan ? _mulaiUjiPompa : null,
                      child: Text(_adaUjiPompaBerjalan ? 'Uji Berjalan...' : 'Jalankan Uji Pompa'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: _bolehUbah && !_sibuk ? _simpanLajuPompa : null,
                      child: const Text('Simpan Laju Pompa'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _ChecklistKalibrasi(kalibrasi: _progres.kalibrasi),
            ],
          ),
        ),
      ],
    );
  }

  // ── UI Langkah 2: Volume Tandon & Isi Air ──

  Widget _bangunLangkah2Tandon() {
    final volTersimpan = _progres.volumeTandonL;
    final blokir = _alasanBlokirIsiAir();
    final level = _v6['level_air']?.toString() ?? 'BELUM DILAPORKAN';
    final cmdIsi = _statusPerintah(_idPerintahIsiAir);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Tok.warning.withValues(alpha: 0.16),
            borderRadius: BorderRadius.circular(Tok.r),
            border: Border.all(color: Tok.warning),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Ikon.peringatan, color: Tok.warningTeks, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Pengisian air wajib dipantau. Tetap berada di dekat tandon sampai alat menyatakan selesai.',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Tok.warningTeks),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        KartuLangkah(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Volume Efektif Tandon (Liter)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(
                'Isi kapasitas air kerja tandon (rentang firmware v6: 5–5000 L). Nilai ini wajib disimpan sebelum pengisian air dapat dimulai.',
                style: TextStyle(fontSize: 13, color: Tok.abuTeks),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _volumeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Volume Tandon (Liter)', hintText: 'Contoh: 100'),
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: _bolehUbah && !_sibuk ? _simpanVolumeTandon : null,
                child: const Text('Simpan Volume & Kirim ke Alat'),
              ),
              if (volTersimpan != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Tersimpan: ${volTersimpan.toStringAsFixed(0)} L · Konfirmasi alat: ${_progres.tandon['konfigurasi_dikonfirmasi'] == true ? 'Terkonfirmasi' : 'Menunggu konfirmasi'}',
                  style: TextStyle(fontSize: 12.5, color: Tok.hijauTeks, fontWeight: FontWeight.w600),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        KartuLangkah(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Status Pelampung (Float) & Pengisian Air', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('Status alat: ${_alatOnline ? 'Online' : 'Offline'} · Level float: $level', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(
                'Catatan: Sistem memakai saklar pelampung (bukan flow meter), sehingga tidak menampilkan progres liter aktual.',
                style: TextStyle(fontSize: 12.5, color: Tok.abuTeks),
              ),
              if (blokir != null) ...[
                const SizedBox(height: 10),
                Text('Tombol isi air ditahan: $blokir', style: TextStyle(fontSize: 13, color: Tok.errorTeks, fontWeight: FontWeight.w600)),
              ],
              if (cmdIsi != null) ...[
                const SizedBox(height: 8),
                Text('Status perintah ISI_AIR #${cmdIsi['id']}: ${cmdIsi['status']}', style: TextStyle(fontSize: 13, color: Tok.navyTeks, fontWeight: FontWeight.w600)),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _bolehUbah && !_sibuk && blokir == null ? () => _kirimIsiAir('MULAI') : null,
                      icon: const Icon(Ikon.air, size: 18),
                      label: const Text('Mulai Isi Air'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _bolehUbah && !_sibuk ? () => _kirimIsiAir('STOP') : null,
                      icon: const Icon(Ikon.berhenti, size: 18),
                      label: const Text('Hentikan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── UI Langkah 3: Uji Lab Nutrisi ──

  Widget _bangunLangkah3UjiLab() {
    final h = _hasilLab;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KartuLangkah(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Formulir Uji Lab Nutrisi AB Mix', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(
                'Ukur kenaikan PPM setelah mencampur larutan A dan B pada air sampel (misal 1 L atau volume terukur).',
                style: TextStyle(fontSize: 13, color: Tok.abuTeks),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _labVolCtrl,
                onChanged: (_) => _hitungLabLokal(),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Volume Sampel (Liter)'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _labAwalCtrl,
                      onChanged: (_) => _hitungLabLokal(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'PPM Awal'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _labAkhirCtrl,
                      onChanged: (_) => _hitungLabLokal(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'PPM Akhir'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _labMlACtrl,
                      onChanged: (_) => _hitungLabLokal(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Larutan A (mL)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _labMlBCtrl,
                      onChanged: (_) => _hitungLabLokal(),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Larutan B (mL)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (h != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Tok.mint.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(Tok.r),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Perubahan PPM: +${h.perubahanPpm} ppm (+${h.perubahanPersen}%)', style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text('Nilai ppm_per_ml_ab (Firmware v6): ${h.ppmPerMlAbV6} ppm/mL per pompa'),
                      Text('Nilai ppm_per_ml (Server iotV41): ${h.ppmPerMlServer} ppm/mL total (A+B)', style: TextStyle(fontSize: 12.5, color: Tok.abuTeks)),
                      const SizedBox(height: 4),
                      Text(
                        'Catatan Konflik Rumus: Server membagi dengan (mL A + mL B), sedangkan firmware v6 membagi dengan takaran per pompa (mL A = mL B). Nilai v6 dikirim ke perangkat.',
                        style: TextStyle(fontSize: 12, color: Tok.warningTeks),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _bolehUbah && !_sibuk ? _simpanUjiLab : null,
                icon: const Icon(Ikon.dosing, size: 18),
                label: const Text('Simpan Hasil Uji Lab & Kirim ke Alat'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── UI Langkah 4: Tutorial Semai Melon ──

  Widget _bangunLangkah4TutorialSemai() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final s in sopSemaiMelonResmi) ...[
          KartuLangkah(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(s.judul, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Tok.mint,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(s.durasi, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Tok.forest)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                for (final d in s.detail)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text('• $d', style: TextStyle(fontSize: 13, color: Tok.abuTeks)),
                  ),
                CheckboxListTile(
                  value: _progres.tutorialSemai[s.kode] == true,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Langkah ini sudah dipahami / dilakukan', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                  onChanged: (v) {
                    final tut = Map<String, bool>.from(_progres.tutorialSemai);
                    tut[s.kode] = v == true;
                    _simpanLangkah(_progres.copyWith(tutorialSemai: tut));
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  // ── UI Langkah 5: Jumlah Semai & Ringkasan ──

  Widget _bangunLangkah5JumlahSemai() {
    final totalDisemaiServer = _daftarTanam
        .where((e) => e['tipe'] == 'semai')
        .fold<int>(0, (acc, e) => acc + (keInt(e['jumlah_benih']) ?? 0));

    return KartuLangkah(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Pencatatan Jumlah Benih / Bibit Semai', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(
            'Catat jumlah benih yang direncanakan dan jumlah yang benar-benar disemai ke tabel tanam resmi.',
            style: TextStyle(fontSize: 13, color: Tok.abuTeks),
          ),
          const SizedBox(height: 10),
          if (_daftarTanaman.isNotEmpty)
            DropdownButtonFormField<int>(
              initialValue: _idTanamanDipilih,
              decoration: const InputDecoration(labelText: 'Komoditas / Varietas'),
              items: [
                for (final t in _daftarTanaman)
                  DropdownMenuItem(
                    value: keIntWajib(t['id']),
                    child: Text('${t['nama']}'),
                  ),
              ],
              onChanged: (v) => setState(() => _idTanamanDipilih = v),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _jumlahRencanaCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Direncanakan (benih)'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _jumlahDisemaiCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Benar-benar disemai'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _bolehUbah && !_sibuk ? _simpanJumlahSemai : null,
            icon: const Icon(Ikon.tanam, size: 18),
            label: const Text('Catat Batch Semai'),
          ),
          const SizedBox(height: 14),
          Text('Ringkasan Semai Tercatat:', style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text('• Direncanakan: ${_progres.jumlahBenihDirencanakan} benih'),
          Text('• Benar-benar disemai (wizard): ${_progres.jumlahBenihDisemai} benih'),
          Text('• Batch semai aktif di server: $totalDisemaiServer benih'),
          Text('• Bibit berhasil: belum dicatat (diisi saat pindah tahap peremajaan)', style: TextStyle(color: Tok.abuTeks, fontSize: 12.5)),
        ],
      ),
    );
  }

  // ── UI Langkah 6: Penyelesaian Setup ──

  Widget _bangunLangkah6Penyelesaian() {
    final cek = cekPrasyaratSelesai(_progres);
    return KartuLangkah(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Ringkasan Setup Penampung', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          _BarisRingkasan('Volume Tandon', _progres.volumeTandonL != null ? '${_progres.volumeTandonL!.toInt()} L' : 'Belum diisi', _progres.volumeTandonL != null),
          _BarisRingkasan('Uji Lab Nutrisi', _progres.ujiLab['tersimpan_server'] == true ? '${_progres.ujiLab['ppm_per_ml_ab_v6']} ppm/mL (v6)' : 'Belum dicatat', _progres.ujiLab['tersimpan_server'] == true),
          _BarisRingkasan('Tutorial Semai Melon', _progres.tutorialLengkap ? '4/4 langkah selesai' : 'Belum lengkap', _progres.tutorialLengkap),
          _BarisRingkasan('Jumlah Benih Disemai', _progres.jumlahBenihDisemai > 0 ? '${_progres.jumlahBenihDisemai} benih' : 'Belum dicatat', _progres.jumlahBenihDisemai > 0),
          if (cek.belumKonfirmasiAlat.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Belum Dikonfirmasi Perangkat:', style: TextStyle(fontWeight: FontWeight.w700, color: Tok.warningTeks)),
            for (final b in cek.belumKonfirmasiAlat)
              Text('• $b', style: TextStyle(fontSize: 12.5, color: Tok.warningTeks)),
          ],
          if (cek.kurangWajib.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Prasyarat Wajib Belum Terpenuhi:', style: TextStyle(fontWeight: FontWeight.w700, color: Tok.errorTeks)),
            for (final k in cek.kurangWajib)
              Text('• $k', style: TextStyle(fontSize: 12.5, color: Tok.errorTeks)),
          ],
          const SizedBox(height: 12),
          Text(
            'Catatan Keselamatan: Menyelesaikan wizard TIDAK menyalakan mode SEMAI atau dosing otomatis. Perintah semai harus dimulai secara eksplisit dari menu Pantau Semai.',
            style: TextStyle(fontSize: 12.5, color: Tok.abuTeks),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: cek.wajibTerpenuhi && !_sibuk ? _selesaikanWizard : null,
              icon: const Icon(Ikon.ok, size: 18),
              label: const Text('Selesai dan buka Dashboard'),
            ),
          ),
        ],
      ),
    );
  }
}

class _KartuStatusAlatRingkas extends StatelessWidget {
  const _KartuStatusAlatRingkas({
    required this.online,
    required this.segar,
    required this.pemeliharaan,
    required this.estop,
    this.ph,
    this.phVolt,
    this.ecUs,
    this.umurDetik,
  });

  final bool online;
  final bool segar;
  final bool pemeliharaan;
  final bool estop;
  final dynamic ph;
  final dynamic phVolt;
  final dynamic ecUs;
  final dynamic umurDetik;

  /// Angka dari backend bisa teks; stempel basi tidak boleh tampil sebagai nilai.
  String _angka(dynamic v, int desimal) {
    final d = keDouble(v);
    if (!segar || d == null) return '—';
    return d.toStringAsFixed(desimal).replaceAll('.', ',');
  }

  @override
  Widget build(BuildContext context) {
    final warnaTitik = online ? const Color(0xFF4E7733) : Tok.error;
    final garis = Container(
      width: 1,
      height: 40,
      margin: const EdgeInsets.symmetric(horizontal: 12),
      color: const Color(0xFFC9D2DC),
    );
    Widget kolom(String label, String nilai, {String? satuan, String? kecil}) =>
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(label, style: TextStyle(fontSize: 13, color: Tok.abuTeks)),
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: nilai,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0B1A2B),
                    ),
                  ),
                  if (satuan != null && nilai != '—')
                    TextSpan(
                      text: ' $satuan',
                      style: TextStyle(fontSize: 13, color: Tok.abuTeks),
                    ),
                ],
              ),
            ),
            if (kecil != null)
              Text(kecil, style: TextStyle(fontSize: 11.5, color: Tok.abuTeks)),
          ],
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.78),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.7)),
          ),
          child: Row(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(color: warnaTitik, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 7,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      online ? 'Perangkat Online' : 'Perangkat Offline',
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0B1A2B),
                      ),
                    ),
                    Text(
                      segar
                          ? 'Bacaan langsung • ${umurDetik ?? 0} dtk lalu'
                          : 'Bacaan belum tersedia atau basi',
                      style: TextStyle(fontSize: 12.5, color: Tok.abuTeks),
                    ),
                  ],
                ),
              ),
              garis,
              Expanded(
                flex: 3,
                child: kolom(
                  'pH',
                  _angka(ph, 2),
                  kecil: segar && phVolt != null ? '$phVolt V' : null,
                ),
              ),
              garis,
              Expanded(
                flex: 3,
                child: kolom(
                  'EC',
                  _angka(ecUs, 0),
                  kecil: segar && keDouble(ecUs) != null ? 'µS/cm' : null,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                segar ? Ikon.info : Ikon.peringatan,
                size: 16,
                color: segar ? Tok.abuTeks : Tok.warningTeks,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  segar
                      ? 'Angka di atas adalah bacaan langsung alat, bukan hasil akhir kalibrasi.'
                      : 'Jangan gunakan angka lama untuk kalibrasi. Tunggu bacaan segar.',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontStyle: FontStyle.italic,
                    color: segar ? Tok.abuTeks : Tok.warningTeks,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (estop)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 6),
            child: Text(
              'E-STOP AKTIF',
              style: TextStyle(
                color: Tok.errorTeks,
                fontWeight: FontWeight.w700,
                fontSize: 12.5,
              ),
            ),
          ),
      ],
    );
  }
}

class _ChecklistKalibrasi extends StatelessWidget {
  const _ChecklistKalibrasi({required this.kalibrasi});

  final Map<String, dynamic> kalibrasi;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('ph', 'Sensor pH'),
      ('ec', 'Sensor EC'),
      ('pompa_a', 'Pompa A'),
      ('pompa_b', 'Pompa B'),
      ('pompa_ph_up', 'Pompa pH Up'),
      ('pompa_ph_down', 'Pompa pH Down'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status Checklist Kalibrasi:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
        const SizedBox(height: 6),
        for (final (k, nama) in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                Icon(
                  kalibrasi[k] is Map && kalibrasi[k]['tersimpan_server'] == true ? Ikon.ok : Ikon.salah,
                  size: 16,
                  color: kalibrasi[k] is Map && kalibrasi[k]['tersimpan_server'] == true ? Tok.hijauTeks : Tok.abu,
                ),
                const SizedBox(width: 6),
                Text(nama, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
      ],
    );
  }
}

class _BarisRingkasan extends StatelessWidget {
  const _BarisRingkasan(this.label, this.nilai, this.ok);

  final String label;
  final String nilai;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(ok ? Ikon.ok : Ikon.peringatan, size: 18, color: ok ? Tok.hijauTeks : Tok.warningTeks),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(nilai, style: TextStyle(color: Tok.abuTeks)),
        ],
      ),
    );
  }
}

class _BannerInfo extends StatelessWidget {
  const _BannerInfo({required this.ikon, required this.warna, required this.teks});

  final IconData ikon;
  final Color warna;
  final String teks;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(Tok.rSm),
        border: Border.all(color: warna.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(ikon, color: warna, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(teks, style: TextStyle(fontSize: 12.5, color: warna, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

class _NavigasiBawahWizard extends StatelessWidget {
  const _NavigasiBawahWizard({
    required this.langkah,
    required this.sibuk,
    this.onSebelumnya,
    this.onBerikutnya,
  });

  final int langkah;
  final bool sibuk;
  final VoidCallback? onSebelumnya;
  final VoidCallback? onBerikutnya;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (onSebelumnya != null)
          Expanded(
            child: OutlinedButton.icon(
              onPressed: sibuk ? null : onSebelumnya,
              icon: const Icon(Ikon.kiri, size: 18),
              label: const Text('Sebelumnya'),
            ),
          ),
        if (onSebelumnya != null && onBerikutnya != null) const SizedBox(width: 10),
        if (onBerikutnya != null)
          Expanded(
            child: FilledButton.icon(
              onPressed: sibuk ? null : onBerikutnya,
              icon: const Icon(Ikon.kanan, size: 18),
              label: const Text('Lanjut'),
            ),
          ),
      ],
    );
  }
}
