import { analisisPerluNotif, saringAlertBaru, teksAlert } from '@/features/notifikasi/notifView';
import { parseDaftar, parseLaporan } from '@/features/asisten/analisisView';

const rows = (...ids: number[]) => ids.map((id) => ({ id, type: 'TDS', value: `v${id}` }));

test('saringAlertBaru: panggilan pertama hanya menetapkan acuan', () => {
  expect(saringAlertBaru(rows(5, 7, 6), null)).toEqual({ baru: [], idTerakhir: 7 });
});

test('saringAlertBaru: hanya id di atas acuan dan belum ditangani', () => {
  const r = [{ id: 8, acknowledged: true }, { id: 9 }, { id: 7 }, { id: 'x' }];
  const h = saringAlertBaru(r, 7);
  expect(h.baru.map((x) => x.id)).toEqual([9]);
  expect(h.idTerakhir).toBe(9);
});

test('saringAlertBaru: daftar kosong menjaga acuan', () => {
  expect(saringAlertBaru([], 4)).toEqual({ baru: [], idTerakhir: 4 });
  expect(saringAlertBaru([], null)).toEqual({ baru: [], idTerakhir: null });
});

test('analisisPerluNotif: sekali per tanggal', () => {
  expect(analisisPerluNotif({ tanggal: '2026-11-24' }, null)).toBe('2026-11-24');
  expect(analisisPerluNotif({ tanggal: '2026-11-24' }, '2026-11-24')).toBeNull();
  expect(analisisPerluNotif(null, null)).toBeNull();
  expect(analisisPerluNotif({ tanggal: '' }, null)).toBeNull();
});

test('teksAlert: cadangan bila tipe atau nilai kosong', () => {
  expect(teksAlert({ id: 1, type: 'pH', value: 'terlalu asam' })).toEqual({ judul: 'Peringatan: pH', isi: 'terlalu asam' });
  expect(teksAlert({ id: 1 })).toEqual({ judul: 'Peringatan: GARAP', isi: 'Ada peringatan baru di greenhouse.' });
});

test('parseLaporan: bentuk server dibaca, bagian kosong dibuang, prioritas asing -> rendah', () => {
  const p = { data: { id: 3, tanggal: '2026-11-24', pemicu: 'manual', diperbarui_pada: '2026-11-24T00:10:00Z',
    isi: { judul: ' Analisis ', prioritas: 'ANEH', ringkasan_utama: 'Ok', bagian: [{ judul: 'Air', butir: ['a', ' '] }, { judul: 'Kosong', butir: [] }, {}] } } };
  const l = parseLaporan(p)!;
  expect(l.pemicu).toBe('manual');
  expect(l.isi).toMatchObject({ judul: 'Analisis', prioritas: 'rendah', bagian: [{ judul: 'Air', butir: ['a'] }] });
});

test('parseLaporan: null atau rusak -> null; parseDaftar membuang baris tanpa tanggal', () => {
  expect(parseLaporan({ data: null })).toBeNull();
  expect(parseLaporan('x')).toBeNull();
  expect(parseDaftar({ data: [{ id: 1, tanggal: '2026-11-24', prioritas: 'Tinggi' }, { id: 2 }] })).toEqual([{ id: 1, tanggal: '2026-11-24', judul: '', prioritas: 'tinggi' }]);
  expect(parseDaftar(null)).toEqual([]);
});
