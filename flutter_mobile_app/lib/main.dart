import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'pages/dashboard_page.dart';
import 'pages/login_page.dart';
import 'pages/profil_page.dart';
import 'pages/sensor_page.dart';
import 'pages/tanam_page.dart';
import 'pages/watercontrol_page.dart';
import 'services/api_service.dart';
import 'theme/tokens.dart';
import 'widgets/kaca.dart';

/// GARAP — monitoring greenhouse hidroponik (Arutmin: navy, emas, moss).
/// Terhubung ke backend Node.js lokal: http://127.0.0.1:8000
/// (di iOS Simulator, 127.0.0.1 = Mac host — tidak perlu konfigurasi tambahan).

/// Satu klien API untuk seluruh aplikasi (token disimpan di memori di sini).
final ApiService apiService = ApiService();

void main() {
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
      labelStyle: const TextStyle(color: Tok.abu),
      prefixIconColor: Tok.abu,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Tok.mossGelap,
        foregroundColor: Colors.white,
        minimumSize: const Size(0, 46),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tok.rSm),
        ),
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
  const _Tab(this.label, this.ikon, this.ikonAktif, this.bangun);

  final String label;
  final IconData ikon;
  final IconData ikonAktif;
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
        Icons.home_outlined,
        Icons.home_rounded,
        (a) => DashboardPage(api: apiService, aktif: a),
      ),
      _Tab(
        'Sensor',
        Icons.sensors_outlined,
        Icons.sensors_rounded,
        (a) => SensorPage(api: apiService, aktif: a),
      ),
      if (kontrol)
        _Tab(
          'Kontrol',
          Icons.water_drop_outlined,
          Icons.water_drop_rounded,
          (a) => WaterControlPage(api: apiService, aktif: a),
        ),
      _Tab(
        'Tanam',
        Icons.spa_outlined,
        Icons.spa_rounded,
        (a) => TanamPage(api: apiService, aktif: a),
      ),
      _Tab(
        'Akun',
        Icons.person_outline_rounded,
        Icons.person_rounded,
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
                for (var i = 0; i < _tab.length; i++)
                  _dibuka.contains(i)
                      ? _tab[i].bangun(i == _indeks)
                      : const SizedBox.shrink(),
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
              child: _Dock(tab: _tab, indeks: _indeks, onPilih: _pilih),
            ),
          ),
        ],
      ),
    );
  }
}

class _Dock extends StatelessWidget {
  const _Dock({required this.tab, required this.indeks, required this.onPilih});

  final List<_Tab> tab;
  final int indeks;
  final ValueChanged<int> onPilih;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Tok.navy.withValues(alpha: 0.80),
                Tok.navy2.withValues(alpha: 0.72),
              ],
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x66071527),
                blurRadius: 30,
                spreadRadius: -6,
                offset: Offset(0, 14),
              ),
            ],
          ),
          child: Row(
            children: [
              for (var i = 0; i < tab.length; i++)
                Expanded(
                  flex: i == indeks ? 3 : 2,
                  child: _ItemDock(
                    tab: tab[i],
                    aktif: i == indeks,
                    onTap: () => onPilih(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ItemDock extends StatelessWidget {
  const _ItemDock({
    required this.tab,
    required this.aktif,
    required this.onTap,
  });

  final _Tab tab;
  final bool aktif;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: aktif,
      label: tab.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 320),
          curve: Tok.ease,
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(
            gradient: aktif ? Tok.activePill : null,
            borderRadius: BorderRadius.circular(22),
            boxShadow: aktif
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
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                aktif ? tab.ikonAktif : tab.ikon,
                size: 22,
                color: aktif
                    ? Colors.white
                    : Colors.white.withValues(alpha: 0.62),
              ),
              if (aktif) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    tab.label,
                    maxLines: 1,
                    overflow: TextOverflow.clip,
                    softWrap: false,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
