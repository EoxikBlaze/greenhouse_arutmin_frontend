import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/motion.dart';
import 'asisten_page.dart';
import 'cctv_page.dart';
import 'meja_page.dart';
import 'riwayat_monitoring_page.dart';
import 'tentang_page.dart';

/// Akun — profil, ganti kata sandi, pintasan Meja / Riwayat, pengaturan (Tentang Kami), dan keluar.
class ProfilPage extends StatefulWidget {
  const ProfilPage({
    super.key,
    required this.api,
    required this.onLogout,
    this.aktif = true,
  });

  final ApiService api;
  final VoidCallback onLogout;
  final bool aktif;

  @override
  State<ProfilPage> createState() => _ProfilPageState();
}

class _ProfilPageState extends State<ProfilPage> {
  final _profilKey = GlobalKey<FormState>();
  final _sandiKey = GlobalKey<FormState>();
  final _nama = TextEditingController();
  final _surel = TextEditingController();
  final _lama = TextEditingController();
  final _baru = TextEditingController();
  final _ulang = TextEditingController();

  bool _simpanProfil = false;
  bool _simpanSandi = false;
  String? _galat;

  @override
  void initState() {
    super.initState();
    final u = widget.api.user;
    _nama.text = u?['username']?.toString() ?? '';
    _surel.text = u?['email']?.toString() ?? '';
    _muat();
  }

  @override
  void dispose() {
    _nama.dispose();
    _surel.dispose();
    _lama.dispose();
    _baru.dispose();
    _ulang.dispose();
    super.dispose();
  }

  Future<void> _muat() async {
    try {
      final d = await widget.api.getJson('/profil');
      final u = d is Map ? d['user'] : null;
      if (!mounted || u is! Map) return;
      setState(() {
        _nama.text = u['username']?.toString() ?? _nama.text;
        _surel.text = u['email']?.toString() ?? _surel.text;
        _galat = null;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _galat = e.message);
    }
  }

  Future<void> _simpan() async {
    if (!(_profilKey.currentState?.validate() ?? false)) return;
    setState(() => _simpanProfil = true);
    try {
      await widget.api.postJson('/profil/update', {
        'username': _nama.text.trim(),
        'email': _surel.text.trim(),
      });
      if (!mounted) return;
      tampilkanPesan(context, 'Profil diperbarui.');
    } on ApiException catch (e) {
      if (!mounted) return;
      tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _simpanProfil = false);
    }
  }

