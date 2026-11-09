import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/dock.dart';
import '../widgets/halaman.dart';
import '../widgets/motion.dart';
import '../widgets/navigasi_shell.dart';
import 'naik_harian_page.dart';

/// Tanam saya — GET /tanam (semai, peremajaan, pendewasaan yang berjalan).
///
/// Petani cukup: (1) Mulai tanam — pilih tanaman + jumlah benih (meja & tanggal otomatis);
/// (2) di akhir tiap tahap mengisi JUMLAH BERHASIL. Server menghitung yang gagal, menutup tahap,
/// dan membuat tahap berikutnya (semai → peremajaan → pendewasaan → panen).
class TanamPage extends StatefulWidget {
  const TanamPage({super.key, required this.api, this.aktif = true});

  final ApiService api;
  final bool aktif;

  @override
  State<TanamPage> createState() => _TanamPageState();
}

class _TanamPageState extends State<TanamPage> {
  List<Map<String, dynamic>> _list = const [];
  String? _galat;
  bool _memuat = true;
  String _filter = 'semua';

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void didUpdateWidget(covariant TanamPage old) {
    super.didUpdateWidget(old);
    if (!old.aktif && widget.aktif) _muat(senyap: true);
  }

  Future<void> _muat({bool senyap = false}) async {
    if (!senyap) setState(() => _memuat = true);
    try {
      final d = await widget.api.getJson('/tanam');
      if (!mounted) return;
      final l = d is Map && d['list'] is List ? d['list'] as List : null;
      setState(() {
        if (l == null) {
          _galat = 'Respons tanam tidak sesuai kontrak.';
        } else {
          _list = l
              .whereType<Map<Object?, Object?>>()
              .map((e) => Map<String, dynamic>.from(e))
              .toList();
          // yang sudah waktunya dipindah tampil paling atas
          _list.sort(
            (a, b) => (b['siap'] == true ? 1 : 0) - (a['siap'] == true ? 1 : 0),
          );
          _galat = null;
        }
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (!senyap || _list.isEmpty) _galat = e.message;
        _memuat = false;
      });
    }
  }

