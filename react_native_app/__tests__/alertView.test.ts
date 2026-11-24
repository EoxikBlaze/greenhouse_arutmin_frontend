import { alertView, ackAlert, loadAlerts, parseAlerts } from '@/features/peringatan/alertView';

const api = (routes: Record<string, unknown>) => {
  const posts: string[] = [];
  return {
    posts,
    get: async <T,>(p: string) => { if (!(p in routes)) throw new Error('404'); return routes[p] as T; },
    post: async <T,>(p: string) => { posts.push(p); return {} as T; },
  };
};

test('parseAlerts menerima array, {data}, {recent_alerts}; selain itu kosong', () => {
  expect(parseAlerts([{ id: 1 }])).toHaveLength(1);
  expect(parseAlerts({ data: [{ id: 1 }, { id: 2 }] })).toHaveLength(2);
  expect(parseAlerts({ recent_alerts: [{ id: 1 }] })).toHaveLength(1);
  expect(parseAlerts({ x: 1 })).toEqual([]);
  expect(parseAlerts(null)).toEqual([]);
});

test('level dari severity; tanpa severity -> Info (tidak mengarang)', () => {
  expect(alertView({ id: 1, severity: 'critical' }).levelLabel).toBe('Kritis');
  expect(alertView({ id: 1, severity: 'WARNING' }).levelLabel).toBe('Peringatan');
  expect(alertView({ id: 1 }).levelLabel).toBe('Info');
});

test('judul dari value, sumber dari type; kosong -> teks bawaan, bukan "null"', () => {
  expect(alertView({ id: 1, type: 'pompa', value: 'Pompa tidak merespons' })).toMatchObject({ judul: 'Pompa tidak merespons', sumber: 'pompa' });
  const v = alertView({ id: 2, type: null, value: null });
  expect(v.judul).toBe('Peringatan terdeteksi');
  expect(v.sumber).toBe('Sumber tidak diketahui');
});

test('waktu jam lokal; tanggal rusak -> strip', () => {
  expect(alertView({ id: 1, created_at: new Date(2026, 0, 2, 9, 40).toISOString() }).waktu).toBe('09.40');
  expect(alertView({ id: 1, created_at: 'rusak' }).waktu).toBe('—');
});

test('acked: true/false bila kontrak mengirim, null bila tidak', () => {
  expect(alertView({ id: 1, acknowledged: true }).acked).toBe(true);
  expect(alertView({ id: 1, acknowledged: false }).acked).toBe(false);
  expect(alertView({ id: 1 }).acked).toBeNull();
});

test('loadAlerts: /alert-logs bila ada (bisa ack)', async () => {
  const r = await loadAlerts(api({ '/alert-logs?limit=100': { data: [{ id: 1, value: 'a' }] } }));
  expect(r).toMatchObject({ source: 'alert-logs', canAck: true });
  expect(r.rows).toHaveLength(1);
});

test('loadAlerts: fallback /dashboard recent_alerts, tanpa ack', async () => {
  const r = await loadAlerts(api({ '/dashboard': { recent_alerts: [{ id: 3, type: 'uji', value: 'x' }] } }));
  expect(r).toMatchObject({ source: 'dashboard', canAck: false });
  expect(r.rows).toHaveLength(1);
});

test('loadAlerts: dua sumber gagal -> galat dilempar', async () => {
  await expect(loadAlerts(api({}))).rejects.toThrow();
});

test('ackAlert: POST /alert-logs/:id/ack', async () => {
  const a = api({});
  await ackAlert(a, 'a-12'.replace('a-', ''));
  expect(a.posts).toEqual(['/alert-logs/12/ack']);
});
