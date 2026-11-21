import { buildHasil, parseRiwayat, parseSpek } from '@/features/ujilab/ujiLab';
import { csvLaporan, htmlLaporan, parseMatriks, rentang } from '@/features/laporan/laporan';
import { parseCameras, previewUrl } from '@/features/cctv/cctv';

const SPEK = parseSpek({ data: { buah: { brix: { nama: 'Brix', satuan: '%', min: 0, max: 30 }, bobot: { nama: 'Bobot', satuan: 'kg', min: 0 } }, sayur: {} } });

test('parseSpek: kategori buah/sayur, kosong aman', () => {
  expect(SPEK.buah.map((p) => p.key)).toEqual(['brix', 'bobot']);
  expect(SPEK.buah[0]).toMatchObject({ nama: 'Brix', satuan: '%', min: 0, max: 30 });
  expect(SPEK.sayur).toEqual([]);
  expect(parseSpek(null)).toEqual({ buah: [], sayur: [] });
});

test('buildHasil: angka koma, rentang, minimal satu isian', () => {
  expect(buildHasil(SPEK.buah, { brix: '11,5', bobot: '' })).toEqual({ hasil: [{ parameter: 'brix', nilai: 11.5 }], galat: null });
  expect(buildHasil(SPEK.buah, { brix: '99' }).galat).toBe('Brix harus angka 0–30.');
  expect(buildHasil(SPEK.buah, { brix: 'abc' }).galat).toBe('Brix harus angka 0–30.');
  expect(buildHasil(SPEK.buah, {}).galat).toBe('Isi minimal satu parameter.');
});

test('parseRiwayat: tanggal dipotong, bukan array -> kosong', () => {
  expect(parseRiwayat({ data: [{ parameter: 'brix', nilai: 11.2, satuan: '%', tanggal: '2026-11-20T03:00:00Z' }] })).toEqual([{ parameter: 'brix', nilai: '11.2', satuan: '%', tanggal: '2026-11-20' }]);
  expect(parseRiwayat({})).toEqual([]);
});

test('rentang: 7/30 hari memberi dari+sampai, Semua kosong', () => {
  const now = new Date(2026, 10, 21);
  expect(rentang('7', now)).toEqual({ dari: '2026-11-15', sampai: '2026-11-21' });
  expect(rentang('30', now)).toEqual({ dari: '2026-10-23', sampai: '2026-11-21' });
  expect(rentang('semua', now)).toEqual({});
});

const ROWS = parseMatriks({ matriks: [{ periode: '2026-10', semai: 2, remaja: 1, dewasa: 1, panen_kg: 12.5, rata_ph: '6.40' }, { periode: '2026-09', semai: '1', remaja: null, dewasa: 0, panen_kg: 0, rata_ph: null }] });

test('parseMatriks: string numerik dan null aman', () => {
  expect(ROWS[0]).toEqual({ periode: '2026-10', semai: 2, remaja: 1, dewasa: 1, panenKg: 12.5, rataPh: 6.4 });
  expect(ROWS[1]).toMatchObject({ semai: 1, remaja: 0, rataPh: null });
  expect(parseMatriks({})).toEqual([]);
});

test('csvLaporan: header Indonesia, koma desimal tidak merusak kolom', () => {
  const csv = csvLaporan(ROWS);
  expect(csv.split('\n')[0]).toBe('PERIODE,SEMAI,REMAJA,DEWASA,PANEN (KG),RATA-RATA PH');
  expect(csv.split('\n')[1]).toBe('2026-10,2,1,1,12.5,6.4');
  expect(csv.split('\n')[2]).toBe('2026-09,1,0,0,0,');
});

test('htmlLaporan: memuat periode dan baris, menolak HTML mentah', () => {
  const h = htmlLaporan(ROWS, '30 hari <b>');
  expect(h).toContain('2026-10');
  expect(h).toContain('30 hari &lt;b&gt;');
  expect(h).not.toContain('<b>');
});

test('parseCameras: field wajib, aktif, interval dibatasi 1..60', () => {
  const c = parseCameras({ list: [{ id: 3, nama: 'Utara', lokasi: null, tipe: 'rtsp', aktif: true, interval_detik: 500 }, { id: 4, tipe: 'mjpeg', url: 'http://x/y', aktif: false }] });
  expect(c[0]).toMatchObject({ id: '3', nama: 'Utara', lokasi: 'Tanpa lokasi', aktif: true, interval: 60 });
  expect(c[1]).toMatchObject({ nama: 'Kamera', aktif: false, interval: 5 });
  expect(parseCameras(null)).toEqual([]);
});

test('previewUrl: rtsp lewat server, lainnya url langsung + cache-bust, nonaktif null', () => {
  const [rtsp, snap, off] = parseCameras({ list: [{ id: 3, tipe: 'rtsp', aktif: true }, { id: 4, tipe: 'snapshot', url: 'http://c/s.jpg', aktif: true }, { id: 5, tipe: 'rtsp', aktif: false }] });
  expect(previewUrl(rtsp, 'http://api', 7)).toBe('http://api/cctv/3/gambar?t=7');
  expect(previewUrl(snap, 'http://api', 7)).toBe('http://c/s.jpg?t=7');
  expect(previewUrl(off, 'http://api', 7)).toBeNull();
});
