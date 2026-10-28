import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Chat dengan asisten AI — POST /api/ai/chat (admin & petani; demo ditolak).
class AsistenPage extends StatefulWidget {
  const AsistenPage({super.key, required this.api});

  final ApiService api;

  @override
  State<AsistenPage> createState() => _AsistenPageState();
}

class _Tabel {
  const _Tabel(this.judul, this.kolom, this.baris);

  final String judul;
  final List<String> kolom;
  final List<List<String>> baris;
}

class _Pesan {
  const _Pesan(
    this.teks, {
    required this.dariUser,
    this.galat = false,
    this.sumber,
    this.status,
    this.tabel = const [],
  });

  final String teks;
  final bool dariUser;
  final bool galat;
  final String? sumber;
  final String? status;
  final List<_Tabel> tabel;
}

class _Pintasan {
  const _Pintasan(this.label, this.pesan);

  final String label;
  final String pesan;
}

const _labelSumber = <String, String>{
  'heuristik': 'Jawaban aturan (AI lokal tidak tersedia)',
  'diagnosa': 'Diagnosa otomatis dari database',
  'data': 'Data langsung dari database',
  'sapaan': 'Asisten GARAP',
  'ollama': 'Dijawab AI lokal — cek ulang sebelum bertindak',
  'tolak': 'Permintaan ditolak oleh pengaman',
};

/// Riwayat untuk server: pasangan tanya-jawab yang ditolak/galat dibuang UTUH.
/// Dulu hanya jawabannya yang dibuang → pertanyaan luar topik ikut terkirim dan
/// membuat pertanyaan sah berikutnya ikut ditolak.
@visibleForTesting
List<Map<String, String>> riwayatUntukServer(
  Iterable<({bool dariUser, String teks, bool dibuang})> pesan,
) {
  final out = <({bool dariUser, String teks})>[];
  for (final p in pesan) {
    if (!p.dariUser && p.dibuang) {
      if (out.isNotEmpty && out.last.dariUser) out.removeLast();
      continue;
    }
    out.add((dariUser: p.dariUser, teks: p.teks));
  }
  return out
      .skip(out.length > 8 ? out.length - 8 : 0)
      .map((p) => {'peran': p.dariUser ? 'user' : 'ai', 'teks': p.teks})
      .toList();
}

class _HasilMd {
  const _HasilMd(this.teks, this.tabel);

  final String teks;
  final List<_Tabel> tabel;
}

