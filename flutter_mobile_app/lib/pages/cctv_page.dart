import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/motion.dart';

/// CCTV — daftar kamera dari GET /cctv. Snapshot/MJPEG ditarik langsung dari
/// URL kamera; kamera RTSP (EZVIZ dkk.) lewat server: GET /cctv/:id/gambar.
class CctvPage extends StatefulWidget {
  const CctvPage({super.key, required this.api});

  final ApiService api;

  @override
  State<CctvPage> createState() => _CctvPageState();
}

class _CctvPageState extends State<CctvPage> {
  List<Map<String, dynamic>> _list = const [];
  String? _galat;
  bool _memuat = true;

  @override
  void initState() {
    super.initState();
    _muat();
  }

  Future<void> _muat({bool senyap = false}) async {
    if (!senyap) setState(() => _memuat = true);
    try {
      final d = await widget.api.getJson('/cctv');
      if (!mounted) return;
      final l = d is Map && d['list'] is List ? d['list'] as List : null;
      setState(() {
        if (l == null) {
          _galat = 'Respons CCTV tidak sesuai kontrak.';
        } else {
          _list = l
              .whereType<Map>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          _galat = null;
        }
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (_list.isEmpty) _galat = e.message;
        _memuat = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Tok.page,
      appBar: AppBar(title: const Text('CCTV greenhouse')),
      body: RefreshIndicator(
        color: Tok.moss,
        onRefresh: () => _muat(senyap: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: _isi(),
        ),
      ),
    );
  }

  List<Widget> _isi() {
    if (_memuat && _list.isEmpty) {
      return const [
        SkeletonBox(height: 220, radius: 14),
        SizedBox(height: 14),
        SkeletonBox(height: 220, radius: 14),
      ];
    }
    if (_galat != null && _list.isEmpty) {
      return [ErrorPanel(pesan: _galat!, onCoba: _muat)];
    }
    if (_list.isEmpty) {
      return const [
        Panel(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 28),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.videocam_off_outlined, size: 40, color: Tok.abu),
                  SizedBox(height: 8),
                  Text('Belum ada kamera', style: Tok.h3),
                  SizedBox(height: 4),
                  Text(
                    'Admin dapat menambahkan kamera lewat website.',
                    style: Tok.kecil,
                  ),
                ],
              ),
            ),
          ),
        ),
      ];
    }
    var i = 0;
    return [
      for (final k in _list)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: FadeUp(
            key: ValueKey('cam-${k['id']}'),
            delay: FadeUp.urutan(i++),
            child: _KartuKamera(data: k, api: widget.api),
          ),
        ),
    ];
  }
}

class _KartuKamera extends StatelessWidget {
  const _KartuKamera({required this.data, required this.api});

  final Map<String, dynamic> data;
  final ApiService api;

  @override
  Widget build(BuildContext context) {
    final aktif = data['aktif'] == true;
    final tipe = '${data['tipe']}';
    final detik = (data['interval_detik'] is num)
        ? (data['interval_detik'] as num).toInt()
        : 5;
    return Panel(
      padding: EdgeInsets.zero,
      onTap: aktif
          ? () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => _TayanganBesar(data: data, api: api),
              ),
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(Tok.rLg),
            ),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: aktif
                  ? Feed(data: data, api: api)
                  : const ColoredBox(
                      color: Tok.navy,
                      child: Center(
                        child: Text(
                          'Kamera dinonaktifkan',
                          style: TextStyle(color: Colors.white70),
                        ),
                      ),
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${data['nama'] ?? 'Kamera'}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Tok.h3,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${data['lokasi'] ?? 'Tanpa lokasi'} · '
                        '${tipe == 'mjpeg'
                            ? 'Aliran MJPEG'
                            : tipe == 'rtsp'
                            ? 'RTSP lewat server · $detik dtk'
                            : 'Snapshot tiap $detik dtk'}',
                        style: Tok.kecil,
                      ),
                    ],
                  ),
                ),
                if (aktif) const Icon(Icons.fullscreen_rounded, color: Tok.abu),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TayanganBesar extends StatelessWidget {
  const _TayanganBesar({required this.data, required this.api});

  final Map<String, dynamic> data;
  final ApiService api;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(title: Text('${data['nama'] ?? 'Kamera'}')),
      body: Center(
        child: InteractiveViewer(
          maxScale: 4,
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Feed(data: data, api: api),
          ),
        ),
      ),
    );
  }
}

