import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import 'ikon.dart';

/// App bar halaman dalam (desain v2): kaca chrome navy (blur asli) berujung
/// bawah membulat, tombol kembali Lucide, judul Space Grotesk. Pengganti `AppBar`.
class AppBarGlass extends StatelessWidget implements PreferredSizeWidget {
  const AppBarGlass({super.key, required this.judul, this.aksi});

  final String judul;
  final List<Widget>? aksi;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 8);

  @override
  Widget build(BuildContext context) {
    final bisaKembali = Navigator.canPop(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(
          bottom: Radius.circular(Tok.rChrome),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Tok.navy.withValues(alpha: 0.88),
                  Tok.navy2.withValues(alpha: 0.80),
                ],
              ),
              border: Border(
                bottom: BorderSide(color: Colors.white.withValues(alpha: 0.16)),
              ),
            ),
            child: SafeArea(
              bottom: false,
              child: SizedBox(
                height: kToolbarHeight + 8,
                child: Row(
                  children: [
                    if (bisaKembali)
                      IconButton(
                        tooltip: 'Kembali',
                        icon: const Icon(Ikon.kiri, color: Colors.white),
                        onPressed: () => Navigator.maybePop(context),
                      )
                    else
                      const SizedBox(width: Tok.sp4),
                    Expanded(
                      child: Text(
                        judul,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Tok.h3.copyWith(
                          color: Colors.white,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    ...?aksi,
                    const SizedBox(width: Tok.sp2),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
