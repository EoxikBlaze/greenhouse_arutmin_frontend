import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/dock.dart';
import '../widgets/halaman.dart';
import '../widgets/ikon.dart';
import '../widgets/kpi.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';
import '../widgets/rute.dart';
import '../widgets/tren_batang.dart';
import 'asisten_page.dart';
import 'cctv_page.dart';
import 'meja_page.dart';
import 'riwayat_monitoring_page.dart';
import 'tentang_page.dart';

/// Beranda — GET /dashboard (ringkasan semua peran). Urutan mengikuti dashboard web:
/// sapaan, kartu status, KPI sensor (pH hijau, TDS emas), grafik tren, alur tanam.
class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.api,
    this.aktif = true,
    this.onBukaTab,
  });

  final ApiService api;
  final bool aktif;

  /// Pindah ke tab dock berdasarkan labelnya ('Sensor', 'Kontrol', 'Tanam', 'Akun').
  final void Function(String label)? onBukaTab;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  Map<String, dynamic>? _data;
  String? _galat;
  bool _memuat = true;
  late final PollTimer _poll;

  /// Waktu fetch sukses terakhir; [_putus] = fetch terbaru gagal, data lama ditampilkan.
  DateTime? _sukses;
  bool _putus = false;

  /// Naik tiap muat ulang agar grafik tren ikut memuat ulang.
  int _versi = 0;

  @override
  void initState() {
    super.initState();
    _poll = PollTimer(const Duration(seconds: 15), () => _muat(senyap: true));
    _poll.atur(widget.aktif);
    _muat();
  }

  @override
  void didUpdateWidget(covariant DashboardPage old) {
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
    if (!senyap) setState(() => _memuat = true);
    try {
      final d = await widget.api.getJson('/dashboard');
      if (!mounted) return;
      setState(() {
        _data = d is Map<String, dynamic> ? d : null;
        _galat = _data == null
            ? 'Respons dashboard tidak sesuai kontrak.'
            : null;
        _memuat = false;
        if (_data != null) {
          _sukses = DateTime.now();
          _putus = false;
        }
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (!senyap || _data == null) _galat = e.message;
        if (_data != null) _putus = true;
        _memuat = false;
      });
    }
  }

  void _bukaMenu() {
    final role = widget.api.role;
    final kontrol = role == 'admin' || role == 'demo';
    void dorong(Widget w) =>
        Navigator.of(context).push(RuteHalus<void>(builder: (_) => w));
    void tab(String l) => widget.onBukaTab?.call(l);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (ctx) {
        void pilih(VoidCallback f) {
          Navigator.of(ctx).pop();
          f();
        }

        return SheetKaca(
          child: SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _GrupMenu('Ikhtisar'),
                  if (role != 'demo')
                    _ItemMenu(
                      Ikon.ai,
                      'Asisten AI',
                      () => pilih(() => dorong(AsistenPage(api: widget.api))),
                    ),
                  _ItemMenu(
                    Ikon.cctv,
                    'CCTV',
                    () => pilih(() => dorong(CctvPage(api: widget.api))),
                  ),
                  const _GrupMenu('Kebun & sensor'),
                  _ItemMenu(
                    Ikon.sensor,
                    'Sensor realtime',
                    () => pilih(() => tab('Sensor')),
                  ),
                  if (kontrol)
                    _ItemMenu(
                      Ikon.air,
                      'Kontrol air',
                      () => pilih(() => tab('Kontrol')),
                    ),
                  _ItemMenu(
                    Ikon.tanam,
                    'Tanam saya',
                    () => pilih(() => tab('Tanam')),
                  ),
                  const _GrupMenu('Data'),
                  if (role == 'admin')
                    _ItemMenu(
                      Ikon.meja,
                      'Meja tanaman',
                      () => pilih(() => dorong(MejaPage(api: widget.api))),
                    ),
                  _ItemMenu(
                    Ikon.laporan,
                    'Riwayat monitoring',
                    () => pilih(
                      () => dorong(RiwayatMonitoringPage(api: widget.api)),
                    ),
                  ),
                  const _GrupMenu('Sistem'),
                  _ItemMenu(
                    Ikon.profil,
                    'Akun',
                    () => pilih(() => tab('Akun')),
                  ),
                  _ItemMenu(
                    Ikon.info,
                    'Tentang kami',
                    () => pilih(() => dorong(const TentangPage())),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.api.user;
    final nama = judulKata(user?['username']?.toString() ?? 'Pengguna');

    return Stack(
      children: [
        RefreshIndicator(
          color: Tok.moss,
          onRefresh: () {
            setState(() => _versi++);
            return _muat(senyap: true);
          },
          child: ListView(
            padding: EdgeInsets.zero,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              HeroHeader(
                judul: '${sapaanWaktu()}, $nama',
                subjudul: 'Ringkasan greenhouse hari ini',
                trailing: _TombolMenu(onTap: _bukaMenu),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  18,
                  16,
                  DockNav.ruang(context),
                ),
                child: _isi(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _isi() {
    if (_memuat && _data == null) {
      return const Column(
        children: [
          SkeletonBox(height: 250, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 124, radius: 24),
          SizedBox(height: 12),
          SkeletonBox(height: 124, radius: 24),
        ],
      );
    }
    if (_galat != null && _data == null) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    final d = _data!;
    final iot = d['iotStatus'];
    final online = iot is Map && iot['online'] == true;
    final sensor = d['latest_sensor'];
    final wc = d['water_control'];
    final alerts = d['recent_alerts'] is List
        ? d['recent_alerts'] as List
        : const [];
    final panen = d['recent_panen'] is List
        ? d['recent_panen'] as List
        : const [];

    int n(String k) => (keDouble(d[k]) ?? 0).round();
    final batchAktif =
        n('semai_aktif') + n('peremajaan_aktif') + n('pendewasaan_aktif');
    final totalBatch =
        n('total_semai') + n('total_peremajaan') + n('total_pendewasaan');
    final s = sensor is Map ? sensor : const {};
    final kontrol = widget.api.role == 'admin' || widget.api.role == 'demo';
    final katup = wc is Map ? '${wc['valve_state'] ?? '—'}' : '—';
    final modeAir = wc is Map ? 'Mode ${wc['mode'] ?? '—'}' : '';
    final ket = online ? 'perangkat online' : 'perangkat offline';

    final kpi = <Kpi>[
      Kpi('pH', Ikon.tetes, keDouble(s['ph']), 2, '', ket, Sorot.hijau),
      Kpi(
        'Suhu air',
        Ikon.kalibrasi,
        keDouble(s['waterTemp']),
        1,
        ' °C',
        ket,
        Sorot.kaca,
      ),
      Kpi('TDS', Ikon.dosing, keDouble(s['tds']), 0, ' ppm', ket, Sorot.emas),
      Kpi(
        'Suhu udara',
        Ikon.sensor,
        keDouble(s['airTemp']),
        1,
        ' °C',
        ket,
        Sorot.kaca,
      ),
      Kpi(
        'Kelembapan',
        Ikon.air,
        keDouble(s['humidity']),
        0,
        ' %',
        ket,
        Sorot.kaca,
      ),
      Kpi(
        'Katup air',
        Ikon.tetes,
        null,
        0,
        '',
        modeAir,
        Sorot.kaca,
        teks: katup,
      ),
    ];

    final tahap = <_Tahap>[
      _Tahap('Semai', n('semai_aktif'), n('total_semai'), 'berjalan'),
      _Tahap(
        'Peremajaan',
        n('peremajaan_aktif'),
        n('total_peremajaan'),
        'berjalan',
      ),
      _Tahap(
        'Pendewasaan',
        n('pendewasaan_aktif'),
        n('total_pendewasaan'),
        'berjalan',
      ),
      _Tahap(
        'Panen',
        n('total_panen_qty'),
        n('total_panen'),
        'tanaman dipanen',
        penuh: true,
      ),
    ];

    var i = 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_putus && _sukses != null) ...[
          BannerBasi(sejak: _sukses!),
          const SizedBox(height: Tok.sp3),
        ],
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: _HeroStatus(
            online: online,
            diff: iot is Map ? '${iot['diff_text'] ?? '-'}' : '-',
            batchAktif: batchAktif,
            panenQty: n('total_panen_qty'),
            totalBatch: totalBatch,
            kontrol: kontrol,
            onTab: (l) => widget.onBukaTab?.call(l),
          ),
        ),
        const SizedBox(height: Tok.sp4),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              mainAxisExtent: 128,
            ),
            itemCount: kpi.length,
            itemBuilder: (_, k) => KartuKpi(kpi[k]),
          ),
        ),
        if (sensor is Map) ...[
          const SizedBox(height: Tok.sp2),
          Text(
            'Diperbarui ${waktuRelatif(sensor['created_at']?.toString())}',
            style: Tok.kecil,
          ),
        ],
        const SizedBox(height: Tok.sp4),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: TrenBatang(api: widget.api, versi: _versi),
        ),
        const SizedBox(height: Tok.sp4),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: _AlurTanam(tahap: tahap),
        ),
        if (wc is Map) ...[
          const SizedBox(height: Tok.sp6),
          FadeUp(
            delay: FadeUp.urutan(i++),
            child: const Eyebrow('Kontrol air'),
          ),
          const SizedBox(height: Tok.sp3),
          FadeUp(
            delay: FadeUp.urutan(i++),
            child: _RingkasAir(wc: wc),
          ),
        ],
        const SizedBox(height: Tok.sp6),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: const Eyebrow('Peringatan terbaru'),
        ),
        const SizedBox(height: Tok.sp3),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: alerts.isEmpty
                ? const _Kosong('Tidak ada peringatan. Semua aman.')
                : Column(
                    children: [
                      for (final a in alerts.whereType<Map>())
                        _BarisInfo(
                          ikon: Ikon.peringatan,
                          warna: Tok.warning,
                          judul: '${a['type'] ?? '-'}',
                          sub: '${a['value'] ?? ''}',
                          waktu: waktuRelatif(a['created_at']?.toString()),
                        ),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: Tok.sp6),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: const Eyebrow('Panen terbaru'),
        ),
        const SizedBox(height: Tok.sp3),
        FadeUp(
          delay: FadeUp.urutan(i++),
          child: Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: panen.isEmpty
                ? const _Kosong('Belum ada data panen.')
                : Column(
                    children: [
                      for (final p in panen.whereType<Map>())
                        _BarisInfo(
                          ikon: Ikon.panen,
                          warna: Tok.moss,
                          judul: '${p['nama_tanaman'] ?? 'Panen'}',
                          sub: '${p['panen_berhasil'] ?? 0} berhasil',
                          waktu: tanggalPendek(p['tgl_panen']?.toString()),
                        ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}

// ── Menu ────────────────────────────────────────────────────────────────

class _TombolMenu extends StatelessWidget {
  const _TombolMenu({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Buka menu',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withValues(alpha: 0.7),
            border: Border.all(color: Colors.white.withValues(alpha: 0.95)),
          ),
          child: const Icon(Ikon.menu, color: Tok.tinta, size: 22),
        ),
      ),
    );
  }
}

class _GrupMenu extends StatelessWidget {
  const _GrupMenu(this.teks);

  final String teks;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 4, left: 4),
      child: Text(
        teks.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.4,
          color: Tok.abuTeks,
        ),
      ),
    );
  }
}

