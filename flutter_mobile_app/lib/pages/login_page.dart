import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
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
  bool _ingat = true;

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
              child: Column(
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
                ikon: Ikon.info,
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
                decoration: _dekor('Nama pengguna', Ikon.profil),
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
                  Ikon.kunci,
                  akhir: IconButton(
                    tooltip: _lihat ? 'Sembunyikan' : 'Tampilkan',
                    icon: Icon(_lihat ? Ikon.mataCoret : Ikon.mata, size: 20),
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
                        ikon: Ikon.salah,
                        warna: Tok.error,
                      ),
                    ),
            ),
            const SizedBox(height: 16),
            FadeUp(
              delay: FadeUp.urutan(4),
              child: TombolGradasi(
                label: 'Masuk',
                sibuk: _busy,
                onTap: _submit,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: Checkbox(
                    value: _ingat,
                    visualDensity: VisualDensity.compact,
                    onChanged: _busy
                        ? null
                        : (v) => setState(() => _ingat = v ?? true),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: _busy ? null : () => setState(() => _ingat = !_ingat),
                    child: Text(
                      'Ingatkan saya (tetap masuk)',
                      style: Tok.kecil.copyWith(color: Tok.tinta),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                _TombolPeranCepat(
                  label: 'Superadmin',
                  sub: 'Kendali penuh',
                  aktif: _usernameCtrl.text == 'garap',
                  onTap: _busy
                      ? null
                      : () => setState(() {
                          _usernameCtrl.text = 'garap';
                          _passwordCtrl.text = 'garap123';
                          _error = null;
                        }),
                ),
                _TombolPeranCepat(
                  label: 'Petani',
                  sub: 'Operasional',
                  aktif: _usernameCtrl.text == 'petani',
                  onTap: _busy
                      ? null
                      : () => setState(() {
                          _usernameCtrl.text = 'petani';
                          _passwordCtrl.text = 'petani123';
                          _error = null;
                        }),
                ),
                _TombolPeranCepat(
                  label: 'Demo (Hanya Lihat)',
                  sub: 'Tanpa ubah',
                  aktif: _usernameCtrl.text == 'demo',
                  onTap: _busy
                      ? null
                      : () => setState(() {
                          _usernameCtrl.text = 'demo';
                          _passwordCtrl.text = 'demo123';
                          _error = null;
                        }),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _kepalaKaca() {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 920),
            child: KacaCair(
              varian: KacaVarian.chrome,
              radius: 26,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  const Monogram(size: 38),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Text(
                              'GARAP',
                              style: TextStyle(
                                fontFamily: Tok.fontJudul,
                                fontSize: 15.5,
                                fontWeight: FontWeight.w800,
                                color: Tok.tinta,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                '· Vertonik Smart Farm',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontFamily: Tok.fontJudul,
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: Tok.tinta,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          'Monitoring greenhouse hidroponik',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: Tok.abuTeks,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const TombolTemaKaca(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _merekKaca() {
    return KacaCair(
      padding: const EdgeInsets.all(28),
      child: Stack(
        children: [
          const Positioned.fill(child: PipeFlow()),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const FadeUp(child: Monogram(size: 60)),
              const SizedBox(height: 16),
              FadeUp(
                delay: FadeUp.urutan(1),
                child: Text(
                  'GARAP',
                  style: TextStyle(
                    fontFamily: Tok.fontJudul,
                    color: Tok.tinta,
                    fontSize: 36,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 3,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              FadeUp(
                delay: FadeUp.urutan(2),
                child: Text(
                  'Monitoring greenhouse hidroponik',
                  style: TextStyle(color: Tok.abuTeks, fontSize: 14),
                ),
              ),
              const SizedBox(height: 20),
              FadeUp(
                delay: FadeUp.urutan(3),
                child: Container(width: 54, height: 3, color: Tok.emas),
              ),
              const SizedBox(height: 16),
              FadeUp(
                delay: FadeUp.urutan(4),
                child: Text(
                  'Sensor realtime, kendali air, dan siklus tanam\n'
                  'dalam satu tempat.',
                  style: TextStyle(color: Tok.abuTeks, height: 1.5),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lebar = MediaQuery.sizeOf(context).width >= 900;

    return Scaffold(
      body: LatarHalaman(
        child: Column(
          children: [
            _kepalaKaca(),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: lebar ? 920 : 440),
                    child: lebar
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Expanded(flex: 5, child: _merekKaca()),
                              const SizedBox(width: 20),
                              Expanded(
                                flex: 5,
                                child: KacaCair(
                                  padding: const EdgeInsets.all(24),
                                  child: _formulir(),
                                ),
                              ),
                            ],
                          )
                        : KacaCair(
                            padding: const EdgeInsets.all(20),
                            child: _formulir(),
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TombolPeranCepat extends StatelessWidget {
  const _TombolPeranCepat({
    required this.label,
    required this.sub,
    required this.aktif,
    required this.onTap,
  });

  final String label;
  final String sub;
  final bool aktif;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Tok.ease,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: aktif ? Tok.isiKaca(0.88) : Tok.isiKaca(0.55),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: aktif
                  ? Tok.moss.withValues(alpha: 0.65)
                  : Tok.tepiKaca,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: aktif ? Tok.hijauTeks : Tok.tinta,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                sub,
                style: TextStyle(
                  fontSize: 10.5,
                  color: Tok.abuTeks,
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
            child: Text(teks, style: TextStyle(color: Tok.tinta, height: 1.35)),
          ),
        ],
      ),
    );
  }
}
