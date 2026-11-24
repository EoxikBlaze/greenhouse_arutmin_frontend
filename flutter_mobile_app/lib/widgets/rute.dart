import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Rute halaman desain v2: memudar sambil naik sedikit (380ms masuk, 240ms keluar).
/// Pengganti drop-in `MaterialPageRoute` (parameter `builder` sama). Saat pengguna
/// mengurangi gerakan, halaman muncul langsung tanpa transisi.
class RuteHalus<T> extends PageRouteBuilder<T> {
  RuteHalus({required WidgetBuilder builder, super.settings})
    : super(
        pageBuilder: (context, _, _) => builder(context),
        transitionDuration: Tok.dLambat,
        reverseTransitionDuration: const Duration(milliseconds: 240),
        transitionsBuilder: (context, animasi, _, anak) {
          if (MediaQuery.disableAnimationsOf(context)) return anak;
          final kurva = CurvedAnimation(parent: animasi, curve: Tok.ease);
          return FadeTransition(
            opacity: kurva,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.03),
                end: Offset.zero,
              ).animate(kurva),
              child: anak,
            ),
          );
        },
      );
}
