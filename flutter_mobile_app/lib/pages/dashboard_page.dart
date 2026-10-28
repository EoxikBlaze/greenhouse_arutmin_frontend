import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/motion.dart';
import 'asisten_page.dart';
import 'cctv_page.dart';

/// Beranda — GET /dashboard (ringkasan semua peran).
class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

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

  @override
  Widget build(BuildContext context) {
    final user = widget.api.user;
    final nama = judulKata(user?['username']?.toString() ?? 'Pengguna');
    final iot = _data?['iotStatus'];
    final online = iot is Map && iot['online'] == true;

    return Stack(
      children: [
        RefreshIndicator(
          color: Tok.moss,
          onRefresh: () => _muat(senyap: true),
          child: ListView(
            padding: EdgeInsets.zero,
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              HeroHeader(
                judul: '${sapaanWaktu()}, $nama',
                subjudul: 'Ringkasan greenhouse hari ini',
                bawah: _data == null
                    ? null
                    : StatusPill(
                        terang: true,
                        berdenyut: online,
                        warna: online ? Tok.moss : Tok.warning,
                        teks: online
                            ? 'Perangkat IoT online'
                            : 'IoT offline · ${iot is Map ? (iot['diff_text'] ?? '-') : '-'}',
                      ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
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
          SkeletonBox(height: 92, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 92, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 160, radius: 14),
        ],
      );
    }
    if (_galat != null && _data == null) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    final d = _data!;
    final sensor = d['latest_sensor'];
    final wc = d['water_control'];
    final alerts = d['recent_alerts'] is List
        ? d['recent_alerts'] as List
        : const [];
    final panen = d['recent_panen'] is List
        ? d['recent_panen'] as List
        : const [];

    int n(String k) => (keDouble(d[k]) ?? 0).round();

    final stat = <_Stat>[
      _Stat('Tanaman', n('total_tanaman'), Icons.eco_outlined, Tok.moss),
      _Stat('Meja', n('total_meja'), Icons.grid_view_rounded, Tok.navy3),
      _Stat('Siklus', n('total_siklus'), Icons.autorenew_rounded, Tok.olive),
      _Stat(
        'Total panen',
        n('total_panen_qty'),
        Icons.shopping_basket_outlined,
        Tok.warning,
      ),
    ];

    var i = 0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_putus && _sukses != null) ...[
          BannerBasi(sejak: _sukses!),
          const SizedBox(height: 14),
        ],
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          // tanpa ini GridView menambah padding safe-area (±60 pt kosong di atas kartu)
          padding: EdgeInsets.zero,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            for (final s in stat)
              FadeUp(delay: FadeUp.urutan(i++), child: _KartuStat(s)),
          ],
        ),
        const SizedBox(height: 14),
        FadeUp(
          delay: FadeUp.urutan(4),
          child: Row(
            children: [
              if (widget.api.role != 'demo') ...[
                Expanded(
                  child: _Cepat(
                    ikon: Icons.smart_toy_outlined,
                    label: 'Asisten AI',
                    tujuan: AsistenPage(api: widget.api),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: _Cepat(
                  ikon: Icons.videocam_outlined,
                  label: 'CCTV',
                  tujuan: CctvPage(api: widget.api),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        FadeUp(delay: FadeUp.urutan(4), child: const Eyebrow('Siklus tanam')),
        const SizedBox(height: 10),
        FadeUp(
          delay: FadeUp.urutan(5),
          child: Panel(
            child: Row(
              children: [
                _Tahap('Semai', n('semai_aktif'), n('total_semai')),
                _Tahap(
                  'Peremajaan',
                  n('peremajaan_aktif'),
                  n('total_peremajaan'),
                ),
                _Tahap(
                  'Pendewasaan',
                  n('pendewasaan_aktif'),
                  n('total_pendewasaan'),
                ),
              ],
            ),
          ),
        ),
        if (sensor is Map) ...[
          const SizedBox(height: 22),
          FadeUp(
            delay: FadeUp.urutan(6),
            child: const Eyebrow('Sensor terakhir'),
          ),
          const SizedBox(height: 10),
          FadeUp(
            delay: FadeUp.urutan(7),
            child: _RingkasSensor(sensor: sensor),
          ),
        ],
        if (wc is Map) ...[
          const SizedBox(height: 22),
          FadeUp(delay: FadeUp.urutan(8), child: const Eyebrow('Kontrol air')),
          const SizedBox(height: 10),
          FadeUp(
            delay: FadeUp.urutan(9),
            child: _RingkasAir(wc: wc),
          ),
        ],
        const SizedBox(height: 22),
        FadeUp(
          delay: FadeUp.urutan(10),
          child: const Eyebrow('Peringatan terbaru'),
        ),
        const SizedBox(height: 10),
        FadeUp(
          delay: FadeUp.urutan(11),
          child: Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: alerts.isEmpty
                ? const _Kosong('Tidak ada peringatan. Semua aman.')
                : Column(
                    children: [
                      for (final a in alerts.whereType<Map>())
                        _BarisInfo(
                          ikon: Icons.warning_amber_rounded,
                          warna: Tok.warning,
                          judul: '${a['type'] ?? '-'}',
                          sub: '${a['value'] ?? ''}',
                          waktu: waktuRelatif(a['created_at']?.toString()),
                        ),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: 22),
        FadeUp(delay: FadeUp.urutan(12), child: const Eyebrow('Panen terbaru')),
        const SizedBox(height: 10),
        FadeUp(
          delay: FadeUp.urutan(13),
          child: Panel(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: panen.isEmpty
                ? const _Kosong('Belum ada data panen.')
                : Column(
                    children: [
                      for (final p in panen.whereType<Map>())
                        _BarisInfo(
                          ikon: Icons.agriculture_outlined,
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

class _Cepat extends StatelessWidget {
  const _Cepat({required this.ikon, required this.label, required this.tujuan});

  final IconData ikon;
  final String label;
  final Widget tujuan;

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      onTap: () =>
          Navigator.of(context)
              .push(MaterialPageRoute<void>(builder: (_) => tujuan)),
      child: Row(
        children: [
          Icon(ikon, color: Tok.mossGelap),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Tok.abu, size: 20),
        ],
      ),
    );
  }
}

class _Stat {
  const _Stat(this.label, this.nilai, this.ikon, this.warna);
  final String label;
  final int nilai;
  final IconData ikon;
  final Color warna;
}

class _KartuStat extends StatelessWidget {
  const _KartuStat(this.s);

  final _Stat s;

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: s.warna.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(s.ikon, size: 17, color: s.warna),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  s.label,
                  overflow: TextOverflow.ellipsis,
                  style: Tok.kecil,
                ),
              ),
            ],
          ),
          CountUp(
            nilai: s.nilai.toDouble(),
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Tok.tinta,
              letterSpacing: -0.6,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tahap extends StatelessWidget {
  const _Tahap(this.label, this.aktif, this.total);

  final String label;
  final int aktif;
  final int total;

  @override
  Widget build(BuildContext context) {
    final frac = total <= 0 ? 0.0 : (aktif / total).clamp(0.0, 1.0).toDouble();
    return Expanded(
      child: Column(
        children: [
          SizedBox(
            width: 58,
            height: 58,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0, end: frac),
              duration: const Duration(milliseconds: 900),
              curve: Tok.ease,
              builder: (context, v, _) => Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 58,
                    height: 58,
                    child: CircularProgressIndicator(
                      value: v,
                      strokeWidth: 5,
                      backgroundColor: Tok.garis,
                      color: Tok.moss,
                      strokeCap: StrokeCap.round,
                    ),
                  ),
                  Text(
                    '$aktif',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: Tok.tinta,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
          ),
          Text('aktif dari $total', style: Tok.kecil.copyWith(fontSize: 11)),
        ],
      ),
    );
  }
}

class _RingkasSensor extends StatelessWidget {
  const _RingkasSensor({required this.sensor});

  final Map sensor;

  @override
  Widget build(BuildContext context) {
    final item = <(String, String, String)>[
      ('Suhu air', fmtAngka(sensor['waterTemp']), '°C'),
      ('pH', fmtAngka(sensor['ph'], desimal: 2), ''),
      ('TDS', fmtAngka(sensor['tds'], desimal: 0), 'ppm'),
      ('Suhu udara', fmtAngka(sensor['airTemp']), '°C'),
      ('Kelembapan', fmtAngka(sensor['humidity'], desimal: 0), '%'),
    ];
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final it in item)
                Container(
                  width: 96,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Tok.page,
                    borderRadius: BorderRadius.circular(Tok.r),
                    border: Border.all(color: Tok.garis),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(it.$1, style: Tok.kecil.copyWith(fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(
                        '${it.$2}${it.$3.isEmpty ? '' : ' ${it.$3}'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Diperbarui ${waktuRelatif(sensor['created_at']?.toString())}',
            style: Tok.kecil,
          ),
        ],
      ),
    );
  }
}

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
            child: Icon(
              Icons.water_drop_outlined,
              color: buka ? Tok.moss : Tok.abu,
            ),
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
