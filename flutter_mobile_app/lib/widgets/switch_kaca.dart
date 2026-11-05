import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';

/// Switch liquid glass: rel kaca ber-tint hijau saat ON; thumb kaca melar saat ditekan,
/// lalu meluncur dengan spring (easeOutBack). Zona sentuh 48 px, label untuk pembaca layar.
class SwitchKaca extends StatefulWidget {
  const SwitchKaca({
    super.key,
    required this.nyala,
    required this.onUbah,
    required this.label,
  });

  final bool nyala;

  /// null = nonaktif.
  final ValueChanged<bool>? onUbah;
  final String label;

  @override
  State<SwitchKaca> createState() => _SwitchKacaState();
}

class _SwitchKacaState extends State<SwitchKaca> {
  bool _tekan = false;

  static const double _lebar = 56;
  static const double _tinggi = 32;
  static const double _thumb = 26;

  @override
  Widget build(BuildContext context) {
    final aktif = widget.onUbah != null;
    final lebarThumb = _tekan ? 34.0 : _thumb;
    return Semantics(
      label: widget.label,
      toggled: widget.nyala,
      enabled: aktif,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: aktif ? (_) => setState(() => _tekan = true) : null,
        onTapCancel: () => setState(() => _tekan = false),
        onTapUp: (_) => setState(() => _tekan = false),
        onTap: aktif
            ? () {
                HapticFeedback.selectionClick();
                widget.onUbah!(!widget.nyala);
              }
            : null,
        child: Opacity(
          opacity: aktif ? 1 : 0.55,
          child: SizedBox(
            width: _lebar + 8,
            height: 48,
            child: Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 350),
                curve: Curves.easeOutCubic,
                width: _lebar,
                height: _tinggi,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(_tinggi),
                  color: widget.nyala
                      ? Tok.mossGelap.withValues(alpha: 0.72)
                      : Colors.white.withValues(alpha: 0.35),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                  boxShadow: widget.nyala
                      ? [
                          BoxShadow(
                            color: Tok.moss.withValues(alpha: 0.45),
                            blurRadius: 14,
                          ),
                        ]
                      : const [],
                ),
                child: Stack(
                  children: [
                    AnimatedPositioned(
                      duration: const Duration(milliseconds: 450),
                      curve: Curves.easeOutBack,
                      top: 2,
                      left: widget.nyala ? _lebar - 4 - lebarThumb : 2,
                      width: lebarThumb,
                      height: _thumb,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(_thumb),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.white.withValues(alpha: 0.98),
                              const Color(0xFFEBF5FF).withValues(alpha: 0.82),
                            ],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                      ),
                    ),
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