/// Tayangan satu kamera: snapshot berkala, aliran MJPEG, atau RTSP lewat server.
class Feed extends StatelessWidget {
  const Feed({super.key, required this.data, required this.api});

  final Map<String, dynamic> data;
  final ApiService api;

  @override
  Widget build(BuildContext context) {
    if (data['tipe'] == 'rtsp') {
      final detik = (data['interval_detik'] is num)
          ? (data['interval_detik'] as num).toInt().clamp(1, 60)
          : 5;
      return _RtspView(api: api, id: '${data['id']}', detik: detik);
    }
    final url = '${data['url']}';
    final uri = Uri.tryParse(url);
    final sah = uri != null && (uri.scheme == 'http' || uri.scheme == 'https');
    if (!sah) return const _Terputus(pesan: 'URL kamera tidak valid.');
    if (data['tipe'] == 'mjpeg') return _MjpegView(url: url);
    final detik = (data['interval_detik'] is num)
        ? (data['interval_detik'] as num).toInt().clamp(1, 60)
        : 5;
    return _SnapshotView(url: url, detik: detik);
  }
}

class _Terputus extends StatelessWidget {
  const _Terputus({this.pesan = 'Feed terputus', this.onCoba});

  final String pesan;
  final VoidCallback? onCoba;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Tok.navy,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.videocam_off_outlined, color: Colors.white70),
            const SizedBox(height: 6),
            Text(pesan, style: const TextStyle(color: Colors.white70)),
            if (onCoba != null)
              TextButton(onPressed: onCoba, child: const Text('Coba lagi')),
          ],
        ),
      ),
    );
  }
}

String _sambung(String url, int t) =>
    '$url${url.contains('?') ? '&' : '?'}_t=$t';

class _SnapshotView extends StatefulWidget {
  const _SnapshotView({required this.url, required this.detik});

  final String url;
  final int detik;

  @override
  State<_SnapshotView> createState() => _SnapshotViewState();
}

class _SnapshotViewState extends State<_SnapshotView> {
  late final PollTimer _poll;
  int _tik = DateTime.now().millisecondsSinceEpoch;

  @override
  void initState() {
    super.initState();
    _poll = PollTimer(Duration(seconds: widget.detik), () {
      if (mounted) setState(() => _tik = DateTime.now().millisecondsSinceEpoch);
    });
    _poll.atur(true);
  }

  @override
  void dispose() {
    _poll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: Tok.navy),
        Image.network(
          _sambung(widget.url, _tik),
          fit: BoxFit.cover,
          gaplessPlayback: true,
          errorBuilder: (context, error, stack) => _Terputus(
            onCoba: () =>
                setState(() => _tik = DateTime.now().millisecondsSinceEpoch),
          ),
        ),
        const Positioned(left: 10, top: 10, child: _Live()),
      ],
    );
  }
}

/// Kamera RTSP: server mengambil frame (ffmpeg) → JPEG lewat API berkunci token,
/// dimuat ulang tiap [detik]. Tidak pernah dua unduhan sekaligus.
class _RtspView extends StatefulWidget {
  const _RtspView({required this.api, required this.id, required this.detik});

  final ApiService api;
  final String id;
  final int detik;

  @override
  State<_RtspView> createState() => _RtspViewState();
}

class _RtspViewState extends State<_RtspView> {
  late final PollTimer _poll;
  Uint8List? _frame;
  bool _gagal = false;
  bool _sibuk = false;

  @override
  void initState() {
    super.initState();
    _ambil();
    _poll = PollTimer(Duration(seconds: widget.detik), _ambil);
    _poll.atur(true);
  }

