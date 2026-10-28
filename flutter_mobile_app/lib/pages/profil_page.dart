import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import '../util/format.dart';
import '../widgets/brand.dart';
import '../widgets/ikon.dart';
import '../widgets/dock.dart';
import '../widgets/halaman.dart';
import '../widgets/motion.dart';
import '../widgets/rute.dart';
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
        PageTop(
          eyebrow: 'Sistem',
          judul: 'Akun',
          status: StatusPill(
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
          padding: EdgeInsets.fromLTRB(16, 16, 16, DockNav.ruang(context)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FadeUp(
                child: HeroKartu(
                  child: Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Tok.emas,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.9),
                            width: 3,
                          ),
                        ),
                        child: Text(
                          nama
                              .substring(0, nama.length < 2 ? nama.length : 2)
                              .toUpperCase(),
                          style: const TextStyle(
                            fontFamily: Tok.fontJudul,
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: Tok.navy,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              nama,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Tok.h2,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _surel.text.isEmpty ? 'Akun GARAP' : _surel.text,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Tok.kecil,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: Tok.sp6),
              if (_galat != null) ...[
                Text(_galat!, style: Tok.kecil.copyWith(color: Tok.error)),
                const SizedBox(height: 12),
              ],
              FadeUp(child: const Eyebrow('Pintasan')),
              const SizedBox(height: Tok.sp3),
              FadeUp(
                delay: FadeUp.urutan(1),
                child: Panel(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    children: [
                      if (!demo)
                        _Pintas(
                          ikon: Ikon.ai,
                          label: 'Asisten AI',
                          onTap: () => Navigator.of(context).push(
                            RuteHalus<void>(
                              builder: (_) => AsistenPage(api: widget.api),
                            ),
                          ),
                        ),
                      _Pintas(
                        ikon: Ikon.cctv,
                        label: 'CCTV greenhouse',
                        onTap: () => Navigator.of(context).push(
                          RuteHalus<void>(
                            builder: (_) => CctvPage(api: widget.api),
                          ),
                        ),
                      ),
                      if (role == 'admin')
                        _Pintas(
                          ikon: Ikon.meja,
                          label: 'Daftar meja',
                          onTap: () => Navigator.of(context).push(
                            RuteHalus<void>(
                              builder: (_) => MejaPage(api: widget.api),
                            ),
                          ),
                        ),
                      _Pintas(
                        ikon: Ikon.audit,
                        label: 'Riwayat monitoring',
                        onTap: () => Navigator.of(context).push(
                          RuteHalus<void>(
                            builder: (_) =>
                                RiwayatMonitoringPage(api: widget.api),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: Tok.sp6),
              FadeUp(
                delay: FadeUp.urutan(2),
                child: const Eyebrow('Data profil'),
              ),
              const SizedBox(height: Tok.sp3),
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
                            prefixIcon: Icon(Ikon.profil, size: 20),
                          ),
                          validator: (v) => (v == null || v.trim().length < 3)
                              ? 'Nama pengguna minimal 3 karakter.'
                              : null,
                        ),
                        const SizedBox(height: Tok.sp3),
                        TextFormField(
                          controller: _surel,
                          enabled: !demo,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Ikon.surel, size: 20),
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
              const SizedBox(height: Tok.sp6),
              FadeUp(
                delay: FadeUp.urutan(4),
                child: const Eyebrow('Kata sandi'),
              ),
              const SizedBox(height: Tok.sp3),
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
                            prefixIcon: Icon(Ikon.kunci, size: 20),
                          ),
                          validator: (v) =>
                              (v == null || v.isEmpty) ? 'Wajib diisi.' : null,
                        ),
                        const SizedBox(height: Tok.sp3),
                        TextFormField(
                          controller: _baru,
                          obscureText: true,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Kata sandi baru',
                            prefixIcon: Icon(Ikon.kunciKunci, size: 20),
                          ),
                          validator: (v) => (v == null || v.length < 8)
                              ? 'Minimal 8 karakter.'
                              : null,
                        ),
                        const SizedBox(height: Tok.sp3),
                        TextFormField(
                          controller: _ulang,
                          obscureText: true,
                          enabled: !demo,
                          decoration: const InputDecoration(
                            labelText: 'Ulangi kata sandi baru',
                            prefixIcon: Icon(Ikon.terverifikasi, size: 20),
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
                const SizedBox(height: Tok.sp3),
                const Text(
                  'Akun demo tidak dapat mengubah profil atau kata sandi.',
                  style: Tok.kecil,
                ),
              ],
              const SizedBox(height: Tok.sp6),
              FadeUp(
                delay: FadeUp.urutan(6),
                child: const Eyebrow('Pengaturan'),
              ),
              const SizedBox(height: Tok.sp3),
              FadeUp(
                delay: FadeUp.urutan(7),
                child: Panel(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: _Pintas(
                    ikon: Ikon.info,
                    label: 'Tentang Kami',
                    onTap: () => Navigator.of(context).push(
                      RuteHalus<void>(builder: (_) => const TentangPage()),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: Tok.sp6),
              FadeUp(
                delay: FadeUp.urutan(8),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final ok = await konfirmasi(
                        context,
                        judul: 'Keluar dari akun?',
                        isi: 'Anda perlu masuk lagi untuk memakai aplikasi.',
                        labelYa: 'Ya, keluar',
                        bahaya: true,
                      );
                      if (ok) widget.onLogout();
                    },
                    icon: const Icon(Ikon.keluar, size: 18),
                    label: const Text('Keluar'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Tok.error,
                      backgroundColor: Colors.white.withValues(alpha: 0.6),
                      side: const BorderSide(color: Tok.error),
                      shape: const StadiumBorder(),
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
    return Pressable(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 56),
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.95)),
        ),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Tok.moss.withValues(alpha: 0.16),
              ),
              child: Icon(ikon, size: 18, color: Tok.forest),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            const Icon(Ikon.kanan, size: 18, color: Tok.abu),
          ],
        ),
      ),
    );
  }
}
