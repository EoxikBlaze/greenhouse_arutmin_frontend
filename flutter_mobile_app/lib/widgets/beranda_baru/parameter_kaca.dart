/// Parameter efek Glass dari Figma (frame "Blur", page 99 Page Final).
class ParameterKaca {
  const ParameterKaca({
    this.frost = 4,
    this.depth = 20,
    this.sudutCahaya = -45,
    this.intensitasCahaya = 0.8,
    this.dispersi = 0.5,
  });

  /// Kekaburan latar (sigma).
  final double frost;

  /// Kedalaman lensa di tepi, dalam piksel.
  final double depth;

  /// Derajat; -45 = cahaya dari kiri-atas, pantulan di kanan-bawah.
  final double sudutCahaya;
  final double intensitasCahaya;

  /// Pita warna tipis di tepi (pemisahan warna).
  final double dispersi;

  static const figma = ParameterKaca();
}