  Future<void> _gantiSandi() async {
    if (!(_sandiKey.currentState?.validate() ?? false)) return;
    setState(() => _simpanSandi = true);
    try {
      await widget.api.postJson('/profil/password', {
        'password_lama': _lama.text,
        'password': _baru.text,
        'password_confirmation': _ulang.text,
      });
      if (!mounted) return;
      _lama.clear();
      _baru.clear();
      _ulang.clear();
      tampilkanPesan(context, 'Kata sandi diganti.');
    } on ApiException catch (e) {
      if (!mounted) return;
      tampilkanPesan(context, e.message, galat: true);
    } finally {
      if (mounted) setState(() => _simpanSandi = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.api.role;
    final demo = role == 'demo';
    final nama = judulKata(_nama.text.isEmpty ? 'Pengguna' : _nama.text);

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        HeroHeader(
          judul: nama,
          subjudul: _surel.text.isEmpty ? 'Akun GARAP' : _surel.text,
          bawah: StatusPill(
            terang: true,
            warna: Tok.emas,
            teks: role == 'admin'
                ? 'Administrator'
                : demo
                ? 'Akun demo'
                : 'Petani',
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_galat != null) ...[
                Text(_galat!, style: Tok.kecil.copyWith(color: Tok.error)),
                const SizedBox(height: 12),
              ],
              FadeUp(child: const Eyebrow('Pintasan')),
              const SizedBox(height: 10),
              FadeUp(
                delay: FadeUp.urutan(1),
                child: Panel(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: [
                      if (!demo)
                        _Pintas(
                          ikon: Icons.smart_toy_outlined,
                          label: 'Asisten AI',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => AsistenPage(api: widget.api),
                            ),
                          ),
                        ),
                      _Pintas(
                        ikon: Icons.videocam_outlined,
                        label: 'CCTV greenhouse',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => CctvPage(api: widget.api),
                          ),
                        ),
                      ),
                      if (role == 'admin')
                        _Pintas(
                          ikon: Icons.grid_view_rounded,
                          label: 'Daftar meja',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => MejaPage(api: widget.api),
                            ),
                          ),
                        ),
                      _Pintas(
                        ikon: Icons.history_rounded,
                        label: 'Riwayat monitoring',
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                RiwayatMonitoringPage(api: widget.api),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 22),
              FadeUp(
                delay: FadeUp.urutan(2),
                child: const Eyebrow('Data profil'),
              ),
              const SizedBox(height: 10),
              FadeUp(
                delay: FadeUp.urutan(3),
                child: Panel(
                  child: Form(
                    key: _profilKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _nama,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Nama pengguna',
                            prefixIcon: Icon(Icons.person_outline, size: 20),
                          ),
                          validator: (v) => (v == null || v.trim().length < 3)
                              ? 'Nama pengguna minimal 3 karakter.'
                              : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _surel,
                          enabled: !demo,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.mail_outline, size: 20),
                          ),
                          validator: (v) => (v == null || !v.contains('@'))
                              ? 'Email tidak valid.'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TombolGradasi(
                          label: 'Simpan profil',
                          sibuk: _simpanProfil,
                          onTap: demo ? null : _simpan,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              FadeUp(
                delay: FadeUp.urutan(4),
                child: const Eyebrow('Kata sandi'),
              ),
              const SizedBox(height: 10),
              FadeUp(
                delay: FadeUp.urutan(5),
                child: Panel(
                  child: Form(
                    key: _sandiKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _lama,
                          obscureText: true,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Kata sandi lama',
                            prefixIcon: Icon(Icons.lock_outline, size: 20),
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Wajib diisi.' : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _baru,
                          obscureText: true,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Kata sandi baru',
                            prefixIcon: Icon(Icons.lock_reset, size: 20),
                          ),
                          validator: (v) => (v == null || v.length < 6)
                              ? 'Minimal 6 karakter.'
                              : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _ulang,
                          obscureText: true,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Ulangi kata sandi baru',
                            prefixIcon: Icon(
                              Icons.verified_user_outlined,
                              size: 20,
                            ),
                          ),
                          validator: (v) => v != _baru.text
                              ? 'Tidak sama dengan kata sandi baru.'
                              : null,
                        ),
                        const SizedBox(height: 16),
                        TombolGradasi(
                          label: 'Ganti kata sandi',
                          sibuk: _simpanSandi,
                          onTap: demo ? null : _gantiSandi,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (demo) ...[
                const SizedBox(height: 10),
                const Text(
                  'Akun demo tidak dapat mengubah profil atau kata sandi.',
                  style: Tok.kecil,
                ),
              ],
              const SizedBox(height: 22),
              FadeUp(
                delay: FadeUp.urutan(6),
                child: const Eyebrow('Pengaturan'),
              ),
              const SizedBox(height: 10),
              FadeUp(
                delay: FadeUp.urutan(7),
                child: Panel(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: _Pintas(
                    ikon: Icons.info_outline_rounded,
                    label: 'Tentang Kami',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const TentangPage(),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              FadeUp(
                delay: FadeUp.urutan(8),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: widget.onLogout,
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    label: const Text('Keluar'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Tok.error,
                      side: const BorderSide(color: Tok.error),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Tok.rSm),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Pintas extends StatelessWidget {
  const _Pintas({required this.ikon, required this.label, required this.onTap});

  final IconData ikon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(ikon, color: Tok.mossGelap),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: const Icon(Icons.chevron_right_rounded, color: Tok.abu),
      onTap: onTap,
    );
  }
}
