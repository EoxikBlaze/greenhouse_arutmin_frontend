import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../config.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/kaca.dart';
import '../widgets/motion.dart';

/// Halaman masuk — POST /login ke backend Node.js.
///
/// Tampilan mengikuti halaman login web: panel brand navy dengan motif pipa
/// yang mengalir, formulir putih, dan getar singkat saat gagal.
class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.api,
    required this.onLoggedIn,
    this.pesanSesi,
  });

  final ApiService api;
  final VoidCallback onLoggedIn;

  /// Pesan tampil sekali di atas form, mis. setelah sesi berakhir (401).
  final String? pesanSesi;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  // Sengaja kosong: nama akun seed berganti dari waktu ke waktu.
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  late final AnimationController _getar;
  bool _busy = false;
  bool _lihat = false;

  /// Setelah percobaan masuk pertama, validasi berjalan tiap kali isian berubah —
  /// pesan "minimal 3 karakter" langsung hilang begitu isian sudah benar.
  bool _sudahKirim = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _getar = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
    );
  }

  /// Host:port backend yang sedang dituju (untuk teks penanda di bawah form).
  String get _alamatBackend {
    final uri = Uri.tryParse(apiBase);
    if (uri == null) return apiBase;
    return uri.host == '127.0.0.1' && uri.hasPort
        ? '${uri.host}:${uri.port}'
        : uri.authority;
  }

  @override
  void dispose() {
    _getar.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_sudahKirim) setState(() => _sudahKirim = true);
    if (!(_formKey.currentState?.validate() ?? false)) {
      _getar.forward(from: 0);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.login(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
      if (!mounted) return;
      setState(() => _busy = false);
      widget.onLoggedIn();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
      _getar.forward(from: 0);
    }
  }

  InputDecoration _dekor(String label, IconData ikon, {Widget? akhir}) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(ikon, size: 20),
      suffixIcon: akhir,
    );
  }

  Widget _formulir() {
    return AnimatedBuilder(
      animation: _getar,
      builder: (context, child) {
        final t = _getar.value;
        final dx = math.sin(t * math.pi * 6) * 9 * (1 - t);
        return Transform.translate(offset: Offset(dx, 0), child: child);
      },
      child: Form(
        key: _formKey,
        autovalidateMode: _sudahKirim
            ? AutovalidateMode.onUserInteraction
            : AutovalidateMode.disabled,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FadeUp(
              delay: FadeUp.urutan(1),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Eyebrow('Akses sistem'),
                  SizedBox(height: 10),
                  Text('Selamat datang kembali', style: Tok.h1),
                  SizedBox(height: 4),
                  Text(
                    'Masukkan akun untuk memantau greenhouse Anda.',
                    style: Tok.kecil,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (widget.pesanSesi != null) ...[
              _Kabar(
                teks: widget.pesanSesi!,
                ikon: Icons.info_outline,
                warna: Tok.warning,
              ),
              const SizedBox(height: 16),
            ],
            FadeUp(
              delay: FadeUp.urutan(2),
              child: TextFormField(
                controller: _usernameCtrl,
                autofillHints: const [AutofillHints.username],
                textInputAction: TextInputAction.next,
                decoration: _dekor('Nama pengguna', Icons.person_outline),
                validator: (v) => (v == null || v.trim().length < 3)
                    ? 'Nama pengguna minimal 3 karakter.'
                    : null,
              ),
            ),
            const SizedBox(height: 14),
            FadeUp(
              delay: FadeUp.urutan(3),
              child: TextFormField(
                controller: _passwordCtrl,
                obscureText: !_lihat,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                decoration: _dekor(
                  'Kata sandi',
                  Icons.lock_outline,
                  akhir: IconButton(
                    tooltip: _lihat ? 'Sembunyikan' : 'Tampilkan',
                    icon: Icon(
                      _lihat
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 20,
                    ),
                    onPressed: () => setState(() => _lihat = !_lihat),
                  ),
                ),
                validator: (v) => (v == null || v.length < 3)
                    ? 'Kata sandi minimal 3 karakter.'
                    : null,
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 260),
              curve: Tok.ease,
              alignment: Alignment.topCenter,
              child: _error == null
                  ? const SizedBox(width: double.infinity)
                  : Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: _Kabar(
                        teks: _error!,
                        ikon: Icons.error_outline,
                        warna: Tok.error,
                      ),
                    ),
            ),
            const SizedBox(height: 20),
            FadeUp(
              delay: FadeUp.urutan(4),
              child: TombolGradasi(
                label: 'Masuk',
                sibuk: _busy,
                onTap: _submit,
              ),
            ),
            const SizedBox(height: 14),
            FadeUp(
              delay: FadeUp.urutan(5),
              child: Text(
                'Backend: $_alamatBackend',
                textAlign: TextAlign.center,
                style: Tok.kecil,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _merek({required bool lebar}) {
    return Stack(
      children: [
        const Positioned.fill(child: PipeFlow()),
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topLeft,
                radius: 1.2,
                colors: [Tok.moss.withValues(alpha: 0.30), Colors.transparent],
              ),
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              28,
              lebar ? 40 : 20,
              28,
              lebar ? 40 : 40,
            ),
            child: Column(
              mainAxisAlignment: lebar
                  ? MainAxisAlignment.center
                  : MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                FadeUp(child: Monogram(size: lebar ? 64 : 48)),
                const SizedBox(height: 16),
                FadeUp(
                  delay: FadeUp.urutan(1),
                  child: Text(
                    'GARAP',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: lebar ? 40 : 30,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 4,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                FadeUp(
                  delay: FadeUp.urutan(2),
                  child: Text(
                    'Monitoring greenhouse hidroponik',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.78),
                      fontSize: 14,
                    ),
                  ),
                ),
                if (lebar) ...[
                  const SizedBox(height: 22),
                  FadeUp(
                    delay: FadeUp.urutan(3),
                    child: Container(width: 54, height: 3, color: Tok.emas),
                  ),
                  const SizedBox(height: 18),
                  FadeUp(
                    delay: FadeUp.urutan(4),
                    child: Text(
                      'Sensor realtime, kendali air, dan siklus tanam\n'
                      'dalam satu tempat.',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final lebar = MediaQuery.sizeOf(context).width >= 900;

    if (lebar) {
      return Scaffold(
        backgroundColor: Tok.page,
        body: Row(
          children: [
            Expanded(
              flex: 5,
              child: DecoratedBox(
                decoration: const BoxDecoration(gradient: Tok.brandPanel),
                child: _merek(lebar: true),
              ),
            ),
            Expanded(
              flex: 4,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(32),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: _formulir(),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      body: LatarHalaman(
        child: SingleChildScrollView(
          child: Column(
            children: [
              DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: Tok.brandPanel,
                  borderRadius: BorderRadius.vertical(
                    bottom: Radius.circular(Tok.rChrome),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(Tok.rChrome),
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: _merek(lebar: false),
                  ),
                ),
              ),
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 440),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                    // form di atas panel kaca, sama dengan kartu di dalam aplikasi
                    child: KacaCair(
                      padding: const EdgeInsets.all(20),
                      child: _formulir(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Kabar extends StatelessWidget {
  const _Kabar({required this.teks, required this.ikon, required this.warna});

  final String teks;
  final IconData ikon;
  final Color warna;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(Tok.r),
        border: Border.all(color: warna.withValues(alpha: 0.30)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(ikon, size: 18, color: warna),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              teks,
              style: const TextStyle(color: Tok.tinta, height: 1.35),
            ),
          ),
        ],
      ),
    );
  }
}
