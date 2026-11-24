import { parsePrediksi, parseSaran, sisaHari } from '@/features/beranda/analitikView';

test('sisaHari: hari ini, nanti, lewat', () => {
  expect(sisaHari(0)).toBe('hari ini');
  expect(sisaHari(3)).toBe('3 hari lagi');
  expect(sisaHari(-2)).toBe('lewat 2 hari');
});

test('parsePrediksi: prediksi null (durasi belum diatur) dan baris rusak dibuang', () => {
  const p = parsePrediksi({ status: true, tanpa_prediksi: 1, list: [
    { tipe: 'semai', id: 1, varietas: 'Melon', meja: 'M1', mulai: '2026-11-01', prediksi: { tgl_prediksi: '2026-12-01', sisa_hari: 7, status: 'segera' } },
    { tipe: 'pendewasaan', id: 2, varietas: null, meja: null, mulai: '2026-10-01', prediksi: null },
    { tipe: 'aneh', id: 3, mulai: '2026-10-01' },
    { tipe: 'semai', id: 4, mulai: '2026-10-01', prediksi: { tgl_prediksi: '2026-12-01', sisa_hari: 'x', status: 'sesuai' } },
  ] });
  expect(p.list.map((i) => [i.id, i.prediksi?.status ?? null])).toEqual([[1, 'segera'], [2, null], [4, null]]);
  expect(p.tanpaPrediksi).toBe(1);
});

test('parsePrediksi: bentuk asing -> kosong', () => {
  expect(parsePrediksi(null)).toEqual({ list: [], tanpaPrediksi: 0 });
  expect(parsePrediksi({ list: 'x' }).list).toEqual([]);
});

test('parseSaran: status valid dibaca, baris tanpa teks saran atau status asing dibuang', () => {
  const s = parseSaran({ jendela_jam: 6, jumlah_bacaan: 40, catatan: ' hati-hati ', saran: [
    { sensor: 'tds', status: 'di_luar', nilai: 1200, saran: 'Tambah air', perkiraan_jam_ke_batas: 2 },
    { sensor: 'ph', status: 'aman', saran: '' },
    { sensor: 'ec', status: 'aman', saran: 'x' },
    { sensor: 'ph', status: 'ngawur', saran: 'x' },
  ] });
  expect(s.saran).toEqual([{ sensor: 'tds', status: 'di_luar', nilai: 1200, saran: 'Tambah air', perkiraan_jam_ke_batas: 2 }]);
  expect(s).toMatchObject({ jendelaJam: 6, jumlahBacaan: 40, catatan: 'hati-hati' });
});
