import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/api_service.dart';
import '../theme/tokens.dart';
import 'app_bar_glass.dart';
import 'ikon.dart';
import 'kaca.dart';

/// Menyediakan akses [ApiService] ke seluruh widget turunan (termasuk PageTop dan AppBarGlass).
class ApiServiceScope extends InheritedWidget {
  const ApiServiceScope({
    super.key,
    required this.api,
    required super.child,
  });

  final ApiService api;

  static ApiService? of(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<ApiServiceScope>()
        ?.api;
  }

  @override
  bool updateShouldNotify(ApiServiceScope oldWidget) => api != oldWidget.api;
}

/// Menyediakan aksi kembali ke tab Beranda bagi halaman tab non-Beranda yang
/// memakai [PageTop], sehingga di layar mobile selalu tersedia tombol kembali.
class NavigasiBerandaScope extends InheritedWidget {
  const NavigasiBerandaScope({
    super.key,
    required this.onKembali,
    required super.child,
  });

  final VoidCallback? onKembali;

  static VoidCallback? of(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<NavigasiBerandaScope>()
        ?.onKembali;
  }

  @override
  bool updateShouldNotify(NavigasiBerandaScope oldWidget) =>
      onKembali != oldWidget.onKembali;
}

/// Kepala halaman dalam (padanan kartu judul di web): kartu kaca kecil berisi
/// tombol kembali (bila halaman bisa di-pop atau berada di tab selain Beranda),
/// eyebrow grup + judul, dengan [status] opsional di kanan, dan tombol pintas AI.
class PageTop extends StatelessWidget {
  const PageTop({
    super.key,
    required this.eyebrow,
    required this.judul,
    this.status,
    this.onKembali,
    this.tampilkanAi = true,
  });

  final String eyebrow;
  final String judul;
  final Widget? status;
  final VoidCallback? onKembali;
  final bool tampilkanAi;

  @override
  Widget build(BuildContext context) {
    final atas = MediaQuery.paddingOf(context).top;
    final bisaPop = Navigator.canPop(context);
    final aksiKembali =
        onKembali ??
        (bisaPop
            ? () => Navigator.maybePop(context)
            : NavigasiBerandaScope.of(context));

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: Tok.gelap ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, atas + 12, 16, 0),
        child: KacaCair(
          varian: KacaVarian.chrome,
          radius: 24,
          padding: EdgeInsets.fromLTRB(
            aksiKembali != null ? 8 : 14,
            10,
            10,
            10,
          ),
          child: Row(
            children: [
              if (aksiKembali != null) ...[
                IconButton(
                  tooltip: 'Kembali',
                  icon: Icon(Ikon.kiri, color: Tok.tinta),
                  style: IconButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    backgroundColor: Tok.isiKaca(0.72, 0.72),
                  ),
                  onPressed: aksiKembali,
                ),
                const SizedBox(width: 8),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eyebrow.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                        color: Tok.abuTeks,
                      ),
                    ),
                    Semantics(
                      header: true,
                      child: Text(
                        judul,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: Tok.fontJudul,
                          fontSize: 22,
                          height: 1.2,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                          color: Tok.tinta,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (status != null) ...[
                const SizedBox(width: 6),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: status!,
                  ),
                ),
              ],
              if (tampilkanAi) ...[
                const SizedBox(width: 6),
                const TombolAiKaca(),
              ],
              const SizedBox(width: 6),
              const TombolTemaKaca(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Deretan pil pilihan (padanan nav pill web): satu pil hijau aktif, sisanya kaca.
class PilPilih extends StatelessWidget {
  const PilPilih({
    super.key,
    required this.label,
    required this.pilih,
    required this.onPilih,
    this.gulir = false,
    this.rata = false,
  });

  final List<String> label;
  final int pilih;
  final ValueChanged<int>? onPilih;

  /// Bisa digeser horizontal (banyak pil).
  final bool gulir;

  /// Pil membagi lebar sama rata (segmented, mis. Otomatis | Manual).
  final bool rata;

  @override
  Widget build(BuildContext context) {
    // Track tanpa blur sendiri (ada di atas kaca: bukan kaca di atas kaca), hanya tint + rim.
    final pil = Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: Tok.isiKaca(0.48, 0.62),
        borderRadius: BorderRadius.circular(999),
      ),
      foregroundDecoration: const _RimPil(),
      child: Row(
        mainAxisSize: rata ? MainAxisSize.max : MainAxisSize.min,
        children: [
          for (var i = 0; i < label.length; i++)
            if (rata) Expanded(child: _item(i)) else _item(i),
        ],
      ),
    );
    if (!gulir) return pil;
    return SingleChildScrollView(scrollDirection: Axis.horizontal, child: pil);
  }

  Widget _item(int i) {
    final aktif = i == pilih;
    return Semantics(
      button: true,
      selected: aktif,
      label: label[i],
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPilih == null ? null : () => onPilih!(i),
        child: AnimatedContainer(
          duration: Tok.dNormal,
          curve: Tok.ease,
          constraints: const BoxConstraints(minHeight: 40),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            gradient: aktif ? Tok.activePill : null,
            borderRadius: BorderRadius.circular(999),
            boxShadow: aktif
                ? const [
                    BoxShadow(
                      color: Color(0x596B9D4A),
                      blurRadius: 12,
                      spreadRadius: -4,
                      offset: Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label[i],
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: aktif ? Colors.white : Tok.tinta.withValues(alpha: 0.72),
            ),
          ),
        ),
      ),
    );
  }
}

/// Kartu hero kaca bergradasi putih-biru-emas di mode terang, dan zamrud-navy-emas di mode gelap (padanan `.glass-hero` web).
class HeroKartu extends StatelessWidget {
  const HeroKartu({super.key, required this.child, this.padding = 18});

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: KacaCair(
        radius: 28,
        padding: EdgeInsets.all(padding),
        warna: Tok.tintHero,
        child: child,
      ),
    );
  }
}

/// Kotak angka kecil berlatar kaca (label di atas, nilai tebal di bawah). Dipakai
/// untuk rincian di dalam kartu (meja, riwayat monitoring).
class MiniNilai extends StatelessWidget {
  const MiniNilai(this.label, this.nilai, {super.key});

  final String label;
  final String nilai;

  @override
  Widget build(BuildContext context) {
    // Di dalam kartu kaca: tint + rim tipis, tanpa blur sendiri.
    final solid = KacaScope.solid(context);
    return CustomPaint(
      foregroundPainter: solid ? null : const RimKaca(radius: 14, kecil: true),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: solid ? Tok.permukaan : Tok.isiKaca(0.58, 0.66),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: solid ? Tok.garis : Tok.tepiKaca),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, color: Tok.abuTeks)),
            Text(
              nilai,
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: Tok.tinta,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Rim tipis untuk track pil (bentuk kapsul).
class _RimPil extends Decoration {
  const _RimPil();

  @override
  BoxPainter createBoxPainter([VoidCallback? onChanged]) => _RimPilPainter();
}

class _RimPilPainter extends BoxPainter {
  @override
  void paint(Canvas canvas, Offset offset, ImageConfiguration configuration) {
    final ukuran = configuration.size;
    if (ukuran == null) return;
    canvas.save();
    canvas.translate(offset.dx, offset.dy);
    RimKaca(radius: ukuran.height / 2, kecil: true).paint(canvas, ukuran);
    canvas.restore();
  }
}
