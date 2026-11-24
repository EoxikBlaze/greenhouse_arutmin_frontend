import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/setup_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/dock.dart';
import '../widgets/halaman.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';
import '../widgets/navigasi_shell.dart';
import 'asisten_page.dart';
import 'cctv_page.dart';
import 'laporan_page.dart';
import 'naik_harian_page.dart';
import 'peringatan_page.dart';
import 'riwayat_monitoring_page.dart';
import 'saklar_page.dart';
import 'sensor_page.dart';
import 'setup_wizard_page.dart';
import 'uji_lab_page.dart';
import 'watercontrol_page.dart';

/// Pusat Pengaturan: akses ulang Setup Wizard (tanpa menghapus riwayat),
/// koneksi & status perangkat v6, serta fitur teknis/lanjutan yang dipindahkan.
class PengaturanPage extends StatefulWidget {
  const PengaturanPage({
    super.key,
    required this.api,
    this.aktif = true,
    this.onSetupDiperbarui,
  });

  final ApiService api;
  final bool aktif;
  final ValueChanged<SetupProgress>? onSetupDiperbarui;

  @override
  State<PengaturanPage> createState() => _PengaturanPageState();
}

class _PengaturanPageState extends State<PengaturanPage> {
  final _setupSvc = SetupService();
  SetupProgress? _progres;
  Map<String, dynamic>? _aktuator;
  Map<String, dynamic>? _keselamatan;
  List<Map<String, dynamic>> _perintah = const [];
  bool _sibuk = false;
  late final PollTimer _poll;

  bool get _admin => widget.api.role == 'admin';
  bool get _pengelola => _admin || widget.api.role == 'demo';

  @override
  void initState() {
    super.initState();
    _poll = PollTimer(const Duration(seconds: 10), () => _muat(senyap: true));
    _poll.atur(widget.aktif);
    _muat();
  }

  @override
  void didUpdateWidget(covariant PengaturanPage old) {
    super.didUpdateWidget(old);
    if (old.aktif != widget.aktif) {
      _poll.atur(widget.aktif);
      if (widget.aktif) _muat(senyap: true);
    }
  }

  @override
  void dispose() {
    _poll.dispose();
    super.dispose();
  }

  Future<void> _muat({bool senyap = false}) async {
    try {
      final p = await _setupSvc.muatStatusSetup(widget.api);
      Map<String, dynamic>? akt;
      Map<String, dynamic>? kes;
      List<Map<String, dynamic>>? per;
      if (_pengelola) {
        final hasil = await Future.wait<dynamic>([
          widget.api.getJson('/api/aktuator/status').catchError((_) => null),
          widget.api.getJson('/dashboard/keselamatan').catchError((_) => null),
          widget.api
              .getJson('/api/aktuator/perintah?batas=5')
              .catchError((_) => null),
        ]);
        if (hasil[0] is Map<String, dynamic>) akt = hasil[0] as Map<String, dynamic>;
        if (hasil[1] is Map<String, dynamic>) kes = hasil[1] as Map<String, dynamic>;
        if (hasil[2] is Map && hasil[2]['data'] is List) {
          per = (hasil[2]['data'] as List)
              .whereType<Map<Object?, Object?>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
        }
      }
      if (!mounted) return;
      setState(() {
        _progres = p;
        if (akt != null) _aktuator = akt;
        if (kes != null) _keselamatan = kes;
        if (per != null) _perintah = per;
      });
    } catch (_) {}
  }

