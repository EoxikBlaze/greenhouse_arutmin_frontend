import { chartView, MonitoringRow } from '@/features/sensor/chartView';

const now = new Date(2026, 9, 14, 15, 30); // 15.30 lokal -> bucket 04..16
const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m).toISOString();
const row = (h: number, ph: number | string | null, m = 0): MonitoringRow => ({ created_at: at(h, m), ph, waterTemp: 26 });

test('enam bucket 2 jam, label jam awal', () => {
  const v = chartView([row(5, 6)], 'ph', now);
  expect(v.bars.map((b) => b.label)).toEqual(['04', '06', '08', '10', '12', '14']);
});

test('rata-rata per bucket dinormalisasi min-max', () => {
  const v = chartView([row(5, 6, 10), row(5, 8, 50), row(9, 10), row(15, 6)], 'ph', now);
  expect(v.empty).toBe(false);
  // 04 -> 7, 08 -> 10, 14 -> 6
  expect(v.bars[0].height).toBeCloseTo(0.25);
  expect(v.bars[2].height).toBeCloseTo(1);
  expect(v.bars[5].height).toBeCloseTo(0);
  expect(v.bars[1].height).toBeNull();
});

test('string numerik dihitung, null dan bukan-angka diabaikan', () => {
  const v = chartView([row(5, '6.5'), row(5, null), row(9, 'abc'), row(11, 7.5)], 'ph', now);
  expect(v.bars[0].height).not.toBeNull();
  expect(v.bars[2].height).toBeNull();
  expect(v.bars[3].height).not.toBeNull();
});

test('semua nilai sama -> 0.5, bukan NaN', () => {
  const v = chartView([row(5, 6), row(9, 6)], 'ph', now);
  expect(v.bars.filter((b) => b.height != null).every((b) => b.height === 0.5)).toBe(true);
});

test('satu bucket berisi -> 0.5', () => {
  expect(chartView([row(5, 6)], 'ph', now).bars[0].height).toBe(0.5);
});

test('tanpa baris di jendela -> empty; baris di luar 12 jam diabaikan', () => {
  expect(chartView([], 'ph', now).empty).toBe(true);
  expect(chartView([row(3, 6), row(17, 6)], 'ph', now).empty).toBe(true);
});

test('urutan baris tidak berpengaruh', () => {
  const rows = [row(5, 6), row(9, 8), row(13, 7)];
  expect(chartView([...rows].reverse(), 'ph', now)).toEqual(chartView(rows, 'ph', now));
});

test('parameter waterTemp memakai kolom waterTemp', () => {
  const v = chartView([{ created_at: at(5), ph: 6, waterTemp: '27.5' }], 'waterTemp', now);
  expect(v.empty).toBe(false);
});

test('created_at rusak diabaikan', () => {
  expect(chartView([{ created_at: 'bukan tanggal', ph: 6, waterTemp: 1 }], 'ph', now).empty).toBe(true);
});