  Future<void> _ambil() async {
    if (_sibuk) return;
    _sibuk = true;
    try {
      final f = await widget.api.getBytes('/cctv/${widget.id}/gambar');
      if (!mounted) return;
      setState(() {
        _frame = f;
        _gagal = false;
      });
    } catch (_) {
      if (mounted) setState(() => _gagal = true);
    } finally {
      _sibuk = false;
    }
  }

  @override
  void dispose() {
    _poll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final f = _frame;
    if (f == null) {
      return _gagal
          ? _Terputus(pesan: 'Kamera tidak merespons', onCoba: _ambil)
          : const ColoredBox(
              color: Tok.navy,
              child: Center(
                child: CircularProgressIndicator(color: Colors.white70),
              ),
            );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: Tok.navy),
        Image.memory(f, fit: BoxFit.cover, gaplessPlayback: true),
        const Positioned(left: 10, top: 10, child: _Live()),
      ],
    );
  }
}

class _Live extends StatelessWidget {
  const _Live();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          PulseDot(color: Color(0xFFE5484D), size: 7),
          SizedBox(width: 6),
          Text(
            'LIVE',
            style: TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/// Penonton aliran MJPEG: membaca byte stream lalu memotong frame JPEG
/// (penanda awal FFD8, akhir FFD9) dan menampilkan frame terbaru.
class _MjpegView extends StatefulWidget {
  const _MjpegView({required this.url});

  final String url;

  @override
  State<_MjpegView> createState() => _MjpegViewState();
}

class _MjpegViewState extends State<_MjpegView> {
  http.Client? _client;
  StreamSubscription<List<int>>? _sub;
  Uint8List? _frame;
  bool _galat = false;

  @override
  void initState() {
    super.initState();
    _mulai();
  }

  @override
  void dispose() {
    _sub?.cancel();
    _client?.close();
    super.dispose();
  }

  Future<void> _mulai() async {
    _sub?.cancel();
    _client?.close();
    _galat = false;
    final client = http.Client();
    _client = client;
    try {
      final res = await client
          .send(http.Request('GET', Uri.parse(widget.url)))
          .timeout(const Duration(seconds: 10));
      if (!mounted) return;
      if (res.statusCode != 200) throw Exception('http_${res.statusCode}');
      final buf = <int>[];
      _sub = res.stream.listen(
        (chunk) {
          buf.addAll(chunk);
          if (buf.length > 4 * 1024 * 1024) buf.clear(); // pagar memori
          Uint8List? terakhir;
          while (true) {
            final awal = _cari(buf, 0xD8, 0);
            if (awal < 0) {
              buf.clear();
              break;
            }
            final akhir = _cari(buf, 0xD9, awal + 2);
            if (akhir < 0) {
              if (awal > 0) buf.removeRange(0, awal);
              break;
            }
            terakhir = Uint8List.fromList(buf.sublist(awal, akhir + 2));
            buf.removeRange(0, akhir + 2);
          }
          if (terakhir != null && mounted) setState(() => _frame = terakhir);
        },
        onError: (_) {
          if (mounted) setState(() => _galat = true);
        },
        onDone: () {
          if (mounted) setState(() => _galat = true);
        },
        cancelOnError: true,
      );
    } catch (_) {
      if (mounted) setState(() => _galat = true);
    }
  }

  /// Indeks pasangan byte FF [kedua] mulai dari [dari]; -1 bila tak ada.
  int _cari(List<int> b, int kedua, int dari) {
    for (var i = dari; i < b.length - 1; i++) {
      if (b[i] == 0xFF && b[i + 1] == kedua) return i;
    }
    return -1;
  }

  @override
  Widget build(BuildContext context) {
    if (_galat) {
      return _Terputus(
        onCoba: () {
          setState(() => _galat = false);
          _mulai();
        },
      );
    }
    final f = _frame;
    return Stack(
      fit: StackFit.expand,
      children: [
        const ColoredBox(color: Tok.navy),
        if (f != null)
          Image.memory(f, fit: BoxFit.cover, gaplessPlayback: true)
        else
          const Center(child: CircularProgressIndicator(color: Colors.white70)),
        const Positioned(left: 10, top: 10, child: _Live()),
      ],
    );
  }
}
