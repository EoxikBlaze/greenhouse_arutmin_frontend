import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import 'kaca.dart';

/// Kepala halaman dalam (padanan kartu judul di web): kartu kaca kecil berisi
/// eyebrow grup + judul, dengan [status] opsional di kanan. Menggantikan HeroHeader
/// besar di halaman selain Beranda.
class PageTop extends StatelessWidget {
  const PageTop({
    super.key,
    required this.eyebrow,
    required this.judul,
    this.status,
  });

  final String eyebrow;
  final String judul;
  final Widget? status;

  @override
  Widget build(BuildContext context) {
    final atas = MediaQuery.paddingOf(context).top;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, atas + 12, 16, 0),
        child: KacaCair(
          radius: 24,
          padding: const EdgeInsets.fromLTRB(18, 12, 12, 12),
          warna: [
            Colors.white.withValues(alpha: 0.56),
            Colors.white.withValues(alpha: 0.38),
          ],
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      eyebrow.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
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
                        style: const TextStyle(
                          fontFamily: Tok.fontJudul,
                          fontSize: 24,
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
              if (status != null) ...[const SizedBox(width: 8), status!],
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
        color: Colors.white.withValues(alpha: 0.45),
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

/// Kartu hero kaca bergradasi putih-biru-emas (padanan `.glass-hero` web).
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
        warna: [
          Colors.white.withValues(alpha: 0.5),
          const Color(0xFFCFE2CE).withValues(alpha: 0.34),
          const Color(0xFFF6EDBE).withValues(alpha: 0.38),
        ],
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
          color: Colors.white.withValues(alpha: solid ? 1 : 0.56),
          borderRadius: BorderRadius.circular(14),
          border: solid ? Border.all(color: Tok.garis) : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: Tok.abuTeks),
            ),
            Text(
              nilai,
              style: const TextStyle(
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
