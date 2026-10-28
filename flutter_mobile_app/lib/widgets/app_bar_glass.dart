import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import 'ikon.dart';

/// App bar halaman dalam (desain v3): kartu kaca melayang berisi tombol kembali
/// bulat, [eyebrow] kecil + [judul]. Satu bahasa dengan `PageTop` di tab utama.
/// Pengganti `AppBar`.
class AppBarGlass extends StatelessWidget implements PreferredSizeWidget {
  const AppBarGlass({super.key, required this.judul, this.eyebrow, this.aksi});

  final String judul;
  final String? eyebrow;
  final List<Widget>? aksi;

  static const double _tinggiKartu = 64;

  @override
  Size get preferredSize => const Size.fromHeight(_tinggiKartu + 16);

  @override
  Widget build(BuildContext context) {
    final bisaKembali = Navigator.canPop(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Container(
            height: _tinggiKartu,
            padding: EdgeInsets.only(left: bisaKembali ? 8 : 18, right: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.9)),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withValues(alpha: 0.8),
                  const Color(0xFFD7E8F8).withValues(alpha: 0.62),
                ],
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x332A5080),
                  blurRadius: 28,
                  spreadRadius: -10,
                  offset: Offset(0, 12),
                ),
              ],
            ),
            child: Row(
              children: [
                if (bisaKembali) ...[
                  IconButton(
                    tooltip: 'Kembali',
                    icon: const Icon(Ikon.kiri, color: Tok.tinta),
                    style: IconButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      backgroundColor: Colors.white.withValues(alpha: 0.7),
                    ),
                    onPressed: () => Navigator.maybePop(context),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (eyebrow != null)
                        Text(
                          eyebrow!.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.4,
                            color: Tok.abuTeks,
                          ),
                        ),
                      Text(
                        judul,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Tok.h3.copyWith(
                          color: Tok.tinta,
                          fontSize: 20,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                ...?aksi,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
