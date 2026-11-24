import 'package:flutter/material.dart';

import 'widgets/beranda_baru/bagian_beranda.dart';
import 'widgets/beranda_baru/banner_data_lama.dart';
import 'widgets/beranda_baru/dock_melayang.dart';
import 'widgets/beranda_baru/header_kartu.dart';
import 'widgets/beranda_baru/kartu_sensor.dart';
import 'widgets/beranda_baru/tepi_blur.dart';
import 'widgets/beranda_baru/token_beranda.dart';

// Pratinjau Beranda gaya Figma "Page Final": latar foto, isi digulir di bawah
// blur tepi, header dan menu melayang. SEMUA NILAI DI SINI ADALAH CONTOH
// DESAIN, bukan data alat; jangan dipakai sebagai bacaan sensor.
// Jalankan: flutter run -t lib/pratinjau_beranda_v2.dart
void main() => runApp(const PratinjauBerandaV2());

class PratinjauBerandaV2 extends StatelessWidget {
  const PratinjauBerandaV2({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      fontFamily: TokBeranda.fontIsi,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2D452F)),
      scaffoldBackgroundColor: Colors.white,
    ),
    home: const BerandaV2(),
  );
}

class BerandaV2 extends StatelessWidget {
  const BerandaV2({super.key, this.admin = true});

  final bool admin;

  @override
  Widget build(BuildContext context) {
    final pad = MediaQuery.paddingOf(context);
    final bawahDock = pad.bottom < 12 ? 12.0 : pad.bottom;
    final atasHeader = pad.top + 12;
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/latar/beranda-melon.png',
            fit: BoxFit.cover,
            excludeFromSemantics: true,
          ),
          const ColoredBox(color: Color(0x80FFFFFF)),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: TokBeranda.lebarMaks),
              child: Stack(
                children: [
                  _isi(
                    atas: atasHeader + TokBeranda.tinggiHeader + 16,
                    bawah: bawahDock + TokBeranda.tinggiDock + 24,
                  ),
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: TepiBlur(
                      tinggi: pad.top + TokBeranda.blurAtasDiBawahStatusBar,
                      atas: true,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: TepiBlur(
                      tinggi: TokBeranda.tinggiBlurBawah + pad.bottom,
                      atas: false,
                      warna: const Color(0x33D9D9D9),
                    ),
                  ),
                  Positioned(
                    top: atasHeader,
                    left: TokBeranda.sisi,
                    right: TokBeranda.sisi,
                    child: const HeaderKartu(
                      judul: 'Vertonik - Garap',
                      subjudul: 'Beranda',
                      adaNotifikasi: true,
                    ),
                  ),
                  Positioned(
                    bottom: bawahDock,
                    left: TokBeranda.sisi,
                    right: TokBeranda.sisi,
                    child: DockMelayang(aktif: 'Beranda', admin: admin),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _isi({required double atas, required double bawah}) {
    return ListView(
      // Gulir khas iPhone: memantul di ujung, tetap bisa ditarik walau pendek.
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      padding: EdgeInsets.fromLTRB(
        TokBeranda.sisi,
        atas,
        TokBeranda.sisi,
        bawah,
      ),
      children: const [
        Text(
          'PRATINJAU · DATA CONTOH FIGMA',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: TokBeranda.tinta,
          ),
        ),
        SizedBox(height: TokBeranda.jarakBagian),
        BannerDataLama(jam: '09:41'),
        SizedBox(height: TokBeranda.jarakBagian),
        JudulBagian('Sensor'),
        SizedBox(height: TokBeranda.jarakBagian),
        _BarisSensor(
          kiri: KartuSensor(
            nama: 'pH',
            nilai: '6,1',
            keterangan: 'Terakhir 09:41',
            keadaan: KeadaanSensor.basi,
          ),
          kanan: KartuSensor(
            nama: 'TDS',
            nilai: '640',
            satuan: 'ppm',
            keterangan: 'Terakhir 13:41 · data lama',
            keadaan: KeadaanSensor.basi,
          ),
        ),
        SizedBox(height: TokBeranda.jarakKartu),
        _BarisSensor(
          kiri: KartuSensor(
            nama: 'Suhu Air',
            nilai: '26,2',
            satuan: '°C',
            keterangan: 'Terakhir 09:41',
            keadaan: KeadaanSensor.basi,
          ),
          kanan: KartuSensor(
            nama: 'Suhu Udara',
            nilai: '29,9',
            satuan: '°C',
            keterangan: 'Terakhir 13:41 · data lama',
            keadaan: KeadaanSensor.basi,
          ),
        ),
        SizedBox(height: TokBeranda.jarakBagian + 12),
        JudulBagian('Peringatan terbaru', tautan: 'Lihat semua'),
        SizedBox(height: TokBeranda.jarakBagian),
        PanelPutih(
          child: Column(
            children: [
              BarisPeringatan(judul: 'Kalibrasi pH', waktu: 'Hari ini 08:00'),
              Divider(height: 1),
              BarisPeringatan(
                judul: 'Pelampung bawah rendah',
                waktu: 'Hari ini 09:40',
              ),
            ],
          ),
        ),
        SizedBox(height: TokBeranda.jarakBagian + 12),
        JudulBagian('Tugas hari ini'),
        SizedBox(height: TokBeranda.jarakBagian),
        PanelPutih(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Text(
              'Belum ada tugas dalam pratinjau.',
              style: TextStyle(fontSize: 15, color: TokBeranda.samar),
            ),
          ),
        ),
      ],
    );
  }
}

/// Dua kartu sensor sama lebar dan sama tinggi.
class _BarisSensor extends StatelessWidget {
  const _BarisSensor({required this.kiri, required this.kanan});

  final Widget kiri;
  final Widget kanan;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: kiri),
          const SizedBox(width: TokBeranda.jarakKartu),
          Expanded(child: kanan),
        ],
      ),
    );
  }
}
