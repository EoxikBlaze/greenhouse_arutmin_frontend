import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../pages/asisten_page.dart';
import '../services/api_service.dart';
import '../theme/tokens.dart';
import 'halaman.dart';
import 'ikon.dart';
import 'kaca.dart';
import 'rute.dart';

/// Tombol kapsul kaca melayang untuk membuka Asisten AI GARAP dari halaman mana pun.
class TombolAiKaca extends StatelessWidget {
  const TombolAiKaca({super.key, this.api, this.onTap});

  final ApiService? api;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final targetApi = api ?? ApiServiceScope.of(context);
    final demo = targetApi?.role == 'demo';

    return Semantics(
      button: true,
      label: 'Buka Asisten AI GARAP',
      child: Tooltip(
        message: demo ? 'Mode demo tidak dapat memakai AI' : 'Tanya Asisten AI GARAP',
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: demo
              ? () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Mode demo tidak dapat memakai Asisten AI.'),
                    ),
                  );
                }
              : (onTap ??
                  () {
                    if (targetApi != null) {
                      Navigator.of(context).push(
                        RuteHalus<void>(
                          builder: (_) => AsistenPage(api: targetApi),
                        ),
                      );
                    }
                  }),
          child: Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Tok.isiKaca(0.68, 0.72),
              border: Border.all(
                color: Tok.moss.withValues(alpha: 0.5),
                width: 1.2,
              ),
            ),
            child: Icon(
              Ikon.ai,
              size: 20,
              color: demo ? Tok.abuTeks : Tok.moss,
            ),
          ),
        ),
      ),
    );
  }
}

/// App bar halaman dalam (desain v3): kartu kaca melayang berisi tombol kembali
/// bulat, [eyebrow] kecil + [judul], tombol pintas AI, dan tombol tema.
/// Pengganti `AppBar`.
class AppBarGlass extends StatelessWidget implements PreferredSizeWidget {
  const AppBarGlass({
    super.key,
    required this.judul,
    this.eyebrow,
    this.aksi,
    this.tampilkanAi = true,
  });

  final String judul;
  final String? eyebrow;
  final List<Widget>? aksi;
  final bool tampilkanAi;

  static const double _tinggiKartu = 64;

  @override
  Size get preferredSize => const Size.fromHeight(_tinggiKartu + 16);

  @override
  Widget build(BuildContext context) {
    final bisaKembali = Navigator.canPop(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: Tok.gelap ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
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
                      icon: Icon(Ikon.kiri, color: Tok.tinta),
                      style: IconButton.styleFrom(
                        minimumSize: const Size(48, 48),
                        backgroundColor: Tok.isiKaca(0.7),
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
                            style: TextStyle(
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
                  if (tampilkanAi) ...[
                    const SizedBox(width: 4),
                    const TombolAiKaca(),
                  ],
                  const SizedBox(width: 4),
                  const TombolTemaKaca(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
