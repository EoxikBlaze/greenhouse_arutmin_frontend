import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Font bawaan PDF (Helvetica) tanpa dukungan Unicode: batasi ke ASCII, ganti tanda umum.
String amanPdf(Object? v) {
  final s = (v ?? '-').toString();
  return s
      .replaceAll('–', '-')
      .replaceAll('—', '-')
      .replaceAll('→', '->')
      .replaceAll('≤', '<=')
      .replaceAll('≥', '>=')
      .replaceAll("±", "+/-")
      .replaceAll("·", "-")
      .replaceAll(RegExp(r"[^\x00-\x7F]"), "?");
}

const _labelStatusPanen = {
  'sesuai': 'Sesuai jadwal',
  'segera': 'Segera panen',
  'terlambat': 'Lewat perkiraan',
};

/// Susun PDF laporan periode dari `GET /api/analitik/ringkasan` (+ saran dari `/saran-dosis`).
Future<Uint8List> buatPdfLaporan(
  Map<Object?, Object?> r, {
  List<Map<Object?, Object?>> saran = const [],
  String periode = 'Semua data',
}) async {
  Map<Object?, Object?> m(Object? v) => v is Map ? v : const {};
  final sensor = m(r['sensor']);
  final alert = m(r['alert']);
  final panen = m(r['panen']);
  final tanam = m(r['tanam']);
  final batch =
      (r['batch_berjalan'] is List
              ? r['batch_berjalan'] as List
              : const <Object?>[])
          .whereType<Map<Object?, Object?>>()
          .toList();

  final doc = pw.Document(title: 'Laporan GARAP', author: 'GARAP Smart Farm');
  pw.Widget baris(String k, Object? v) => pw.Padding(
    padding: const pw.EdgeInsets.symmetric(vertical: 2),
    child: pw.Row(
      children: [
        pw.Expanded(flex: 3, child: pw.Text(amanPdf(k))),
        pw.Expanded(
          flex: 2,
          child: pw.Text(
            amanPdf(v),
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
          ),
        ),
      ],
    ),
  );
  pw.Widget judul(String t) => pw.Padding(
    padding: const pw.EdgeInsets.only(top: 14, bottom: 6),
    child: pw.Text(
      t,
      style: pw.TextStyle(
        fontSize: 13,
        fontWeight: pw.FontWeight.bold,
        color: PdfColor.fromInt(0xFF2D452F),
      ),
    ),
  );

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(32),
      build: (_) => [
        pw.Text(
          'Laporan GARAP - Vertonik Smart Farm',
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.Text(
          amanPdf('Periode: $periode  |  Dibuat: ${r['dibuat'] ?? '-'}'),
          style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700),
        ),
        judul('Kondisi larutan'),
        baris('Jumlah bacaan sensor', sensor['bacaan']),
        baris(
          'pH rata-rata (min - maks)',
          '${sensor['ph_rata'] ?? '-'} (${sensor['ph_min'] ?? '-'} - ${sensor['ph_maks'] ?? '-'})',
        ),
        baris(
          'TDS rata-rata ppm (min - maks)',
          '${sensor['tds_rata'] ?? '-'} (${sensor['tds_min'] ?? '-'} - ${sensor['tds_maks'] ?? '-'})',
        ),
        baris('Suhu air rata-rata (C)', sensor['suhu_air_rata']),
        judul('Peringatan'),
        baris('Total peringatan', alert['total']),
        baris('Belum ditangani', alert['aktif']),
        baris('Kritis', alert['kritis']),
        judul('Tanam dan panen'),
        baris('Semai baru', tanam['semai_baru']),
        baris('Kali panen', panen['kali']),
        baris('Tanaman dipanen berhasil', panen['berhasil']),
        baris('Tanaman gagal panen', panen['gagal']),
        judul('Perkiraan panen batch berjalan'),
        if (batch.isEmpty)
          pw.Text('Tidak ada batch yang sedang berjalan.')
        else
          pw.TableHelper.fromTextArray(
            headerStyle: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              fontSize: 9,
            ),
            cellStyle: const pw.TextStyle(fontSize: 9),
            headers: [
              'Tanaman',
              'Meja',
              'Tahap',
              'Perkiraan panen',
              'Sisa hari',
              'Status',
            ],
            data: batch.map((b) {
              final p = m(b['prediksi']);
              return [
                amanPdf(b['varietas']),
                amanPdf(b['meja']),
                amanPdf(b['tipe']),
                p.isEmpty ? 'Durasi belum diatur' : amanPdf(p['tgl_prediksi']),
                p.isEmpty ? '-' : amanPdf(p['sisa_hari']),
                p.isEmpty
                    ? '-'
                    : amanPdf(_labelStatusPanen[p['status']] ?? p['status']),
              ];
            }).toList(),
          ),
        if (saran.isNotEmpty) ...[
          judul('Saran nutrisi dari tren sensor'),
          ...saran.map((s) => pw.Bullet(text: amanPdf(s['saran']))),
          pw.Text(
            'Saran saja. Tidak ada dosis yang dijalankan otomatis.',
            style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
          ),
        ],
      ],
    ),
  );
  return doc.save();
}
