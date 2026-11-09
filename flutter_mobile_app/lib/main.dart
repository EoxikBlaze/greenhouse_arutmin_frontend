import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'pages/asisten_page.dart';
import 'pages/beranda_petani.dart';
import 'pages/dashboard_page.dart';
import 'pages/login_page.dart';
import 'pages/peringatan_page.dart';
import 'pages/profil_page.dart';
import 'pages/sensor_page.dart';
import 'pages/tanam_page.dart';
import 'pages/watercontrol_page.dart';
import 'services/api_service.dart';
import 'services/sesi_store.dart';
import 'theme/tema.dart';
import 'theme/tokens.dart';
import 'util/performa.dart';
import 'widgets/brand.dart';
import 'widgets/dock.dart';
import 'widgets/halaman.dart';
import 'widgets/ikon.dart';
import 'widgets/kaca.dart';
import 'widgets/navigasi_shell.dart';

/// GARAP — pemantauan rumah tanam hidroponik (Arutmin: navy, emas, moss).
/// Terhubung ke perangkat rumah tanam (`http://garap.local` secara bawaan).

/// Satu klien untuk seluruh aplikasi. Sesi disimpan di Keychain/Keystore
/// sehingga pengguna tetap masuk setelah aplikasi ditutup.
final ApiService apiService = ApiService(penyimpan: const PenyimpanSesiAman());

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  PerformaRender.mulai();
  await apiService.pulihkanSesi();
  await PreferensiKaca.muat();
  await PreferensiTema.muat();
  runApp(const GarapApp());
}