/// Ambil tabel Markdown (| a | b |) dari teks biasa → tabel terstruktur.
_HasilMd _ekstrakMarkdown(String teks) {
  final baris = teks.split('\n');
  final sisa = <String>[];
  final tabel = <_Tabel>[];
  final pemisah = RegExp(r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$');
  List<String> sel(String l) {
    var t = l.trim();
    if (t.startsWith('|')) t = t.substring(1);
    if (t.endsWith('|')) t = t.substring(0, t.length - 1);
    return t.split('|').map((c) => c.trim()).toList();
  }

  var i = 0;
  while (i < baris.length) {
    final l = baris[i];
    if (l.contains('|') &&
        i + 1 < baris.length &&
        pemisah.hasMatch(baris[i + 1])) {
      final kolom = sel(l);
      final isi = <List<String>>[];
      var j = i + 2;
      while (j < baris.length && baris[j].contains('|')) {
        final c = sel(baris[j]);
        isi.add(
          List<String>.generate(kolom.length, (k) => k < c.length ? c[k] : '-'),
        );
        j++;
      }
      if (kolom.length >= 2 && isi.isNotEmpty) {
        tabel.add(_Tabel('Tabel', kolom, isi));
      }
      i = j;
    } else {
      sisa.add(l);
      i++;
    }
  }
  return _HasilMd(sisa.join('\n').trim(), tabel);
}

/// Ubah JSON `tabel` dari server menjadi model; bentuk yang aneh dilewati.
List<_Tabel> _uraiTabel(dynamic v) {
  if (v is! List) return const [];
  final out = <_Tabel>[];
  for (final t in v) {
    if (t is! Map) continue;
    final kolom = t['kolom'] is List
        ? (t['kolom'] as List).map((e) => '$e').toList()
        : <String>[];
    if (kolom.isEmpty) continue;
    final baris = <List<String>>[];
    if (t['baris'] is List) {
      for (final b in t['baris'] as List) {
        if (b is! List) continue;
        baris.add(
          List<String>.generate(
            kolom.length,
            (i) => i < b.length ? '${b[i]}' : '-',
          ),
        );
      }
    }
    out.add(_Tabel('${t['judul'] ?? 'Tabel'}', kolom, baris));
  }
  return out;
}

class _AsistenPageState extends State<AsistenPage> {
  static const _batas = 600;
  static const _saran = <String>[
    'Bagaimana kondisi pH dan TDS sekarang?',
    'Apa yang harus saya lakukan hari ini?',
    'Kapan tahap semai berikutnya selesai?',
  ];

  static const _pintasan = <_Pintasan>[
    _Pintasan('Diagnosa menyeluruh', 'Lakukan diagnosa menyeluruh'),
    _Pintasan('Tabel sensor', 'Tampilkan tabel sensor terbaru'),
    _Pintasan('Alert terbuka', 'Tampilkan daftar alert terbuka'),
    _Pintasan('Status penampung', 'Tampilkan status penampung dan dosing'),
    _Pintasan('Tahap tanam', 'Tampilkan status tahap tanam'),
  ];

  final _pesan = <_Pesan>[];
  final _ctrl = TextEditingController();
  final _gulir = ScrollController();
  bool _memuat = false;

  @override
  void dispose() {
    _ctrl.dispose();
    _gulir.dispose();
    super.dispose();
  }

  void _keBawah() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_gulir.hasClients) return;
      _gulir.animateTo(
        _gulir.position.maxScrollExtent,
        duration: const Duration(milliseconds: 320),
        curve: Tok.ease,
      );
    });
  }

  Future<void> _kirim(String teks) async {
    final t = teks.trim();
    if (t.isEmpty || t.length > _batas || _memuat) return;

    final riwayat = riwayatUntukServer(
      _pesan.map(
        (p) => (
          dariUser: p.dariUser,
          teks: p.teks,
          dibuang: p.galat || p.sumber == 'tolak',
        ),
      ),
    );

    setState(() {
      _pesan.add(_Pesan(t, dariUser: true));
      _ctrl.clear();
      _memuat = true;
    });
    _keBawah();

    try {
      // Ollama bisa butuh hingga ±30 dtk → batas tunggu lebih longgar.
      final d = await widget.api.postJson('/api/ai/chat', {
        'pesan': t,
        'riwayat': riwayat,
      }, const Duration(seconds: 45));
      if (!mounted) return;
      final map = d is Map ? d : const {};
      setState(() {
        var teksJawab = '${map['jawaban'] ?? 'Tidak ada jawaban.'}';
        var tabelJawab = _uraiTabel(map['tabel']);
        // Jaring pengaman: server lama membalas tabel Markdown mentah.
        if (tabelJawab.isEmpty && teksJawab.contains('|')) {
          final e = _ekstrakMarkdown(teksJawab);
          if (e.tabel.isNotEmpty) {
            tabelJawab = e.tabel;
            teksJawab = e.teks.isEmpty ? 'Berikut tabelnya.' : e.teks;
          }
        }
        _pesan.add(
          _Pesan(
            teksJawab,
            dariUser: false,
            sumber: map['sumber'] is String ? map['sumber'] as String : null,
            status: map['status'] is String ? map['status'] as String : null,
            tabel: tabelJawab,
          ),
        );
        _memuat = false;
      });
    } catch (e) {
      // selain ApiException (mis. bentuk balasan tak terduga) — jangan biarkan
      // indikator "mengetik" berputar terus dan tombol kirim terkunci
      if (!mounted) return;
      setState(() {
        _pesan.add(
          _Pesan(
            e is ApiException
                ? e.message
                : 'Jawaban asisten tidak dapat dibaca. Coba lagi.',
            dariUser: false,
            galat: true,
          ),
        );
        _memuat = false;
      });
    }
    _keBawah();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBarGlass(
        judul: 'Asisten AI',
        aksi: [
          if (_pesan.isNotEmpty)
            IconButton(
              tooltip: 'Hapus percakapan',
              icon: const Icon(Ikon.hapus, color: Colors.white),
              onPressed: _memuat ? null : () => setState(_pesan.clear),
            ),
        ],
      ),
      body: LatarHalaman(
        child: Column(
          children: [
            Expanded(
              child: _pesan.isEmpty
                  ? _Kosong(onSaran: _kirim, saran: _saran)
                  : ListView.builder(
                      controller: _gulir,
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      itemCount: _pesan.length + (_memuat ? 1 : 0),
                      itemBuilder: (context, i) {
                        if (i == _pesan.length) return const _Mengetik();
                        return _Gelembung(_pesan[i]);
                      },
                    ),
            ),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (final x in _pintasan)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(
                          x.label,
                          style: const TextStyle(fontSize: 12),
                        ),
                        backgroundColor: Colors.white,
                        side: const BorderSide(color: Tok.garis),
                        onPressed: _memuat ? null : () => _kirim(x.pesan),
                      ),
                    ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _ctrl,
                        minLines: 1,
                        maxLines: 4,
                        maxLength: _batas,
                        textInputAction: TextInputAction.send,
                        onSubmitted: _kirim,
                        decoration: const InputDecoration(
                          hintText: 'Tulis pertanyaan…',
                          counterText: '',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      width: 50,
                      height: 50,
                      child: Material(
                        color: Colors.transparent,
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: Tok.primary,
                            borderRadius: BorderRadius.circular(Tok.rSm),
                          ),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(Tok.rSm),
                            onTap: _memuat ? null : () => _kirim(_ctrl.text),
                            child: Icon(
                              Icons.send_rounded,
                              color: Colors.white.withValues(
                                alpha: _memuat ? 0.5 : 1,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
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

class _Kosong extends StatelessWidget {
  const _Kosong({required this.onSaran, required this.saran});

  final void Function(String) onSaran;
  final List<String> saran;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: FadeUp(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Monogram(size: 56),
              const SizedBox(height: 14),
              const Text('Tanya apa saja soal kebun Anda', style: Tok.h2),
              const SizedBox(height: 6),
              const Text(
                'Jawaban memakai data sensor, alert, penampung, dan tahap tanam terbaru. Coba "Diagnosa menyeluruh".',
                textAlign: TextAlign.center,
                style: Tok.kecil,
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  for (final s in saran)
                    ActionChip(
                      label: Text(s, style: const TextStyle(fontSize: 12.5)),
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: Tok.moss),
                      onPressed: () => onSaran(s),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Gelembung extends StatelessWidget {
  const _Gelembung(this.p);

  final _Pesan p;

  @override
  Widget build(BuildContext context) {
    final user = p.dariUser;
    final Color latar = user
        ? Tok.forest
        : p.galat
        ? Tok.error.withValues(alpha: 0.08)
        : Colors.white;
    final Color teks = user
        ? Colors.white
        : p.galat
        ? Tok.error
        : Tok.tinta;
    return FadeUp(
      dy: 10,
      duration: const Duration(milliseconds: 360),
      child: Align(
        alignment: user ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(
            maxWidth:
                MediaQuery.sizeOf(context).width *
                (p.tabel.isNotEmpty ? 0.94 : 0.82),
          ),
          decoration: BoxDecoration(
            color: latar,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(Tok.rLg),
              topRight: const Radius.circular(Tok.rLg),
              bottomLeft: Radius.circular(user ? Tok.rLg : 4),
              bottomRight: Radius.circular(user ? 4 : Tok.rLg),
            ),
            border: user
                ? null
                : Border.all(
                    color: p.galat
                        ? Tok.error.withValues(alpha: 0.3)
                        : Tok.garis,
                  ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (p.status != null) _LencanaStatus(p.status!),
              // jawaban bisa disalin (mis. langkah SOP untuk dikirim ke rekan)
              SelectableText(
                p.teks,
                style: TextStyle(color: teks, height: 1.4, fontSize: 14.5),
              ),
              for (final t in p.tabel) _TabelAi(t),
              if (!user && !p.galat && _labelSumber.containsKey(p.sumber)) ...[
                const SizedBox(height: 6),
                Text(
                  _labelSumber[p.sumber]!,
                  style: const TextStyle(fontSize: 11, color: Tok.abuTeks),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Mengetik extends StatelessWidget {
  const _Mengetik();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: EdgeInsets.only(bottom: 10, left: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            PulseDot(color: Tok.moss, size: 9),
            SizedBox(width: 6),
            PulseDot(color: Tok.moss, size: 9),
            SizedBox(width: 6),
            PulseDot(color: Tok.moss, size: 9),
          ],
        ),
      ),
    );
  }
}

class _LencanaStatus extends StatelessWidget {
  const _LencanaStatus(this.status);

  final String status;

  @override
  Widget build(BuildContext context) {
    final Color warna = status == 'KRITIS'
        ? Tok.error
        : status == 'PERHATIAN'
        ? Tok.warning
        : Tok.mossGelap;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(
          color: warna.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          status,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: warna,
          ),
        ),
      ),
    );
  }
}

/// Tabel dari server: judul kecil, badan bisa digeser mendatar.
class _TabelAi extends StatelessWidget {
  const _TabelAi(this.t);

  final _Tabel t;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.judul.toUpperCase(),
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: Tok.abuTeks,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(Tok.rSm),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border.all(color: Tok.garis),
                borderRadius: BorderRadius.circular(Tok.rSm),
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Table(
                  defaultColumnWidth: const IntrinsicColumnWidth(),
                  border: const TableBorder(
                    horizontalInside: BorderSide(color: Tok.garis, width: 0.6),
                  ),
                  children: [
                    TableRow(
                      decoration: const BoxDecoration(color: Tok.page),
                      children: [
                        for (final k in t.kolom) _Sel(k, kepala: true),
                      ],
                    ),
                    for (final b in t.baris)
                      TableRow(children: [for (final s in b) _Sel(s)]),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Sel extends StatelessWidget {
  const _Sel(this.teks, {this.kepala = false});

  final String teks;
  final bool kepala;

  @override
  Widget build(BuildContext context) {
    final u = teks.toUpperCase();
    Color? latar;
    Color warna = Tok.tinta;
    var tebal = kepala;
    if (!kepala) {
      if (u == 'KRITIS' ||
          u == 'CRITICAL' ||
          u.startsWith('LOCK') ||
          u.startsWith('DI LUAR') ||
          u == 'LEWAT DURASI' ||
          u == 'TIDAK ADA DATA') {
        latar = Tok.error.withValues(alpha: 0.1);
        warna = Tok.error;
        tebal = true;
      } else if (u == 'PERHATIAN' ||
          u == 'WARNING' ||
          u == 'BASI' ||
          u == 'PEMELIHARAAN' ||
          u == 'SEGERA SELESAI') {
        latar = Tok.warning.withValues(alpha: 0.12);
        warna = Tok.warning;
        tebal = true;
      } else if (u == 'OK' || u == 'NORMAL') {
        warna = Tok.mossGelap;
        tebal = true;
      }
    } else {
      warna = Tok.abu;
    }
    return Container(
      color: latar,
      constraints: const BoxConstraints(maxWidth: 240),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      child: Text(
        teks,
        style: TextStyle(
          fontSize: 12,
          height: 1.25,
          fontWeight: tebal ? FontWeight.w700 : FontWeight.w400,
          color: warna,
        ),
      ),
    );
  }
}