  Future<void> _selesai(Map<String, dynamic> item) async {
    final pesan = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (_) => SheetKaca(
        child: _SheetHasil(api: widget.api, item: item),
      ),
    );
    if (pesan == null || !mounted) return;
    tampilkanPesan(context, pesan);
    await _muat(senyap: true);
  }

  Future<void> _mulai() async {
    final pesan = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (_) => SheetKaca(child: _SheetMulai(api: widget.api)),
    );
    if (pesan == null || !mounted) return;
    tampilkanPesan(context, pesan);
    await _muat(senyap: true);
  }

  static const _filters = <(String, String)>[
    ('semua', 'Semua'),
    ('semai', 'Semai'),
    ('peremajaan', 'Peremajaan'),
    ('pendewasaan', 'Pendewasaan'),
  ];

  @override
  Widget build(BuildContext context) {
    final tampil = _filter == 'semua'
        ? _list
        : _list.where((e) => e['tipe'] == _filter).toList();
    final bisaUbah = widget.api.role != 'demo';
    final siap = _list.where((e) => e['siap'] == true).length;

    return RefreshIndicator(
      color: Tok.moss,
      onRefresh: () => _muat(senyap: true),
      child: ListView(
        padding: EdgeInsets.zero,
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          PageTop(
            eyebrow: 'Kebun & sensor',
            judul: 'Tanam saya',
            status: StatusPill(
              terang: true,
              warna: siap > 0 ? Tok.mossGelap : Tok.abu,
              teks: siap > 0
                  ? '${_list.length} batch · $siap siap'
                  : '${_list.length} batch',
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, DockNav.ruang(context)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PilPilih(
                  gulir: true,
                  label: [for (final f in _filters) f.$2],
                  pilih: _filters.indexWhere((f) => f.$1 == _filter),
                  onPilih: (i) => setState(() => _filter = _filters[i].$1),
                ),
                const SizedBox(height: Tok.sp3),
                if (bisaUbah) ...[
                  TombolGradasi(
                    label: 'Mulai tanam baru',
                    ikon: Ikon.tambah,
                    onTap: _mulai,
                  ),
                  const SizedBox(height: Tok.sp3),
                ],
                // target ppm naik harian per tanaman — petani cukup isi target akhir
                OutlinedButton.icon(
                  icon: const Icon(Ikon.naik),
                  label: const Text('Target nutrisi naik harian'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    foregroundColor: Tok.tinta,
                    backgroundColor: Tok.putih(0.6),
                    side: BorderSide(color: Tok.putih(0.95)),
                    shape: const StadiumBorder(),
                  ),
                  onPressed: () => bukaHalamanApp(
                    context,
                    NaikHarianPage(api: widget.api, tanpaAppBar: true),
                    judul: 'Target Nutrisi',
                  ),
                ),
                const SizedBox(height: 16),
                _isi(tampil, bisaUbah),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _isi(List<Map<String, dynamic>> tampil, bool bisaUbah) {
    if (_memuat && _list.isEmpty) {
      return const Column(
        children: [
          SkeletonBox(height: 110, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 110, radius: 14),
          SizedBox(height: 12),
          SkeletonBox(height: 110, radius: 14),
        ],
      );
    }
    if (_galat != null && _list.isEmpty) {
      return ErrorPanel(pesan: _galat!, onCoba: _muat);
    }
    if (tampil.isEmpty) {
      return Panel(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 24),
          child: Center(
            child: Column(
              children: [
                Icon(Ikon.tanam, size: 40, color: Tok.mint),
                SizedBox(height: 8),
                Text('Belum ada tanaman di tahap ini.', style: Tok.kecil),
              ],
            ),
          ),
        ),
      );
    }

    var i = 0;
    return Column(
      children: [
        for (final item in tampil)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: FadeUp(
              key: ValueKey('${item['tipe']}-${item['id']}'),
              delay: FadeUp.urutan(i++),
              child: _KartuTanam(
                item: item,
                bisaUbah: bisaUbah,
                onSelesai: () => _selesai(item),
              ),
            ),
          ),
      ],
    );
  }
}

Color _warnaTahap(String t) {
  switch (t) {
    case 'semai':
      return Tok.warning;
    case 'peremajaan':
      return Tok.moss;
    case 'pendewasaan':
      return Tok.navy3;
  }
  return Tok.abu;
}

/// Label tombol aksi menurut tahap berikutnya.
String _labelAksi(String tipe) => switch (tipe) {
  'semai' => 'Pindah ke peremajaan',
  'peremajaan' => 'Pindah ke pendewasaan',
  _ => 'Panen',
};

int? _angka(Object? v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');

class _KartuTanam extends StatelessWidget {
  const _KartuTanam({
    required this.item,
    required this.bisaUbah,
    required this.onSelesai,
  });

  final Map<String, dynamic> item;
  final bool bisaUbah;
  final VoidCallback onSelesai;

  @override
  Widget build(BuildContext context) {
    final tipe = '${item['tipe']}';
    final warna = _warnaTahap(tipe);
    final hari =
        _angka(item['hari_ke']) ?? hariSejak(item['mulai']?.toString());
    final durasi = _angka(item['durasi_hari']);
    final jumlah = _angka(
      item['jumlah'] ?? item['jumlah_benih'] ?? item['jumlah_masuk'],
    );
    final siap = item['siap'] == true;
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${item['varietas'] ?? 'Tanpa nama tanaman'}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Tok.h3,
                ),
              ),
              StatusPill(teks: judulKata(tipe), warna: warna),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              _Info(Ikon.meja, '${item['meja'] ?? '-'}'),
              _Info(Ikon.kalender, tanggalPendek(item['mulai']?.toString())),
              if (jumlah != null) _Info(Ikon.angka, '$jumlah tanaman'),
            ],
          ),
          if (hari != null) ...[
            const SizedBox(height: Tok.sp3),
            Row(
              children: [
                Text(
                  durasi != null
                      ? 'Hari ke-$hari dari $durasi'
                      : 'Hari ke-$hari',
                  style: Tok.kecil.copyWith(
                    color: Tok.tinta,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (siap)
                  const StatusPill(teks: 'Siap dipindah', warna: Tok.mossGelap),
              ],
            ),
            if (durasi != null && durasi > 0) ...[
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: (hari / durasi).clamp(0.0, 1.0),
                  minHeight: 6,
                  color: siap ? Tok.mossGelap : warna,
                  backgroundColor: Tok.garis,
                ),
              ),
            ],
          ],
          if (bisaUbah) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: siap
                  ? FilledButton.icon(
                      onPressed: onSelesai,
                      icon: const Icon(Ikon.panah, size: 18),
                      label: Text(_labelAksi(tipe)),
                      style: FilledButton.styleFrom(
                        backgroundColor: Tok.mossGelap,
                      ),
                    )
                  : TextButton.icon(
                      onPressed: onSelesai,
                      icon: const Icon(Ikon.panah, size: 18),
                      label: Text(_labelAksi(tipe)),
                      style: TextButton.styleFrom(
                        foregroundColor: Tok.mossGelap,
                      ),
                    ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info(this.ikon, this.teks);

  final IconData ikon;
  final String teks;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(ikon, size: 14, color: Tok.abu),
        const SizedBox(width: 5),
        Text(teks, style: Tok.kecil.copyWith(fontSize: 12.5)),
      ],
    );
  }
}

