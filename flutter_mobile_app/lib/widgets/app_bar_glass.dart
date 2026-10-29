import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';
import 'ikon.dart';
import 'kaca.dart';

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
          // chrome: mengambang di atas isi yang digulir, jadi blur sendiri (tidak ikut BackdropGroup)
          child: SizedBox(
            height: _tinggiKartu,
            child: KacaCair(
              varian: KacaVarian.chrome,
              radius: 24,
              padding: EdgeInsets.only(left: bisaKembali ? 8 : 18, right: 8),
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
      ),
    );
  }
}