class _ItemMenu extends StatelessWidget {
  const _ItemMenu(this.ikon, this.label, this.onTap);

  final IconData ikon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 52),
        margin: const EdgeInsets.only(top: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Tok.page.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Tok.garis),
        ),
        child: Row(
          children: [
            Icon(ikon, size: 20, color: Tok.mossGelap),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const Icon(Ikon.kanan, size: 18, color: Tok.abu),
          ],
        ),
      ),
    );
  }
}

// ── Kartu status (hero) ─────────────────────────────────────────────────

class _HeroStatus extends StatelessWidget {
  const _HeroStatus({
    required this.online,
    required this.diff,
    required this.batchAktif,
    required this.panenQty,
    required this.totalBatch,
    required this.kontrol,
    required this.onTab,
  });

  final bool online;
  final String diff;
  final int batchAktif;
  final int panenQty;
  final int totalBatch;
  final bool kontrol;
  final void Function(String label) onTab;

  Widget _mini(String label, int nilai) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.85)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Tok.kecil.copyWith(fontSize: 11.5)),
          CountUp(
            nilai: nilai.toDouble(),
            style: const TextStyle(
              fontFamily: Tok.fontJudul,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: Tok.forest,
            ),
          ),
        ],
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    return HeroKartu(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'STATUS GREENHOUSE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                    color: Tok.olive,
                  ),
                ),
              ),
              StatusPill(
                terang: true,
                berdenyut: online,
                warna: online ? Tok.moss : Tok.warning,
                teks: online ? 'Alat terhubung' : 'Alat terputus',
              ),
            ],
          ),
          const SizedBox(height: Tok.sp4),
          Text('Batch tanam berjalan', style: Tok.kecil),
          CountUp(
            nilai: batchAktif.toDouble(),
            style: const TextStyle(
              fontFamily: Tok.fontJudul,
              fontSize: 52,
              height: 1.05,
              fontWeight: FontWeight.w700,
              color: Tok.tinta,
            ),
          ),
          if (!online)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text('Bacaan terakhir: $diff', style: Tok.kecil),
            ),
          const SizedBox(height: Tok.sp4),
          Row(
            children: [
              _mini('Tanaman dipanen', panenQty),
              const SizedBox(width: 10),
              _mini('Total batch', totalBatch),
            ],
          ),
          const SizedBox(height: Tok.sp4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _Tombol(
                'Grafik sensor',
                Ikon.sensor,
                true,
                () => onTab('Sensor'),
              ),
              if (kontrol)
                _Tombol('Kontrol air', Ikon.air, false, () => onTab('Kontrol')),
              _Tombol('Tanam saya', Ikon.tanam, false, () => onTab('Tanam')),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tombol extends StatelessWidget {
  const _Tombol(this.label, this.ikon, this.primer, this.onTap);

  final String label;
  final IconData ikon;
  final bool primer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          gradient: primer ? Tok.activePill : null,
          color: primer ? null : Colors.white.withValues(alpha: 0.62),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: primer
                ? Colors.transparent
                : Colors.white.withValues(alpha: 0.95),
          ),
          boxShadow: primer
              ? const [
                  BoxShadow(
                    color: Color(0x596B9D4A),
                    blurRadius: 16,
                    spreadRadius: -4,
                    offset: Offset(0, 6),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(ikon, size: 17, color: primer ? Colors.white : Tok.tinta),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: primer ? Colors.white : Tok.tinta,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Alur tanam ──────────────────────────────────────────────────────────

class _Tahap {
  const _Tahap(
    this.label,
    this.jalan,
    this.total,
    this.ket, {
    this.penuh = false,
  });

  final String label;
  final int jalan;
  final int total;
  final String ket;

  /// Tahap akhir (panen): bilah penuh bila ada data.
  final bool penuh;
}

class _AlurTanam extends StatelessWidget {
  const _AlurTanam({required this.tahap});

  final List<_Tahap> tahap;

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Eyebrow('Alur tanam — 4 tahap'),
          const SizedBox(height: Tok.sp3),
          for (var i = 0; i < tahap.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            _BarisTahap(nomor: i + 1, t: tahap[i]),
          ],
        ],
      ),
    );
  }
}