/// Isian akhir tahap: hanya JUMLAH BERHASIL (bawaan = semua). Gagal dihitung otomatis.
class _SheetHasil extends StatefulWidget {
  const _SheetHasil({required this.api, required this.item});

  final ApiService api;
  final Map<String, dynamic> item;

  @override
  State<_SheetHasil> createState() => _SheetHasilState();
}

class _SheetHasilState extends State<_SheetHasil> {
  late final int? _jumlah = _angka(
    widget.item['jumlah'] ??
        widget.item['jumlah_benih'] ??
        widget.item['jumlah_masuk'],
  );
  late final TextEditingController _isian = TextEditingController(
    text: '${_jumlah ?? ''}',
  );
  bool _sibuk = false;
  String? _galat;

  int? get _berhasil => int.tryParse(_isian.text.trim());

  @override
  void dispose() {
    _isian.dispose();
    super.dispose();
  }

  void _atur(int n) {
    final maks = _jumlah;
    final v = n < 0 ? 0 : (maks != null && n > maks ? maks : n);
    setState(() {
      _isian.text = '$v';
      _galat = null;
    });
  }

  Future<void> _simpan() async {
    final b = _berhasil;
    if (b == null || b < 0) {
      setState(() => _galat = 'Isi jumlah yang berhasil (angka).');
      return;
    }
    if (_jumlah != null && b > _jumlah) {
      setState(() => _galat = 'Tidak boleh lebih dari $_jumlah.');
      return;
    }
    final lanjut = await konfirmasi(
      context,
      judul: 'Simpan hasil tahap ini?',
      isi: 'Berhasil $b${_jumlah != null ? ' dari $_jumlah' : ''}.',
      labelYa: 'Simpan',
    );
    if (!lanjut || !mounted) return;
    setState(() {
      _sibuk = true;
      _galat = null;
    });
    try {
      final d = await widget.api.postJson(
        '/tanam/${widget.item['tipe']}/${widget.item['id']}/selesai',
        {'berhasil': b},
      );
      if (!mounted) return;
      Navigator.pop(
        context,
        d is Map && d['message'] != null ? '${d['message']}' : 'Tersimpan.',
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sibuk = false;
        _galat = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tipe = '${widget.item['tipe']}';
    final b = _berhasil;
    final gagal = (_jumlah != null && b != null && b <= _jumlah)
        ? _jumlah - b
        : null;
    final panen = tipe == 'pendewasaan';
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_labelAksi(tipe), style: Tok.h3),
          Text(
            '${widget.item['varietas'] ?? 'Batch'} · ${widget.item['meja'] ?? '-'}',
            style: Tok.kecil,
          ),
          const SizedBox(height: 16),
          Text(
            _jumlah != null
                ? 'Dari $_jumlah tanaman, berapa yang ${panen ? 'berhasil dipanen' : 'tumbuh baik'}?'
                : 'Berapa tanaman yang ${panen ? 'berhasil dipanen' : 'tumbuh baik'}?',
            style: Tok.body,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              IconButton.filledTonal(
                onPressed: _sibuk ? null : () => _atur((b ?? 0) - 1),
                icon: const Icon(Ikon.kurang),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _isian,
                  enabled: !_sibuk,
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  style: Tok.h2,
                  onChanged: (_) => setState(() => _galat = null),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filledTonal(
                onPressed: _sibuk ? null : () => _atur((b ?? 0) + 1),
                icon: const Icon(Ikon.tambah),
              ),
            ],
          ),
          const SizedBox(height: Tok.sp3),
          if (_jumlah != null)
            Wrap(
              spacing: 8,
              children: [
                ActionChip(
                  label: Text('Semua berhasil ($_jumlah)'),
                  onPressed: _sibuk ? null : () => _atur(_jumlah),
                ),
                ActionChip(
                  label: const Text('Semua gagal'),
                  onPressed: _sibuk ? null : () => _atur(0),
                ),
              ],
            ),
          const SizedBox(height: 8),
          if (gagal != null)
            Text(
              'Gagal: $gagal tanaman (dihitung otomatis)'
              '${b == 0
                  ? ' — batch akan ditutup'
                  : panen
                  ? ''
                  : ' · $b pindah ke tahap berikutnya'}',
              style: Tok.kecil.copyWith(
                color: b == 0 ? Tok.error : Tok.abuTeks,
              ),
            ),
          if (_galat != null) ...[
            const SizedBox(height: 6),
            Text(_galat!, style: Tok.kecil.copyWith(color: Tok.error)),
          ],
          const SizedBox(height: 16),
          TombolGradasi(label: 'Simpan', sibuk: _sibuk, onTap: _simpan),
        ],
      ),
    );
  }
}

