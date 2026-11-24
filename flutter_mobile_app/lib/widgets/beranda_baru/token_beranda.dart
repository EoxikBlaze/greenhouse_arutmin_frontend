import 'package:flutter/material.dart';

/// Token gaya Beranda baru, diambil dari frame "Admin - Beranda - Data Basi"
/// (page 99 Page Final di Garap Mobile.fig).
class TokBeranda {
  TokBeranda._();

  static const Color navy = Color(0xFF0A1F38);
  static const Color tinta = Color(0xFF0B1A2B);
  static const Color samar = Color(0xFF4F6075);
  static const Color garisKartu = Color(0xFFE2E8DD);

  /// Kuning "data lama": garis dan titik memakai warna Figma (#E0A42B),
  /// teks memakai versi lebih gelap agar lolos kontras 4,5:1.
  static const Color kuning = Color(0xFFE0A42B);
  static const Color kuningTeks = Color(0xFF895300);

  static const Color hijauAktif = Color(0xFF42662B);
  static const Color hijauNormal = Color(0xFF4E7733);
  static const Color hijauNormalTeks = Color(0xFF3C5F25);
  static const Color lonceng = Color(0xFF999999);
  static const Color titikNotifikasi = Color(0xFFFF3B30);

  /// Gradien horizontal #FFF2DB -> #FDE9CA (cat "Status Data Lama").
  static const LinearGradient gradienDataLama = LinearGradient(
    colors: [Color(0xFFFFF2DB), Color(0xFFFDE9CA)],
  );

  static const double radiusKartu = 20;
  static const double radiusHeader = 21;
  static const double sisi = 20;
  static const double jarakBagian = 12;
  static const double jarakKartu = 14;
  static const double tinggiHeader = 75;
  static const double tinggiDock = 72;
  static const double blurAtasDiBawahStatusBar = 36;
  static const double tinggiBlurBawah = 60;
  static const double lebarMaks = 480;

  static const String fontJudul = 'SpaceGrotesk';
  static const String fontIsi = 'Inter';
}