ThemeData _buatTema() {
  final skema = ColorScheme.fromSeed(
    brightness: Tok.gelap ? Brightness.dark : Brightness.light,
    seedColor: Tok.forest,
    primary: Tok.gelap ? Tok.moss : Tok.forest,
    secondary: Tok.moss,
    surface: Tok.permukaan,
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
      color: Tok.permukaan,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Tok.rLg),
        side: BorderSide(color: Tok.garis),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Tok.inputIsi,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
      border: garis(Tok.tepiKaca),
      enabledBorder: garis(Tok.tepiKaca),
      disabledBorder: garis(Tok.garis),
      focusedBorder: garis(Tok.moss, 1.8),
      errorBorder: garis(Tok.error),
      focusedErrorBorder: garis(Tok.error, 1.8),
      labelStyle: TextStyle(color: Tok.abuTeks),
      hintStyle: TextStyle(color: Tok.abu),
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
      backgroundColor: Tok.permukaan,
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
    return ValueListenableBuilder<bool>(
      valueListenable: PreferensiTema.gelap,
      builder: (context, _, _) => _bangunApp(),
    );
  }

  Widget _bangunApp() {
    return MaterialApp(
      title: 'GARAP',
      debugShowCheckedModeBanner: false,
      theme: _buatTema(),
      // Ikuti ukuran teks sistem, tapi batasi agar dock dan kartu tidak meluber.
      // Mode kaca (Jernih/Standar/Pekat) dan tingkat performa otomatis (Bagus/Ringan)
      // disebar ke semua permukaan kaca sehingga bila CPU melambat (mis. 20x slower CPU),
      // sistem render langsung menurunkan blur dan animasi berat.
      builder: (context, child) => ValueListenableBuilder<ModeKaca>(
        valueListenable: PreferensiKaca.mode,
        builder: (context, mode, _) => ValueListenableBuilder<TingkatPerforma>(
          valueListenable: PerformaRender.tingkat,
          builder: (context, perf, _) => KacaScope(
            mode: mode,
            performaRingan: perf == TingkatPerforma.ringan,
            child: MediaQuery.withClampedTextScaling(
              minScaleFactor: 1.0,
              maxScaleFactor: 1.3,
              child: TransisiTema(child: child!),
            ),
          ),
        ),
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

class _MainShellState extends State<_MainShell> {
  late final List<_Tab> _tab;
  final Set<int> _dibuka = {0};
  int _indeks = 0;
  bool _adaNotif = false;
  Widget? _halamanDalam;
  String? _judulHalamanDalam;

  @override
  void initState() {
    super.initState();
    final role = apiService.role;
    final kontrol = role == 'admin' || role == 'demo';
    _tab = [
      _Tab(
        'Beranda',
        Ikon.beranda,
        (a) => role == 'petani'
            ? BerandaPetani(api: apiService, aktif: a, onBukaTab: _bukaTab)
            : DashboardPage(api: apiService, aktif: a, onBukaTab: _bukaTab),
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
    _cekAlertAktif();
  }

  Future<void> _cekAlertAktif() async {
    try {
      final res = await apiService.getJson('/alert-logs?limit=1');
      if (!mounted) return;
      final aktif = res is Map && res['aktif'] is num
          ? (res['aktif'] as num).toInt()
          : 0;
      setState(() {
        _adaNotif = aktif > 0;
      });
    } catch (_) {
      // Abaikan galat polling notifikasi awal
    }
  }

  void _bukaHalaman(Widget halaman, String judul) {
    HapticFeedback.selectionClick();
    setState(() {
      _halamanDalam = halaman;
      _judulHalamanDalam = judul;
    });
  }

  void _tutupHalaman() {
    HapticFeedback.selectionClick();
    setState(() {
      _halamanDalam = null;
      _judulHalamanDalam = null;
    });
  }

  /// Dipakai Beranda (menu dan tombol aksi) untuk pindah ke tab lain berdasarkan labelnya.
  void _bukaTab(String label) {
    final i = _tab.indexWhere((t) => t.label == label);
    if (i >= 0) _pilih(i);
  }

  void _pilih(int i) {
    HapticFeedback.selectionClick();
    setState(() {
      _indeks = i;
      _dibuka.add(i);
      _halamanDalam = null;
      _judulHalamanDalam = null;
    });
  }

  String _subjudulTab(int i) {
    if (i < 0 || i >= _tab.length) return 'Dashboard';
    final l = _tab[i].label;
    if (l == 'Beranda') return 'Dashboard';
    if (l == 'Sensor') return 'Sensor';
    if (l == 'Kontrol') return 'Kontrol Air';
    if (l == 'Tanam') return 'Jadwal Tanam';
    if (l == 'Akun') return 'Profil Akun';
    return l;
  }

  @override
  Widget build(BuildContext context) {
    return NavigasiShellScope(
      bukaHalaman: _bukaHalaman,
      tutupHalaman: _tutupHalaman,
      adaHalamanDalam: _halamanDalam != null,
      child: PopScope(
        canPop: _halamanDalam == null && _indeks == 0,
        onPopInvokedWithResult: (didPop, _) {
          if (didPop) return;
          if (_halamanDalam != null) {
            _tutupHalaman();
          } else if (_indeks != 0) {
            _pilih(0);
          }
        },
        child: ApiServiceScope(
          api: apiService,
          child: NavigasiBerandaScope(
            onKembali: _halamanDalam != null ? _tutupHalaman : null,
            child: Scaffold(
              extendBody: true,
              body: Stack(
                children: [
                  // Satu latar cair untuk semua tab dan halaman
                  const Positioned.fill(child: LatarCair()),

                  // Konten tengah: transisi cross-fade lembut tanpa kedip
                  Positioned.fill(
                    top: MediaQuery.paddingOf(context).top + 80,
                    child: BackdropGroup(
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 840),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 220),
                            switchInCurve: Curves.easeOutCubic,
                            switchOutCurve: Curves.easeInCubic,
                            transitionBuilder: (child, animation) {
                              return FadeTransition(
                                opacity: animation,
                                child: child,
                              );
                            },
                            child: KeyedSubtree(
                              key: ValueKey<String>(
                                _halamanDalam != null
                                    ? 'dalam-$_judulHalamanDalam'
                                    : 'tab-$_indeks',
                              ),
                              child: _halamanDalam ?? _tab[_indeks].bangun(true),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Header Arutmin selalu dipin di paling atas (tidak bergerak saat ganti halaman)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Builder(
                      builder: (context) {
                        final u = apiService.user;
                        final username = u?['username']?.toString() ?? '';
                        final inisial = username.trim().isNotEmpty
                            ? username.trim().substring(0, username.trim().length >= 2 ? 2 : 1).toUpperCase()
                            : null;
                        return ArutminHeader(
                          subjudul: _judulHalamanDalam ?? _subjudulTab(_indeks),
                          bisaKembali: _halamanDalam != null,
                          onKembali: _halamanDalam != null ? _tutupHalaman : null,
                          adaNotif: _adaNotif,
                          inisial: inisial,
                          fotoProfil: null,
                          onProfileTap: () {
                            if (_halamanDalam != null) _tutupHalaman();
                            _bukaTab('Akun');
                          },
                          onNotifTap: () {
                            _bukaHalaman(
                              PeringatanPage(
                                api: apiService,
                                tanpaAppBar: true,
                                onSelesai: _cekAlertAktif,
                              ),
                              'Peringatan',
                            );
                          },
                        );
                      },
                    ),
                  ),

                  // Tombol Asisten AI melayang tepat di atas footer dock (hanya di halaman utama, sembunyikan jika sedang di subpage/chat AI)
                  if (_halamanDalam == null)
                    Positioned(
                      right: 20,
                      bottom: 86,
                      child: SafeArea(
                        top: false,
                        child: _TombolAiDiatasFooter(
                          onTap: () => _bukaHalaman(
                            AsistenPage(
                              api: apiService,
                              tanpaAppBar: true,
                            ),
                            'Asisten GARAP',
                          ),
                        ),
                      ),
                    ),

                  // Footer dock selalu dipin di bagian bawah (tidak bergerak saat ganti halaman)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 0,
                    child: SafeArea(
                      top: false,
                      minimum: const EdgeInsets.only(bottom: 12),
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 520),
                          child: DockNav(
                            item: [for (final t in _tab) DockItem(t.label, t.ikon)],
                            indeks: _halamanDalam != null ? -1 : _indeks,
                            onPilih: _pilih,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tombol mengambang Asisten AI tepat di atas footer (DockNav) di semua tab.
class _TombolAiDiatasFooter extends StatelessWidget {
  const _TombolAiDiatasFooter({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(999),
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(999),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.42),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.28),
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.auto_awesome,
                color: Colors.white,
                size: 18,
              ),
              const SizedBox(width: 8),
              const Text(
                'Tanya AI',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
