import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import '../widgets/app_bar_glass.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Tentang Kami — padanan halaman Tentang di web (deskripsi, mitra, tim, kontak).
/// Dibuka dari Akun → Pengaturan. Tautan disalin ke papan klip (tanpa plugin peramban).
class TentangPage extends StatelessWidget {
  const TentangPage({super.key});

  static const _mitra = [
    _Mitra(
      'KKN Arutmin Asik 2026',
      'Program KKN Industri',
      'kkn.png',
      'Program Kuliah Kerja Nyata Industri mahasiswa Politeknik Negeri Tanah Laut di PT Arutmin Indonesia tahun 2026. '
          'Vertonik Smart Farm adalah salah satu hasil kerjanya.',
      'https://instagram.com/kkn.arutminidn2026',
    ),
    _Mitra(
      'PT Arutmin Indonesia',
      'Mitra industri',
      'arutmin.png',
      'Perusahaan pertambangan batubara tempat program KKN dijalankan dan mitra penyedia lokasi greenhouse.',
      'https://www.arutmin.com',
    ),
    _Mitra(
      'Politeknik Negeri Tanah Laut',
      'Perguruan tinggi',
      'polytala.png',
      'Perguruan tinggi asal para mahasiswa KKN yang merancang dan membangun sistem ini.',
      'https://polytala.ac.id',
    ),
    _Mitra(
      'TRKJ',
      'Program studi',
      'trkj.png',
      'Program studi Teknologi Rekayasa Komputer dan Jaringan — bidang keilmuan di balik perangkat IoT, '
          'jaringan, dan aplikasi proyek ini.',
      null,
    ),
  ];

  static const _tim = [
    _Anggota(
      'Rivi Ramdani',
      'Project Manager',
      'rivi-ramdani.png',
      'Memimpin arah proyek Vertonik Smart Farm: menyusun rencana kerja, membagi tugas, dan memastikan seluruh tim bergerak menuju tujuan yang sama.',
    ),
    _Anggota(
      'Nova Atika Angelia',
      'Finance',
      'nova-atika-angelia.png',
      'Mengelola anggaran proyek dan mencatat setiap pengeluaran — dari pengadaan sensor, perangkat IoT, sampai kebutuhan operasional greenhouse.',
    ),
    _Anggota(
      'Putri Nadilatu Zahra',
      'Secretary',
      'putri-nadilatu-zahra.png',
      'Menata dokumentasi proyek, menyusun notulen rapat, dan menjaga komunikasi antaranggota tim tetap teratur dan mudah ditemukan.',
    ),
    _Anggota(
      'Siti Azizahtusholihah',
      'Creative & Public Relations',
      'siti-azizahtusholihah.png',
      'Merancang identitas visual dan kabar terbaru proyek, serta menjaga hubungan baik dengan pengguna dan mitra Vertonik Smart Farm.',
    ),
    _Anggota(
      'Muhammad Rizki Maulana',
      'Backend Engineering',
      'muhammad-rizki-maulana.png',
      'Membangun dan merawat API GARAP beserta basis data greenhouse, agar data sensor dan budidaya tersimpan aman, konsisten, dan andal.',
    ),
    _Anggota(
      'Muhammad Zainal Haqi',
      'IoT Engineer',
      'muhammad-zainal-haqi.png',
      'Merancang perangkat ESP32 dan rangkaian sensor hidroponik yang mengirim suhu, pH, dan TDS greenhouse secara real-time ke sistem.',
    ),
    _Anggota(
      'Eka Ridhoni August Firmansyah',
      'Web & Application Developer',
      'eka-ridhoni-august-firmansyah.png',
      'Mengembangkan antarmuka web dan aplikasi yang membuat petani mudah memantau kondisi serta mengatur tanam dari mana saja.',
    ),
  ];

  static const _akun = '@kkn.arutminidn2026';

  static Future<void> _salin(
    BuildContext context,
    String teks,
    String apa,
  ) async {
    await Clipboard.setData(ClipboardData(text: teks));
    if (context.mounted) tampilkanPesan(context, '$apa disalin.');
  }