class _BarisTahap extends StatelessWidget {
  const _BarisTahap({required this.nomor, required this.t});

  final int nomor;
  final _Tahap t;

  @override
  Widget build(BuildContext context) {
    final frac = t.penuh
        ? (t.total > 0 ? 1.0 : 0.0)
        : (t.total <= 0 ? 0.0 : (t.jalan / t.total).clamp(0.0, 1.0).toDouble());
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Tok.garis),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Tok.forest,
                ),
                child: Text(
                  '$nomor',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.label,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text('${t.jalan} ${t.ket}', style: Tok.kecil),
                  ],
                ),
              ),
              CountUp(
                nilai: t.total.toDouble(),
                style: const TextStyle(
                  fontFamily: Tok.fontJudul,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Tok.forest,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: Container(
              height: 6,
              color: Tok.mint.withValues(alpha: 0.6),
              alignment: Alignment.centerLeft,
              child: TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0, end: frac),
                duration: MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 800),
                curve: Tok.ease,
                builder: (context, v, _) => FractionallySizedBox(
                  widthFactor: v,
                  child: const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Tok.moss, Tok.emas]),
                    ),
                    child: SizedBox(height: 6),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Ringkasan tambahan ──────────────────────────────────────────────────

class _RingkasAir extends StatelessWidget {
  const _RingkasAir({required this.wc});

