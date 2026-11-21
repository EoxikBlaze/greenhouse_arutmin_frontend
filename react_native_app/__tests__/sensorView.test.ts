import { sensorView, LatestSensor } from '@/features/beranda/sensorView';

const base: LatestSensor = {
  is_online: true,
  seconds_ago: 30,
  anomalies: [],
  sensor: { ph: 6.5, tds: 640, waterTemp: 26.9, airTemp: 31, created_at: '2026-10-14T22:43:58.000Z' },
};

test('online dan normal -> status Segar, nilai berkoma desimal', () => {
  const v = sensorView(base);
  expect(v.metrics[0]).toMatchObject({ key: 'ph', value: '6,5', tone: 'ok', status: 'Segar' });
  expect(v.metrics[1]).toMatchObject({ key: 'tds', value: '640', unit: 'ppm' });
  expect(v.offline).toBe(false);
});

test('offline -> semua kartu Data basi, bukan Segar', () => {
  const v = sensorView({ ...base, is_online: false, seconds_ago: 3220509 });
  expect(v.offline).toBe(true);
  expect(v.metrics.every((m) => m.status === 'Data basi' && m.tone === 'warn')).toBe(true);
});

test('anomali menandai kartu sensor terkait', () => {
  const v = sensorView({ ...base, anomalies: [{ sensor: 'tds', value: 1200, min: 50, max: 1000 }] });
  expect(v.metrics.find((m) => m.key === 'tds')).toMatchObject({ tone: 'danger', status: 'Di luar ambang' });
  expect(v.alerts).toHaveLength(1);
});

test('tanpa data sensor -> nilai null, status Menunggu data', () => {
  const v = sensorView({ is_online: false, seconds_ago: null, anomalies: [], sensor: null });
  expect(v.metrics[0]).toMatchObject({ value: null, status: 'Menunggu data' });
});
