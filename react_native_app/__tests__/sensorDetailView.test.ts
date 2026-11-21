import { LatestSensor, jam } from '@/features/beranda/sensorView';
import { parseParam, sensorDetailView } from '@/features/sensor/sensorDetailView';

const AT = '2026-10-14T02:41:00.000Z';
const base: LatestSensor = {
  is_online: true,
  seconds_ago: 12,
  anomalies: [],
  sensor: { ph: 6.4, tds: 640, waterTemp: 26.9, airTemp: 31, humidity: 78, water_level: '62', ec_ms_cm: 1.8, created_at: AT },
  water_control: { valve_state: 'ON' },
};

test('segar -> meta jam + umur detik, tanpa chip', () => {
  const v = sensorDetailView(base, 'ph', 'admin');
  expect(v).toMatchObject({ state: 'segar', title: 'pH air', value: '6,4', dim: false });
  expect(v.chip).toBeUndefined();
  expect(v.meta).toBe(`Diperbarui ${jam(AT)} · umur 12 detik`);
  expect(v.rows).toEqual([
    { label: 'EC (mS/cm)', value: '1,8' },
    { label: 'Kelembapan (%)', value: '78' },
    { label: 'Level penampung', value: '62%' },
    { label: 'Status alat', value: 'Pompa menyala' },
  ]);
});

test('basi -> chip Data basi, nilai redup, umur menit dibulatkan ke bawah', () => {
  const v = sensorDetailView({ ...base, is_online: false, seconds_ago: 259 }, 'ph', 'admin');
  expect(v).toMatchObject({ state: 'basi', dim: true, chip: { label: 'Data basi' } });
  expect(v.meta).toBe(`Diperbarui ${jam(AT)} · umur 4 menit`);
});

test.each([[3599, '59 menit'], [3600, '1 jam'], [7300, '2 jam'], [86400, '1 hari'], [3220509, '37 hari']])(
  'umur %i detik -> %s', (s, text) => {
    expect(sensorDetailView({ ...base, is_online: false, seconds_ago: s }, 'ph', 'admin').meta).toBe(`Diperbarui ${jam(AT)} · umur ${text}`);
  });

test('anomali pada parameter terpilih -> chip Anomali, meta Ditandai', () => {
  const v = sensorDetailView({ ...base, anomalies: [{ sensor: 'ph', value: 9, min: 5, max: 7 }] }, 'ph', 'admin');
  expect(v).toMatchObject({ state: 'anomali', chip: { label: 'Anomali' } });
  expect(v.meta).toBe(`Ditandai · ${jam(AT)}`);
});

test('anomali parameter lain tidak menandai parameter terpilih', () => {
  const v = sensorDetailView({ ...base, anomalies: [{ sensor: 'tds', value: 9999, min: 50, max: 1000 }] }, 'ph', 'admin');
  expect(v.state).toBe('segar');
});

test('offline mengalahkan anomali (nilai lama tidak boleh tampil segar/anomali)', () => {
  const v = sensorDetailView({ ...base, is_online: false, seconds_ago: 500, anomalies: [{ sensor: 'ph', value: 9, min: 5, max: 7 }] }, 'ph', 'admin');
  expect(v.state).toBe('basi');
});

test('belum ada data -> strip, Tidak diketahui', () => {
  const v = sensorDetailView({ is_online: false, seconds_ago: null, anomalies: [], sensor: null, water_control: null }, 'ph', 'admin');
  expect(v).toMatchObject({ state: 'kosong', value: '—', meta: 'Belum ada data · perangkat belum pernah sinkron' });
  expect(v.rows.map((r) => r.value)).toEqual(['Belum ada data', 'Belum ada data', 'Belum ada data', 'Tidak diketahui']);
});

test('data belum dimuat (undefined) diperlakukan kosong', () => {
  expect(sensorDetailView(undefined, 'ph', 'admin').state).toBe('kosong');
});

test('demo -> semua Disembunyikan', () => {
  const v = sensorDetailView(base, 'ph', 'demo');
  expect(v).toMatchObject({ state: 'demo', value: 'Disembunyikan', meta: 'Akun demo tidak menampilkan nilai sensor' });
  expect(v.rows.every((r) => r.value === 'Disembunyikan')).toBe(true);
});

test('parameter lain: judul, satuan, desimal', () => {
  expect(sensorDetailView(base, 'tds', 'admin')).toMatchObject({ title: 'Nutrisi TDS', value: '640', unit: 'ppm' });
  expect(sensorDetailView(base, 'waterTemp', 'admin')).toMatchObject({ title: 'Suhu air', value: '26,9', unit: '°C' });
});

test('parseParam: tak dikenal -> ph', () => {
  expect(parseParam('x')).toBe('ph');
  expect(parseParam(undefined)).toBe('ph');
  expect(parseParam(['tds'])).toBe('ph');
  expect(parseParam('airTemp')).toBe('airTemp');
});
