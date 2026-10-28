import 'package:flutter/material.dart';

/// Token desain GARAP — disalin dari web (react-web-app/tailwind.config.js
/// dan src/index.css) supaya tampilan mobile identik dengan website.
class Tok {
  Tok._();

  // ── Warna ────────────────────────────────────────────────────────────
  static const Color navy = Color(0xFF0A1F38);
  static const Color navy2 = Color(0xFF071527);
  static const Color navy3 = Color(0xFF123253);
  static const Color emas = Color(0xFFE9CD53);
  static const Color moss = Color(0xFF6B9D4A);
  static const Color mossGelap = Color(0xFF4E7733);
  static const Color mossGelap2 = Color(0xFF42662B);
  static const Color forest = Color(0xFF2D452F);
  static const Color olive = Color(0xFF4C6A4B);
  static const Color mint = Color(0xFFCFE2CE);
  static const Color page = Color(0xFFF4F7F2);
  static const Color garis = Color(0xFFE2E8DD);
  static const Color garis2 = Color(0xFFD7E0D2);
  static const Color tinta = Color(0xFF0B1A2B);
  static const Color abu = Color(0xFF64748B);

  /// Abu untuk TEKS kecil (≥4,5:1 di atas `page`); [abu] untuk ikon/dekorasi.
  static const Color abuTeks = Color(0xFF556277);
  static const Color error = Color(0xFFC0392B);
  static const Color warning = Color(0xFFE0A42B);

  // ── Desain v2: jarak, radius tingkat tiga, gerak ─────────────────────
  static const double sp1 = 4;
  static const double sp2 = 8;
  static const double sp3 = 12;
  static const double sp4 = 16;
  static const double sp6 = 24;
  static const double sp8 = 32;

  /// Kartu 20, chrome (dock/bilah/sheet) 28; kecil = [r] (12).
  static const double rKartu = 20;
  static const double rChrome = 28;

  static const Duration dCepat = Duration(milliseconds: 120);
  static const Duration dNormal = Duration(milliseconds: 220);
  static const Duration dLambat = Duration(milliseconds: 380);

  // ── Radius ───────────────────────────────────────────────────────────
  static const double rSm = 10;
  static const double r = 12;
  static const double rLg = 14;

  // ── Gerak (cubic-bezier(0.22, 1, 0.36, 1) seperti --ar-ease di web) ───
  static const Curve ease = Cubic(0.22, 1, 0.36, 1);

  // ── Gradasi ──────────────────────────────────────────────────────────
  static const LinearGradient brandPanel = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [navy, navy2, navy3],
    stops: [0.0, 0.55, 1.0],
  );

  static const LinearGradient chrome = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [navy, navy2],
  );

  static const LinearGradient primary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [forest, olive],
  );

  static const LinearGradient activePill = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [mossGelap, mossGelap2],
  );

  // ── Bayangan ─────────────────────────────────────────────────────────
  static const List<BoxShadow> soft = [
    BoxShadow(color: Color(0x0D0A1F38), blurRadius: 2, offset: Offset(0, 1)),
    BoxShadow(
      color: Color(0x730A1F38),
      blurRadius: 30,
      spreadRadius: -22,
      offset: Offset(0, 14),
    ),
  ];

  static const List<BoxShadow> deep = [
    BoxShadow(
      color: Color(0x8C071527),
      blurRadius: 64,
      spreadRadius: -30,
      offset: Offset(0, 28),
    ),
  ];

  // Literal yang SENGAJA tetap di luar token (dipakai sekali, tanpa padanan web):
  // warna seri kelembapan 0xFF3A86A8 (sensor_page), titik live 0xFFE5484D (cctv),
  // blob kaca (kaca.dart), ukuran font 10.5/12.5/13/15 di beberapa halaman.

  // ── Tipografi (tanpa font tambahan: memakai font sistem) ─────────────
  static const TextStyle h1 = TextStyle(
    fontSize: 26,
    height: 1.25,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    color: tinta,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 19,
    height: 1.3,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.2,
    color: tinta,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 16,
    height: 1.35,
    fontWeight: FontWeight.w600,
    color: tinta,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14.5,
    height: 1.4,
    color: tinta,
  );

  static const TextStyle kecil = TextStyle(
    fontSize: 12,
    height: 1.35,
    color: abuTeks,
  );

  static const TextStyle eyebrow = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.3,
    color: abuTeks,
  );
}
