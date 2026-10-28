import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/dock.dart';
import '../widgets/motion.dart';
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
              .whereType<Map>()
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
      backgroundColor: Colors.white,
      showDragHandle: true,
      builder: (_) => _SheetHasil(api: widget.api, item: item),
    );
    if (pesan == null || !mounted) return;
    tampilkanPesan(context, pesan);
    await _muat(senyap: true);
  }

  Future<void> _mulai() async {
    final pesan = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      showDragHandle: true,
      builder: (_) => _SheetMulai(api: widget.api),
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
          HeroHeader(
            judul: 'Tanam saya',
            subjudul:
                '${_list.length} batch berjalan${siap > 0 ? ' · $siap siap dipindah' : ''}',
            bawah: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final f in _filters)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(f.$2),
                        selected: _filter == f.$1,
                        showCheckmark: false,
                        // warna latar opak: dulu chip tak terpilih tampil putih dengan teks putih
                        // (tak terbaca) di atas header gelap
                        color: WidgetStatePropertyAll(
                          _filter == f.$1 ? Tok.emas : Tok.navy3,
                        ),
                        side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.18),
                        ),
                        labelStyle: TextStyle(
                          color: _filter == f.$1 ? Tok.navy : Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 12.5,
                        ),
                        onSelected: (_) => setState(() => _filter = f.$1),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(16, 18, 16, DockNav.ruang(context)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
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
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => NaikHarianPage(api: widget.api),
                    ),
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
      return const Panel(
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
      padding: EdgeInsets.zero,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              width: 5,
              decoration: BoxDecoration(
                color: warna,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(Tok.rLg),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(Tok.sp4),
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
                        _Info(
                          Ikon.kalender,
                          tanggalPendek(item['mulai']?.toString()),
                        ),
                        if (jumlah != null)
                          _Info(Ikon.angka, '$jumlah tanaman'),
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
                            const StatusPill(
                              teks: 'Siap dipindah',
                              warna: Tok.mossGelap,
                            ),
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
              ),
            ),
          ],
        ),
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
  final _jumlah = TextEditingController();
  bool _memuat = true;
  bool _sibuk = false;
  String? _galat;

  static const _cepat = [50, 100, 150, 200];

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
          ? v.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList()
          : const [];
      setState(() {
        _tanaman = daftar(d is Map ? d['tanaman'] : null);
        _meja = daftar(d is Map ? d['meja'] : null);
        if (_tanaman.length == 1) _pilihTanaman(_tanaman.first);
        if (_meja.length == 1) _idMeja = _angka(_meja.first['id']);
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
    }
  }

  Future<void> _simpan() async {
    final n = int.tryParse(_jumlah.text.trim());
    if (_idTanaman == null || _idMeja == null || n == null || n < 1) {
      setState(() => _galat = 'Pilih tanaman, meja, dan isi jumlah benih.');
      return;
    }
    final lanjut = await konfirmasi(
      context,
      judul: 'Mulai semai?',
      isi: 'Semai $n benih dimulai hari ini.',
      labelYa: 'Mulai',
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
      Navigator.pop(context, 'Semai $n benih dimulai hari ini.');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sibuk = false;
        _galat = e.message;
      });
    }
  }

  Widget _chips(
    List<Map<String, dynamic>> daftar,
    int? terpilih,
    ValueChanged<Map<String, dynamic>> pilih,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final x in daftar)
          ChoiceChip(
            label: Text('${x['nama']}'),
            selected: _angka(x['id']) == terpilih,
            onSelected: _sibuk ? null : (_) => setState(() => pilih(x)),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = _tanaman.where((x) => _angka(x['id']) == _idTanaman).firstOrNull;
    final durasi = t == null
        ? null
        : [t['semai'], t['peremajaan'], t['pendewasaan']].map(_angka).toList();
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: _memuat
          ? const Padding(
              padding: EdgeInsets.all(32),
              child: Center(child: CircularProgressIndicator()),
            )
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Mulai tanam baru', style: Tok.h3),
                  const Text(
                    'Tanggal semai otomatis hari ini.',
                    style: Tok.kecil,
                  ),
                  const SizedBox(height: 16),
                  const Text('Tanaman', style: Tok.eyebrow),
                  const SizedBox(height: 8),
                  _chips(_tanaman, _idTanaman, _pilihTanaman),
                  if (durasi != null && durasi.every((d) => d != null)) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Semai ${durasi[0]} hari → peremajaan ${durasi[1]} hari → pendewasaan ${durasi[2]} hari',
                      style: Tok.kecil,
                    ),
                  ],
                  const SizedBox(height: 16),
                  const Text('Meja', style: Tok.eyebrow),
                  const SizedBox(height: 8),
                  _chips(_meja, _idMeja, (m) => _idMeja = _angka(m['id'])),
                  const SizedBox(height: 16),
                  const Text('Jumlah benih', style: Tok.eyebrow),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final n in _cepat)
                        ChoiceChip(
                          label: Text('$n'),
                          selected: _jumlah.text == '$n',
                          onSelected: _sibuk
                              ? null
                              : (_) => setState(() => _jumlah.text = '$n'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _jumlah,
                    enabled: !_sibuk,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'atau ketik jumlah lain',
                    ),
                    onChanged: (_) => setState(() => _galat = null),
                  ),
                  if (_galat != null) ...[
                    const SizedBox(height: 8),
                    Text(_galat!, style: Tok.kecil.copyWith(color: Tok.error)),
                  ],
                  const SizedBox(height: 16),
                  TombolGradasi(
                    label: 'Mulai semai',
                    sibuk: _sibuk,
                    onTap: _simpan,
                  ),
                ],
              ),
            ),
    );
  }
}