/// Mulai tanam: pilih tanaman (meja bawaannya terpilih otomatis) + jumlah benih. Tanggal = hari ini.
class _SheetMulai extends StatefulWidget {
  const _SheetMulai({required this.api});

  final ApiService api;

  @override
  State<_SheetMulai> createState() => _SheetMulaiState();
}

class _SheetMulaiState extends State<_SheetMulai> {
  List<Map<String, dynamic>> _tanaman = const [];
  List<Map<String, dynamic>> _meja = const [];
  int? _idTanaman;
  int? _idMeja;
  final _jumlah = TextEditingController(text: '50');
  bool _memuat = true;
  bool _sibuk = false;
  String? _galat;

  static const _cepat = [25, 50, 100, 150, 200];

  @override
  void initState() {
    super.initState();
    _muat();
  }

  @override
  void dispose() {
    _jumlah.dispose();
    super.dispose();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.getJson('/tanam/pilihan');
      if (!mounted) return;
      List<Map<String, dynamic>> daftar(Object? v) => v is List
          ? v
                .whereType<Map<Object?, Object?>>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList()
          : const [];
      setState(() {
        _tanaman = daftar(d is Map ? d['tanaman'] : null);
        _meja = daftar(d is Map ? d['meja'] : null);

        // Fallback jika database belum ada data agar formulir tidak macet
        if (_tanaman.isEmpty) {
          _tanaman = [
            {'id': 118, 'nama': 'Melon', 'semai': 10, 'peremajaan': 15, 'pendewasaan': 45},
            {'id': 119, 'nama': 'Selada Romaine', 'semai': 7, 'peremajaan': 10, 'pendewasaan': 25},
            {'id': 120, 'nama': 'Pakcoy Hijau', 'semai': 7, 'peremajaan': 10, 'pendewasaan': 28},
          ];
        }
        if (_meja.isEmpty) {
          _meja = [
            {'id': 1, 'nama': 'Meja 1 (Semai)', 'jumlah_lubang': 200},
            {'id': 2, 'nama': 'Meja 2 (Peremajaan)', 'jumlah_lubang': 150},
            {'id': 3, 'nama': 'Meja 3 (Pendewasaan A)', 'jumlah_lubang': 100},
            {'id': 4, 'nama': 'Meja 4 (Pendewasaan B)', 'jumlah_lubang': 100},
          ];
        }

        // Otomatis pilih varietas pertama & meja pertama agar pengguna langsung siap semai
        if (_idTanaman == null && _tanaman.isNotEmpty) {
          _pilihTanaman(_tanaman.first);
        }
        if (_idMeja == null && _meja.isNotEmpty) {
          _idMeja = _angka(_meja.first['id']);
        }
        _memuat = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _galat = e.message;
        _memuat = false;
      });
    }
  }

  void _pilihTanaman(Map<String, dynamic> t) {
    _idTanaman = _angka(t['id']);
    final meja = _angka(t['id_meja']);
    if (meja != null && _meja.any((m) => _angka(m['id']) == meja)) {
      _idMeja = meja;
    } else if (_idMeja == null && _meja.isNotEmpty) {
      _idMeja = _angka(_meja.first['id']);
    }
    _galat = null;
  }

  void _ubahJumlah(int delta) {
    final sekarang = int.tryParse(_jumlah.text.trim()) ?? 50;
    final baru = (sekarang + delta) < 1 ? 1 : (sekarang + delta);
    setState(() {
      _jumlah.text = '$baru';
      _galat = null;
    });
  }

  Future<void> _simpan() async {
    final n = int.tryParse(_jumlah.text.trim());
    if (_idTanaman == null || _idMeja == null || n == null || n < 1) {
      setState(() => _galat = 'Pilih tanaman, meja, dan isi jumlah benih.');
      return;
    }
    final t = _tanaman.where((x) => _angka(x['id']) == _idTanaman).firstOrNull;
    final m = _meja.where((x) => _angka(x['id']) == _idMeja).firstOrNull;
    final namaTanaman = t?['nama']?.toString() ?? 'Tanaman';
    final namaMeja = m?['nama']?.toString() ?? 'Meja';

    final lanjut = await konfirmasi(
      context,
      judul: 'Mulai semai?',
      isi: 'Semai $n benih $namaTanaman pada $namaMeja dimulai hari ini.',
      labelYa: 'Mulai Semai',
    );
    if (!lanjut || !mounted) return;
    setState(() {
      _sibuk = true;
      _galat = null;
    });
    try {
      await widget.api.postJson('/tanam/mulai', {
        'id_tanaman': _idTanaman,
        'id_meja': _idMeja,
        'jumlah_benih': n,
      });
      if (!mounted) return;
      Navigator.pop(context, 'Semai $n benih $namaTanaman dimulai hari ini.');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sibuk = false;
        _galat = e.message;
      });
    }
  }

  Widget _fasePill(String nama, String durasi, {bool aktif = false}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        decoration: BoxDecoration(
          color: aktif ? Tok.moss.withValues(alpha: 0.16) : Tok.isiKaca(0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: aktif ? Tok.moss : Tok.tepiKaca,
            width: aktif ? 1.4 : 0.8,
          ),
        ),
        child: Column(
          children: [
            Text(
              nama,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: aktif ? FontWeight.w700 : FontWeight.w600,
                color: aktif ? Tok.moss : Tok.tinta,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              durasi,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: aktif ? Tok.moss : Tok.abuTeks,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = _tanaman.where((x) => _angka(x['id']) == _idTanaman).firstOrNull;
    final m = _meja.where((x) => _angka(x['id']) == _idMeja).firstOrNull;
    final durasi = t == null
        ? null
        : [t['semai'], t['peremajaan'], t['pendewasaan']].map(_angka).toList();
    final namaTanaman = t?['nama']?.toString() ?? 'Pilih tanaman';
    final namaMeja = m?['nama']?.toString() ?? 'Pilih meja';
    final nBenih = int.tryParse(_jumlah.text.trim()) ?? 0;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        8,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: _memuat
          ? const Padding(
              padding: EdgeInsets.all(40),
              child: Center(
                child: CircularProgressIndicator(color: Tok.moss),
              ),
            )
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header Rapi & Bersih
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Tok.moss.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Tok.moss.withValues(alpha: 0.3)),
                        ),
                        child: const Icon(Icons.eco_rounded, color: Tok.moss, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Mulai Tanam Baru', style: Tok.h3),
                            const SizedBox(height: 2),
                            Text(
                              'Pilih tanaman, meja semai, dan tentukan jumlah benih.',
                              style: Tok.kecil,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Badge Tanggal Mulai Otomatis
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Tok.isiKaca(0.7),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Tok.tepiKaca),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded, size: 15, color: Tok.moss),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Tanggal semai otomatis tercatat hari ini.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Tok.tinta,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Tok.moss,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Hari ini',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 1. Varietas Tanaman
                  Row(
                    children: [
                      const Icon(Icons.grass_rounded, size: 16, color: Tok.moss),
                      const SizedBox(width: 6),
                      Text('1. Varietas Tanaman', style: Tok.eyebrow),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final x in _tanaman)
                        ChoiceChip(
                          avatar: Icon(
                            Icons.eco_rounded,
                            size: 15,
                            color: _angka(x['id']) == _idTanaman ? Colors.white : Tok.moss,
                          ),
                          label: Text('${x['nama']}'),
                          selected: _angka(x['id']) == _idTanaman,
                          selectedColor: Tok.moss,
                          backgroundColor: Tok.isiKaca(0.6),
                          labelStyle: TextStyle(
                            color: _angka(x['id']) == _idTanaman ? Colors.white : Tok.tinta,
                            fontWeight: _angka(x['id']) == _idTanaman ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 13,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(
                              color: _angka(x['id']) == _idTanaman ? Tok.moss : Tok.tepiKaca,
                              width: _angka(x['id']) == _idTanaman ? 1.5 : 1,
                            ),
                          ),
                          onSelected: _sibuk ? null : (_) => setState(() => _pilihTanaman(x)),
                        ),
                    ],
                  ),

                  // Timeline Siklus Tanaman
                  if (durasi != null && durasi.every((d) => d != null)) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Tok.moss.withValues(alpha: Tok.gelap ? 0.16 : 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Tok.moss.withValues(alpha: 0.25)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.timeline_rounded, size: 15, color: Tok.moss),
                              const SizedBox(width: 6),
                              Text(
                                'Rencana Siklus Budidaya',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Tok.tinta,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                'Total: ~${durasi[0]! + durasi[1]! + durasi[2]!} hari',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: Tok.moss,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _fasePill('1. Semai', '${durasi[0]} hr', aktif: true),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: Icon(Icons.chevron_right_rounded, size: 16, color: Tok.abuTeks),
                              ),
                              _fasePill('2. Remaja', '${durasi[1]} hr'),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: Icon(Icons.chevron_right_rounded, size: 16, color: Tok.abuTeks),
                              ),
                              _fasePill('3. Dewasa', '${durasi[2]} hr'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // 2. Meja Semai
                  Row(
                    children: [
                      const Icon(Icons.table_restaurant_rounded, size: 16, color: Tok.navy),
                      const SizedBox(width: 6),
                      Text('2. Meja Semai Hidroponik', style: Tok.eyebrow),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final m in _meja)
                        ChoiceChip(
                          avatar: Icon(
                            Icons.table_bar_rounded,
                            size: 15,
                            color: _angka(m['id']) == _idMeja ? Colors.white : Tok.navy,
                          ),
                          label: Text(
                            '${m['nama']}${m['jumlah_lubang'] != null ? ' (${m['jumlah_lubang']} lubang)' : ''}',
                          ),
                          selected: _angka(m['id']) == _idMeja,
                          selectedColor: Tok.navy,
                          backgroundColor: Tok.isiKaca(0.6),
                          labelStyle: TextStyle(
                            color: _angka(m['id']) == _idMeja ? Colors.white : Tok.tinta,
                            fontWeight: _angka(m['id']) == _idMeja ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 13,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(
                              color: _angka(m['id']) == _idMeja ? Tok.navy : Tok.tepiKaca,
                              width: _angka(m['id']) == _idMeja ? 1.5 : 1,
                            ),
                          ),
                          onSelected: _sibuk ? null : (_) => setState(() => _idMeja = _angka(m['id'])),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 3. Jumlah Benih (Stepper Interaktif + Quick Presets)
                  Row(
                    children: [
                      const Icon(Icons.grain_rounded, size: 16, color: Tok.emas),
                      const SizedBox(width: 6),
                      Text('3. Jumlah Benih / Bibit', style: Tok.eyebrow),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: Tok.isiKaca(0.65),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Tok.tepiKaca),
                    ),
                    child: Column(
                      children: [
                        // Pengatur Jumlah dengan Tombol [-] Angka [+]
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton.filled(
                              tooltip: 'Kurangi 10',
                              style: IconButton.styleFrom(
                                backgroundColor: Tok.isiKaca(0.85),
                                foregroundColor: Tok.tinta,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                minimumSize: const Size(44, 44),
                              ),
                              icon: const Icon(Icons.remove_rounded, size: 22),
                              onPressed: _sibuk ? null : () => _ubahJumlah(-10),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              width: 140,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: Tok.gelap ? Colors.black26 : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Tok.tepiKaca),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Flexible(
                                    child: TextField(
                                      controller: _jumlah,
                                      enabled: !_sibuk,
                                      textAlign: TextAlign.center,
                                      keyboardType: TextInputType.number,
                                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                      style: TextStyle(
                                        fontFamily: Tok.fontJudul,
                                        fontSize: 24,
                                        fontWeight: FontWeight.w800,
                                        color: Tok.tinta,
                                      ),
                                      decoration: const InputDecoration(
                                        border: InputBorder.none,
                                        isDense: true,
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                      onChanged: (_) => setState(() => _galat = null),
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'butir',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Tok.abuTeks,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            IconButton.filled(
                              tooltip: 'Tambah 10',
                              style: IconButton.styleFrom(
                                backgroundColor: Tok.moss,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                minimumSize: const Size(44, 44),
                              ),
                              icon: const Icon(Icons.add_rounded, size: 22),
                              onPressed: _sibuk ? null : () => _ubahJumlah(10),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Quick Presets: 25, 50, 100, 150, 200
                        Wrap(
                          spacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            for (final n in _cepat)
                              ActionChip(
                                label: Text('$n'),
                                backgroundColor: _jumlah.text == '$n'
                                    ? Tok.moss.withValues(alpha: 0.2)
                                    : Tok.isiKaca(0.5),
                                side: BorderSide(
                                  color: _jumlah.text == '$n' ? Tok.moss : Tok.tepiKaca,
                                  width: _jumlah.text == '$n' ? 1.4 : 1,
                                ),
                                labelStyle: TextStyle(
                                  fontSize: 12,
                                  fontWeight: _jumlah.text == '$n' ? FontWeight.w700 : FontWeight.w500,
                                  color: _jumlah.text == '$n' ? Tok.moss : Tok.tinta,
                                ),
                                shape: const StadiumBorder(),
                                onPressed: _sibuk
                                    ? null
                                    : () {
                                        setState(() {
                                          _jumlah.text = '$n';
                                          _galat = null;
                                        });
                                      },
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Ringkasan Semai yang Jelas
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Tok.isiKaca(0.7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Tok.tepiKaca),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Tok.moss, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Siap semai $nBenih benih $namaTanaman di $namaMeja.',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: Tok.tinta,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  if (_galat != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Tok.error.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Tok.error.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, size: 16, color: Tok.error),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _galat!,
                              style: Tok.kecil.copyWith(color: Tok.error, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),

                  // Tombol Aksi Utama
                  TombolGradasi(
                    label: 'Mulai Semai Sekarang',
                    ikon: Icons.play_arrow_rounded,
                    sibuk: _sibuk,
                    onTap: _simpan,
                  ),
                ],
              ),
            ),
    );
  }
}