  void _bukaMitra(BuildContext context, _Mitra m) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      showDragHandle: true,
      builder: (ctx) => SheetKaca(child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Image.asset('assets/tentang/logo/${m.logo}', height: 72),
              ),
              const SizedBox(height: Tok.sp3),
              Text(m.nama, style: Tok.h3),
              Text(m.peran, style: Tok.kecil),
              const SizedBox(height: Tok.sp3),
              Text(m.teks, style: Tok.body),
              if (m.tautan != null) ...[
                const SizedBox(height: Tok.sp3),
                OutlinedButton.icon(
                  onPressed: () => _salin(ctx, m.tautan!, 'Tautan'),
                  icon: const Icon(Ikon.salin, size: 18),
                  label: Text(m.tautan!, overflow: TextOverflow.ellipsis),
                ),
              ],
            ],
          ),
        ),
      )),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lebar = MediaQuery.sizeOf(context).width;
    final kolomMitra = lebar >= 600 ? 4 : 2;

    return Scaffold(
      appBar: const AppBarGlass(judul: 'Tentang Kami'),
      body: LatarHalaman(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            FadeUp(
              child: Panel(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Image.asset('assets/tentang/logo/kkn.png', height: 76),
                    const SizedBox(height: Tok.sp3),
                    const Text(
                      'Merawat nutrisi tanaman, tanpa petani harus menakar sendiri.',
                      style: Tok.h2,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Vertonik Smart Farm (GARAP) adalah sistem IoT untuk greenhouse hidroponik multi-penampung. '
                      'Satu alat kontrol menjaga kadar nutrisi dan pH tiap meja, lalu mengabarkan semua kejadian ke aplikasi petani.',
                      style: Tok.body,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Tok.sp6),
            FadeUp(
              delay: FadeUp.urutan(1),
              child: const Eyebrow('Kolaborasi KKN Arutmin Asik 2026'),
            ),
            const SizedBox(height: Tok.sp3),
            GridView.count(
              crossAxisCount: kolomMitra,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              // tanpa ini GridView menambah padding safe-area (±60 pt kosong di atas kartu)
              padding: EdgeInsets.zero,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.92,
              children: [
                for (var i = 0; i < _mitra.length; i++)
                  FadeUp(
                    delay: FadeUp.urutan(2 + i),
                    child: Panel(
                      padding: const EdgeInsets.all(12),
                      onTap: () => _bukaMitra(context, _mitra[i]),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Image.asset(
                              'assets/tentang/logo/${_mitra[i].logo}',
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: Tok.sp3),
                          Text(
                            _mitra[i].nama,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Tok.tinta,
                              fontSize: 13.5,
                            ),
                          ),
                          Text(
                            _mitra[i].peran,
                            textAlign: TextAlign.center,
                            style: Tok.kecil,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: Tok.sp6),
            const Eyebrow('Tim'),
            const SizedBox(height: Tok.sp3),
            for (final a in _tim) ...[
              FadeUp(child: _KartuAnggota(a)),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: Tok.sp3),
            const Eyebrow('Ikuti kami'),
            const SizedBox(height: Tok.sp3),
            Panel(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Ikon.kamera, color: Tok.mossGelap),
                    title: const Text(
                      'Instagram',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(_akun),
                    trailing: const Icon(Ikon.salin, size: 18, color: Tok.abu),
                    onTap: () => _salin(
                      context,
                      'https://instagram.com/kkn.arutminidn2026',
                      'Tautan Instagram',
                    ),
                  ),
                  ListTile(
                    leading: const Icon(Ikon.musik, color: Tok.mossGelap),
                    title: const Text(
                      'TikTok',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text(_akun),
                    trailing: const Icon(Ikon.salin, size: 18, color: Tok.abu),
                    onTap: () => _salin(
                      context,
                      'https://www.tiktok.com/@kkn.arutminidn2026',
                      'Tautan TikTok',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Tok.sp6),
            const Center(
              child: Text(
                '© 2026 PT Arutmin Indonesia · Vertonik Smart Farm',
                style: Tok.kecil,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KartuAnggota extends StatelessWidget {
  const _KartuAnggota(this.a);

  final _Anggota a;

  @override
  Widget build(BuildContext context) {
    return Panel(
      padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // foto potongan (PNG transparan) di atas lingkaran warna brand
          SizedBox(
            width: 76,
            height: 92,
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                Positioned(
                  bottom: 0,
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: Tok.activePill,
                    ),
                  ),
                ),
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(38),
                  ),
                  child: Image.asset(
                    'assets/tentang/tim/${a.foto}',
                    height: 92,
                    fit: BoxFit.contain,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(a.nama, style: Tok.h3),
                const SizedBox(height: 2),
                Text(
                  a.jabatan,
                  style: const TextStyle(
                    color: Tok.mossGelap,
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  a.deskripsi,
                  style: Tok.kecil.copyWith(color: Tok.tinta, height: 1.45),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Mitra {
  const _Mitra(this.nama, this.peran, this.logo, this.teks, this.tautan);

  final String nama;
  final String peran;
  final String logo;
  final String teks;
  final String? tautan;
}

class _Anggota {
  const _Anggota(this.nama, this.jabatan, this.foto, this.deskripsi);

  final String nama;
  final String jabatan;
  final String foto;
  final String deskripsi;
}
