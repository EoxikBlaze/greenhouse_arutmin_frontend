import 'package:flutter/material.dart';

import 'widgets/ikon.dart';

// Pratinjau terpisah: semua nilai contoh desain, tanpa koneksi ke perangkat.
void main() => runApp(const PratinjauBeranda());

class PratinjauBeranda extends StatelessWidget {
  const PratinjauBeranda({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      fontFamily: 'Inter',
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2D452F)),
      scaffoldBackgroundColor: const Color(0xFFB9E2FA),
    ),
    home: const _Beranda(),
  );
}

class _Beranda extends StatelessWidget {
  const _Beranda();

  static const _tinta = Color(0xFF0B1A2B);
  static const _samar = Color(0xFF526580);

  Widget _panel(Widget child, {Color color = Colors.white}) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFE2E8DD)),
    ),
    child: child,
  );

  Widget _sensor(String label, String nilai, String satuan) => Expanded(
    child: _panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: _samar, fontSize: 13)),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: nilai,
                  style: const TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 30,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF929AA5),
                  ),
                ),
                TextSpan(
                  text: ' $satuan',
                  style: const TextStyle(fontSize: 14, color: _samar),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Terakhir 09:41',
            style: TextStyle(fontSize: 12, color: _samar),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF0D4),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE0A42B)),
            ),
            child: const Text(
              '● Data lama',
              style: TextStyle(fontSize: 12, color: Color(0xFF895300)),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _judul(String text) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 19,
        fontWeight: FontWeight.w700,
        color: _tinta,
      ),
    ),
  );

  Widget _peringatan(String title, String time) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        const Icon(Ikon.peringatan, color: Color(0xFFC18014), size: 30),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(time),
            ],
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          'assets/latar/beranda-melon.png',
          fit: BoxFit.cover,
          excludeFromSemantics: true,
        ),
        const ColoredBox(color: Color(0x66FFFFFF)),
        SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
                    child: _panel(
                      Row(
                        children: [
                          Image.asset(
                            'assets/tentang/logo/kkn.png',
                            width: 44,
                            height: 44,
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Vertonik - Garap',
                                  style: TextStyle(
                                    fontSize: 19,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text('Beranda'),
                              ],
                            ),
                          ),
                          const Icon(Ikon.peringatan, color: _samar, size: 22),
                          const SizedBox(width: 12),
                          const CircleAvatar(
                            radius: 17,
                            child: Icon(Ikon.profil, size: 20),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'PRATINJAU · DATA CONTOH FIGMA',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: _tinta,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _panel(
                            const Row(
                              children: [
                                Icon(Ikon.audit, color: Color(0xFF895300)),
                                SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Data Sensor Lama',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      Text('Terakhir diperbarui pukul 09:41'),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            color: const Color(0xFFFFECCE),
                          ),
                          _judul('Sensor'),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _sensor('pH', '6,1', ''),
                              const SizedBox(width: 12),
                              _sensor('TDS', '640', 'ppm'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _sensor('Suhu Air', '26,2', '°C'),
                              const SizedBox(width: 12),
                              _sensor('Suhu Udara', '29,9', '°C'),
                            ],
                          ),
                          _judul('Peringatan terbaru'),
                          _panel(
                            Column(
                              children: [
                                _peringatan('Kalibrasi pH', 'Hari ini 08:00'),
                                const Divider(height: 1),
                                _peringatan(
                                  'Pelampung bawah rendah',
                                  'Hari ini 09:40',
                                ),
                              ],
                            ),
                          ),
                          _judul('Tugas hari ini'),
                          _panel(
                            const Text('Belum ada tugas dalam pratinjau.'),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
                    child: _panel(
                      Row(
                        children: [
                          for (final item in [
                            ('Beranda', Ikon.beranda),
                            ('Tanam', Ikon.tanam),
                            ('Alat', Ikon.ambang),
                            ('Peringatan', Ikon.peringatan),
                            ('Akun', Ikon.profil),
                          ])
                            Expanded(
                              child: Semantics(
                                selected: item.$1 == 'Beranda',
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      item.$2,
                                      size: 22,
                                      color: item.$1 == 'Beranda'
                                          ? const Color(0xFF42662B)
                                          : _samar,
                                    ),
                                    const SizedBox(height: 5),
                                    Text(
                                      item.$1,
                                      maxLines: 1,
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: item.$1 == 'Beranda'
                                            ? const Color(0xFF42662B)
                                            : _samar,
                                      ),
                                    ),
                                  ],
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
          ),
        ),
      ],
    ),
  );
}
