import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'pages/dashboard_page.dart';
import 'pages/login_page.dart';
import 'pages/profil_page.dart';
import 'pages/sensor_page.dart';
import 'pages/tanam_page.dart';
import 'pages/watercontrol_page.dart';
import 'services/api_service.dart';
import 'services/sesi_store.dart';
import 'theme/tokens.dart';
import 'widgets/dock.dart';
import 'widgets/ikon.dart';
import 'widgets/kaca.dart';

/// GARAP — monitoring greenhouse hidroponik (Arutmin: navy, emas, moss).
/// Terhubung ke backend Node.js lokal: http://127.0.0.1:8000
/// (di iOS Simulator, 127.0.0.1 = Mac host — tidak perlu konfigurasi tambahan).

/// Satu klien API untuk seluruh aplikasi. Sesi disimpan di Keychain/Keystore
/// sehingga petani tetap masuk setelah aplikasi ditutup (sampai token kedaluwarsa).
final ApiService apiService = ApiService(penyimpan: const PenyimpanSesiAman());

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await apiService.pulihkanSesi();
  runApp(const GarapApp());
}

ThemeData _buatTema() {
  final skema = ColorScheme.fromSeed(
    seedColor: Tok.forest,
    primary: Tok.forest,
    secondary: Tok.moss,
    surface: Colors.white,
    error: Tok.error,
  );
  OutlineInputBorder garis(Color c, [double w = 1]) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(Tok.rSm),
    borderSide: BorderSide(color: c, width: w),
  );

  return ThemeData(
    useMaterial3: true,
    fontFamily: Tok.fontIsi,
    colorScheme: skema,
    scaffoldBackgroundColor: Tok.page,
    appBarTheme: const AppBarTheme(
      backgroundColor: Tok.navy,
      foregroundColor: Colors.white,
      elevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.light,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Tok.rLg),
        side: const BorderSide(color: Tok.garis),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
      border: garis(Tok.garis2),
      enabledBorder: garis(Tok.garis2),
      disabledBorder: garis(Tok.garis),
      focusedBorder: garis(Tok.moss, 1.8),
      errorBorder: garis(Tok.error),
      focusedErrorBorder: garis(Tok.error, 1.8),
      labelStyle: const TextStyle(color: Tok.abuTeks),
      prefixIconColor: Tok.abu,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Tok.mossGelap,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 48),
        shape: const StadiumBorder(),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Tok.rLg + 4),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: Tok.moss),
  );
}

class GarapApp extends StatelessWidget {
  const GarapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GARAP',
      debugShowCheckedModeBanner: false,
      theme: _buatTema(),
      // Ikuti ukuran teks sistem, tapi batasi agar dock dan kartu tidak meluber.
      builder: (context, child) => MediaQuery.withClampedTextScaling(
        minScaleFactor: 1.0,
        maxScaleFactor: 1.3,
        child: child!,
      ),
      home: const _GarapRoot(),
    );
  }
}

/// Gerbang aplikasi: belum ada token → halaman masuk, sudah login → shell utama.
class _GarapRoot extends StatefulWidget {
  const _GarapRoot();

  @override
  State<_GarapRoot> createState() => _GarapRootState();
}

class _GarapRootState extends State<_GarapRoot> {
  /// Alasan kembali ke halaman masuk (null = belum pernah sesi berakhir).
  String? _pesanSesi;

  @override
  void initState() {
    super.initState();
    apiService.onUnauthorized = _sesiBerakhir;
  }

  /// 401 dari server: token dicabut di [ApiService], cukup umumkan pesan
  /// lalu biarkan build() menampilkan halaman masuk lagi.
  void _sesiBerakhir() {
    _pesanSesi = 'Sesi Anda berakhir. Silakan masuk kembali.';
    if (!mounted) return;
    setState(() {});
  }

  void _keluar() {
    apiService.clearSession();
    _pesanSesi = null;
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    apiService.onUnauthorized = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Widget isi;
    if (!apiService.isLoggedIn) {
      isi = LoginPage(
        key: const ValueKey('login'),
        api: apiService,
        pesanSesi: _pesanSesi,
        onLoggedIn: () {
          _pesanSesi = null;
          if (mounted) setState(() {});
        },
      );
    } else {
      isi = _MainShell(key: const ValueKey('shell'), onLogout: _keluar);
    }
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 420),
      switchInCurve: Tok.ease,
      child: isi,
    );
  }
}

class _Tab {
  const _Tab(this.label, this.ikon, this.bangun);

  final String label;
  final IconData ikon;
  final Widget Function(bool aktif) bangun;
}

/// Shell utama: dock mengambang bergaya navy dengan tab menurut peran.
class _MainShell extends StatefulWidget {
  const _MainShell({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<_MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<_MainShell>
    with SingleTickerProviderStateMixin {
  late final List<_Tab> _tab;
  late final AnimationController _pudar;
  final Set<int> _dibuka = {0};
  int _indeks = 0;

  @override
  void initState() {
    super.initState();
    final role = apiService.role;
    final kontrol = role == 'admin' || role == 'demo';
    _tab = [
      _Tab(
        'Beranda',
        Ikon.beranda,
        (a) => DashboardPage(api: apiService, aktif: a, onBukaTab: _bukaTab),
      ),
      _Tab('Sensor', Ikon.sensor, (a) => SensorPage(api: apiService, aktif: a)),
      if (kontrol)
        _Tab(
          'Kontrol',
          Ikon.air,
          (a) => WaterControlPage(api: apiService, aktif: a),
        ),
      _Tab('Tanam', Ikon.tanam, (a) => TanamPage(api: apiService, aktif: a)),
      _Tab(
        'Akun',
        Ikon.profil,
        (a) => ProfilPage(api: apiService, aktif: a, onLogout: widget.onLogout),
      ),
    ];
    _pudar = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
      value: 1,
    );
  }

  @override
  void dispose() {
    _pudar.dispose();
    super.dispose();
  }

  /// Dipakai Beranda (menu dan tombol aksi) untuk pindah ke tab lain berdasarkan labelnya.
  void _bukaTab(String label) {
    final i = _tab.indexWhere((t) => t.label == label);
    if (i >= 0) _pilih(i);
  }

  void _pilih(int i) {
    if (i == _indeks) return;
    HapticFeedback.selectionClick();
    setState(() {
      _indeks = i;
      _dibuka.add(i);
    });
    _pudar.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          // satu latar cair untuk semua tab — panel kaca di tiap halaman tampil di atasnya
          const Positioned.fill(child: LatarCair()),
          FadeTransition(
            opacity: CurvedAnimation(parent: _pudar, curve: Tok.ease),
            child: IndexedStack(
              index: _indeks,
              children: [
                // Tab tersembunyi: ticker dijeda (PipeFlow, PulseDot, skeleton) agar hemat baterai.
                for (var i = 0; i < _tab.length; i++)
                  TickerMode(
                    enabled: i == _indeks,
                    child: _dibuka.contains(i)
                        ? _tab[i].bangun(i == _indeks)
                        : const SizedBox.shrink(),
                  ),
              ],
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 0,
            child: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(bottom: 12),
              child: DockNav(
                item: [for (final t in _tab) DockItem(t.label, t.ikon)],
                indeks: _indeks,
                onPilih: _pilih,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
