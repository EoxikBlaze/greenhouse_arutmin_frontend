// Pemformat kecil yang dipakai bersama oleh halaman-halaman.

const List<String> _bulan = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

String _dua(int n) => n.toString().padLeft(2, '0');

/// Ubah nilai apa pun (angka / teks angka) menjadi `double`, atau null.
double? keDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

/// Angka dengan [desimal] digit; '-' bila kosong / bukan angka.
String fmtAngka(dynamic v, {int desimal = 1}) {
  if (v == null) return '-';
  final d = keDouble(v);
  if (d == null) return v.toString();
  return d.toStringAsFixed(desimal);
}

/// '22 Okt 14:05' (waktu lokal perangkat).
String waktuPendek(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${d.day} ${_bulan[d.month - 1]} ${_dua(d.hour)}:${_dua(d.minute)}';
}

/// '22 Okt 2026'.
String tanggalPendek(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return '${d.day} ${_bulan[d.month - 1]} ${d.year}';
}

/// Berapa hari sejak [iso] (minimal 0); null bila tak terbaca.
int? hariSejak(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return null;
  final selisih = DateTime.now().difference(d).inDays;
  return selisih < 0 ? 0 : selisih;
}

/// '5 detik lalu', '3 menit lalu', '2 jam lalu', '4 hari lalu'.
String waktuRelatif(String? iso) {
  if (iso == null || iso.isEmpty) return '-';
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return iso;
  return waktuRelatifDari(d);
}

/// Sama seperti [waktuRelatif] tetapi dari [DateTime] yang sudah ada.
String waktuRelatifDari(DateTime d) {
  final s = DateTime.now().difference(d).inSeconds;
  if (s < 5) return 'baru saja';
  if (s < 60) return '$s detik lalu';
  if (s < 3600) return '${s ~/ 60} menit lalu';
  if (s < 86400) return '${s ~/ 3600} jam lalu';
  return '${s ~/ 86400} hari lalu';
}

/// Sapaan menurut jam lokal.
String sapaanWaktu() {
  final h = DateTime.now().hour;
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/// Huruf kapital pertama tiap kata, untuk nama tampilan.
String judulKata(String s) {
  if (s.isEmpty) return s;
  return s
      .split(RegExp(r'\s+'))
      .where((k) => k.isNotEmpty)
      .map((k) => k[0].toUpperCase() + k.substring(1))
      .join(' ');
}