  final Map wc;

  @override
  Widget build(BuildContext context) {
    final mode = '${wc['mode'] ?? '-'}';
    final katup = '${wc['valve_state'] ?? '-'}';
    final buka = katup.toUpperCase() == 'OPEN' || katup.toUpperCase() == 'ON';
    return Panel(
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: (buka ? Tok.moss : Tok.abu).withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Ikon.tetes, color: buka ? Tok.moss : Tok.abu),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Katup $katup', style: Tok.h3),
                Text('Mode $mode', style: Tok.kecil),
              ],
            ),
          ),
          StatusPill(
            teks: buka ? 'Mengalir' : 'Tertutup',
            warna: buka ? Tok.moss : Tok.abu,
            berdenyut: buka,
          ),
        ],
      ),
    );
  }
}

class _BarisInfo extends StatelessWidget {
  const _BarisInfo({
    required this.ikon,
    required this.warna,
    required this.judul,
    required this.sub,
    required this.waktu,
  });

  final IconData ikon;
  final Color warna;
  final String judul;
  final String sub;
  final String waktu;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          Icon(ikon, size: 20, color: warna),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  judul,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                if (sub.isNotEmpty)
                  Text(
                    sub,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Tok.kecil,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(waktu, style: Tok.kecil),
        ],
      ),
    );
  }
}

class _Kosong extends StatelessWidget {
  const _Kosong(this.teks);

  final String teks;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Center(child: Text(teks, style: Tok.kecil)),
    );
  }
}