  Future<void> _konfirmasiDarurat({required bool estop}) async {
    final demo = widget.api.role == 'demo';
    final judul = estop ? 'Jalankan E-STOP darurat?' : 'Hentikan pompa sekarang?';
    final isi = estop
        ? 'Permintaan E-STOP dikirim. Tunggu konfirmasi perangkat; jika alat tidak merespons, gunakan E-STOP fisik.'
        : 'Permintaan STOP pompa dikirim. Tunggu konfirmasi perangkat; jika pompa tidak berhenti, gunakan E-STOP fisik.';
    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (ctx) => SheetKaca(
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(judul, style: Tok.h2),
                const SizedBox(height: 8),
                Text(isi, style: Tok.body),
                const SizedBox(height: 12),
                Text(
                  'Alur: Menunggu → Terkirim → Selesai / Ditolak / Kedaluwarsa. Status Terkirim belum berarti selesai.',
                  style: Tok.kecil,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.of(ctx).pop(false),
                        child: const Text('Batal'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: Tok.error,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: demo ? null : () => Navigator.of(ctx).pop(true),
                        child: const Text('Kirim ke antrean'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (ok != true || !mounted) return;
    if (estop) {
      await _kirimAksiAlat(
        '/api/aktuator/estop',
        {'aktif': true, 'alasan': 'E-STOP darurat dari menu Alat mobile'},
        'Permintaan E-STOP darurat dikirim ke antrean.',
      );
    } else {
      await _kirimAksiAlat(
        '/api/aktuator/perintah',
        {'tipe': 'STOP', 'alasan': 'STOP pompa dari menu Alat mobile'},
        'Permintaan STOP pompa dikirim ke antrean.',
      );
    }
  }

  void _bukaKalibrasiLihatSaja() {
    final kal = _progres?.kalibrasi ?? const <String, dynamic>{};
    final ph = kal['ph'] is Map ? kal['ph'] as Map<Object?, Object?> : const <Object?, Object?>{};
    final ph4 = ph['baca4']?.toString() ?? 'Belum ada data';
    final ph6 = ph['baca7']?.toString() ?? 'Belum ada data';
    final tgl = ph['waktu']?.toString() ?? 'Belum pernah';
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (ctx) => SheetKaca(
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Data kalibrasi (baca saja)', style: Tok.h2),
                const SizedBox(height: 6),
                Text(
                  'Kalibrasi hanya menampilkan data terakhir. Pengaturan ulang dilakukan petugas di perangkat.',
                  style: Tok.kecil,
                ),
                const SizedBox(height: 14),
                _BarisRingkas('Acuan pH 4,01', ph4),
                _BarisRingkas('Acuan pH 6,86', ph6),
                _BarisRingkas('Terakhir kalibrasi', tgl),
                const SizedBox(height: 12),
                const BannerNonaktif(
                  'Hanya untuk dilihat · Tidak ada tombol jalankan kalibrasi di layar ringkasan ini.',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _bukaWizard({int? langkah}) {
    bukaHalamanApp(
      context,
      SetupWizardPage(
        api: widget.api,
        progresAwal: _progres,
        langkahAwal: langkah,
        modeUlang: true,
        tanpaAppBar: true,
        onSelesai: (baru) {
          setState(() => _progres = baru);
          widget.onSetupDiperbarui?.call(baru);
          NavigasiShellScope.maybeOf(context)?.tutupHalaman();
        },
      ),
      judul: 'Setup & Kalibrasi',
    );
  }

  Future<void> _kirimAksiAlat(String path, Map<String, dynamic> body, String sukses) async {
    if (!_admin || _sibuk) return;
    setState(() => _sibuk = true);
    try {
      await widget.api.postJson(path, body);
      if (!mounted) return;
      tampilkanPesan(context, sukses);
      await _muat(senyap: true);
    } on ApiException catch (e) {
      if (mounted) tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _sibuk = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final perangkatList = _aktuator?['perangkat'] is List ? _aktuator!['perangkat'] as List<dynamic> : <dynamic>[];
    final alat = perangkatList.whereType<Map<Object?, Object?>>().map((e) => Map<String, dynamic>.from(e)).firstOrNull;
    final v6 = _aktuator?['v6'] is Map ? Map<String, dynamic>.from(_aktuator!['v6'] as Map) : <String, dynamic>{};
    final online = alat?['online'] == true;
    final kunci = v6['kunci']?.toString() ?? '';

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: () => _muat(),
      child: ListView(
        padding: EdgeInsets.fromLTRB(16, 8, 16, DockNav.ruang(context)),
        children: [
          HeroKartu(
            padding: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Pengaturan & Pusat Alat', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  _progres?.setupSelesai == true
                      ? 'Setup penampung selesai. Anda dapat mengulang panduan kapan saja tanpa menghapus riwayat.'
                      : 'Setup penampung belum selesai. Lanjutkan wizard untuk melengkapi kalibrasi dan konfigurasi.',
                  style: TextStyle(fontSize: 13, color: Tok.abuTeks),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _bukaWizard(),
                    icon: const Icon(Ikon.kalibrasi, size: 18),
                    label: Text(_progres?.setupSelesai == true ? 'Buka Ulang Panduan Setup' : 'Lanjutkan Setup Wizard'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const _JudulGrup('Keselamatan & Darurat (S40 / S42)'),
          KacaCair(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Keselamatan',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  'Kondisi tidak diketahui tidak berarti aman. Periksa panel fisik sebelum bekerja di greenhouse.',
                  style: TextStyle(fontSize: 12.5, color: Tok.abuTeks),
                ),
                const SizedBox(height: 10),
                _BarisRingkas(
                  'E-STOP server',
                  _keselamatan == null
                      ? 'Tidak diketahui'
                      : (_keselamatan!['estop_server'] == true ? 'Aktif' : 'Normal'),
                ),
                _BarisRingkas(
                  'E-STOP perangkat',
                  _keselamatan == null
                      ? 'Tidak diketahui'
                      : (_keselamatan!['estop_alat'] == true ? 'Aktif' : 'Normal'),
                ),
                _BarisRingkas(
                  'E-STOP fisik',
                  _keselamatan == null
                      ? 'Tidak diketahui'
                      : (_keselamatan!['estop_fisik'] == true ? 'Aktif' : 'Normal'),
                ),
                _BarisRingkas(
                  'Status dosing',
                  'Terkunci (informasi)',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Tok.errorTeks,
                          side: BorderSide(color: Tok.errorTeks),
                          minimumSize: const Size(0, 48),
                        ),
                        onPressed: _admin && !_sibuk
                            ? () => _konfirmasiDarurat(estop: false)
                            : null,
                        icon: const Icon(Ikon.berhenti, size: 18),
                        label: const Text('STOP pompa'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: Tok.error,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(0, 48),
                        ),
                        onPressed: _admin && !_sibuk
                            ? () => _konfirmasiDarurat(estop: true)
                            : null,
                        icon: const Icon(Ikon.peringatan, size: 18),
                        label: const Text('E-STOP'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Dua aksi terpisah, masing-masing dengan konfirmasi sendiri: STOP pompa dan E-STOP darurat. Mode demo tidak mengirim perintah.',
                  style: TextStyle(fontSize: 11.5, color: Tok.abuTeks),
                ),
                if (_perintah.isNotEmpty) ...[
                  const Divider(height: 20),
                  const Text(
                    'Status perintah terbaru',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Alur: Menunggu → Terkirim → Selesai / Ditolak / Kedaluwarsa. Status Terkirim belum berarti selesai.',
                    style: TextStyle(fontSize: 11.5, color: Tok.abuTeks),
                  ),
                  const SizedBox(height: 8),
                  for (final p in _perintah.take(3))
                    _BarisRingkas(
                      '${p['tipe'] ?? 'PERINTAH'}',
                      '${p['status'] ?? 'menunggu'}'.toUpperCase(),
                    ),
                ],
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: _bukaKalibrasiLihatSaja,
                    icon: const Icon(Ikon.kalibrasi, size: 16),
                    label: const Text('Lihat kalibrasi (baca saja)'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const _JudulGrup('Langkah Setup & Kalibrasi'),
          KacaCair(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                _ItemPengaturan(Ikon.kalibrasi, 'Kalibrasi pH, EC & 4 Pompa', 'Uji pompa & kalibrasi sensor', () => _bukaWizard(langkah: 0)),
                _ItemPengaturan(Ikon.air, 'Volume Tandon & Pengisian Air', 'Atur liter tandon & perintah ISI_AIR', () => _bukaWizard(langkah: 1)),
                _ItemPengaturan(Ikon.dosing, 'Uji Lab Nutrisi AB Mix', 'Hitung & sinkronkan ppm_per_ml_ab', () => _bukaWizard(langkah: 2)),
                _ItemPengaturan(Ikon.tanam, 'Tutorial Semai Melon (SOP)', 'Panduan bawang merah, kain hitam & rockwool', () => _bukaWizard(langkah: 3)),
                _ItemPengaturan(Ikon.angka, 'Catatan Jumlah Semai', 'Catat benih direncanakan & disemai', () => _bukaWizard(langkah: 4)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const _JudulGrup('Koneksi & Perangkat (Firmware v6)'),
          KacaCair(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(online ? Ikon.online : Ikon.offline, size: 18, color: online ? Tok.hijauTeks : Tok.errorTeks),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        online ? 'ESP32 Online · Mode ${v6['mode'] ?? '-'}' : 'ESP32 Offline / Belum Terhubung',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                if (kunci.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Alat terkunci: $kunci', style: TextStyle(fontSize: 12.5, color: Tok.errorTeks, fontWeight: FontWeight.w600)),
                ],
                if (_admin && kunci.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: _sibuk ? null : () => _kirimAksiAlat('/api/aktuator/buka-kunci', {}, 'Perintah buka kunci dikirim ke alat.'),
                        icon: const Icon(Ikon.bukaKunci, size: 16),
                        label: const Text('Buka Kunci Alat'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          const _JudulGrup('Fitur Teknis & Pemantauan'),
          KacaCair(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                _ItemPengaturan(Ikon.sensor, 'Sensor Realtime', 'Bacaan pH, EC/TDS, suhu & kelembapan', () => bukaHalamanApp(context, SensorPage(api: widget.api), judul: 'Sensor Realtime')),
                _ItemPengaturan(Ikon.laporan, 'Riwayat Monitoring', 'Grafik & log pembacaan sensor', () => bukaHalamanApp(context, RiwayatMonitoringPage(api: widget.api, tanpaAppBar: true), judul: 'Riwayat Monitoring')),
                _ItemPengaturan(Ikon.peringatan, 'Peringatan', 'Log alert & status keselamatan', () => bukaHalamanApp(context, PeringatanPage(api: widget.api, tanpaAppBar: true), judul: 'Peringatan')),
                if (_pengelola) ...[
                  _ItemPengaturan(Ikon.ambang, 'Saklar & Gerbang Dosing', 'Status saklar izin aktuator', () => bukaHalamanApp(context, SaklarPage(api: widget.api, tanpaAppBar: true), judul: 'Saklar')),
                  _ItemPengaturan(Ikon.naik, 'Target Nutrisi (Naik Harian)', 'Atur target PPM & pH melon', () => bukaHalamanApp(context, NaikHarianPage(api: widget.api, tanpaAppBar: true), judul: 'Target Nutrisi')),
                  _ItemPengaturan(Ikon.dosing, 'Uji Lab Panen', 'Catat hasil lab buah/sayur', () => bukaHalamanApp(context, UjiLabPage(api: widget.api, tanpaAppBar: true), judul: 'Uji Lab')),
                  _ItemPengaturan(Ikon.laporan, 'Laporan PDF & Rekap', 'Unduh ringkasan laporan kebun', () => bukaHalamanApp(context, LaporanPage(api: widget.api), judul: 'Laporan')),
                  _ItemPengaturan(Ikon.cctv, 'CCTV Greenhouse', 'Pantau kamera RTSP', () => bukaHalamanApp(context, CctvPage(api: widget.api, tanpaAppBar: true), judul: 'CCTV')),
                  _ItemPengaturan(Ikon.air, 'Status Kontrol Air Lama', 'Arsip baca-saja (endpoint tulis nonaktif)', () => bukaHalamanApp(context, WaterControlPage(api: widget.api, aktif: true), judul: 'Kontrol Air')),
                ],
                if (widget.api.role != 'demo')
                  _ItemPengaturan(Ikon.ai, 'Asisten AI GARAP', 'Tanya agronomi & diagnosa melon', () => bukaHalamanApp(context, AsistenPage(api: widget.api, tanpaAppBar: true), judul: 'Asisten GARAP')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BarisRingkas extends StatelessWidget {
  const _BarisRingkas(this.label, this.nilai);

  final String label;
  final String nilai;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              label,
              style: TextStyle(fontSize: 13, color: Tok.abuTeks),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            nilai,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Tok.tinta,
            ),
          ),
        ],
      ),
    );
  }
}

class _JudulGrup extends StatelessWidget {
  const _JudulGrup(this.teks);

  final String teks;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 6),
      child: Text(teks, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Tok.abuTeks)),
    );
  }
}

class _ItemPengaturan extends StatelessWidget {
  const _ItemPengaturan(this.ikon, this.judul, this.subjudul, this.onTap);

  final IconData ikon;
  final String judul;
  final String subjudul;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(ikon, size: 20, color: Tok.hijauTeks),
      title: Text(judul, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
      subtitle: Text(subjudul, style: TextStyle(fontSize: 12, color: Tok.abuTeks)),
      trailing: const Icon(Ikon.kanan, size: 18),
      onTap: onTap,
    );
  }
}
