import type { Role } from '@/api/client';
import { LatestSensor, jam } from '@/features/beranda/sensorView';

export type Param = 'ph' | 'tds' | 'waterTemp' | 'airTemp';
export type DetailState = 'segar' | 'basi' | 'anomali' | 'kosong' | 'demo';

const PARAMS: Record<Param, { title: string; unit?: string; digits: number }> = {
  ph: { title: 'pH air', digits: 1 },
  tds: { title: 'Nutrisi TDS', unit: 'ppm', digits: 0 },
  waterTemp: { title: 'Suhu air', unit: '°C', digits: 1 },
  airTemp: { title: 'Suhu udara', unit: '°C', digits: 1 },
};

export function parseParam(v: unknown): Param {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PARAMS, v) ? (v as Param) : 'ph';
}

// Kolom numeric Postgres bisa datang sebagai string.
function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const fmt = (n: number, d: number) => n.toFixed(d).replace('.', ',');

function umur(s: number | null): string {
  if (s == null) return '';
  if (s < 60) return `${s} detik`;
  if (s < 3600) return `${Math.floor(s / 60)} menit`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam`;
  return `${Math.floor(s / 86400)} hari`;
}

const NO_DATA = 'Belum ada data';
const HIDDEN = 'Disembunyikan';

export function sensorDetailView(d: LatestSensor | undefined, param: Param, role: Role | null) {
  const p = PARAMS[param];
  const labels = ['EC (mS/cm)', 'Kelembapan (%)', 'Level penampung', 'Status alat'];
  const mk = (values: string[]) => labels.map((label, i) => ({ label, value: values[i] }));
  const base = { title: p.title, unit: p.unit, chip: undefined as undefined | { label: 'Data basi' | 'Anomali'; tone: 'warn' }, dim: false };

  if (role === 'demo') {
    return { ...base, state: 'demo' as DetailState, value: HIDDEN, unit: undefined, meta: 'Akun demo tidak menampilkan nilai sensor', rows: mk(Array(4).fill(HIDDEN)) };
  }

  const s = d?.sensor;
  const raw = s ? num(s[param]) : null;
  if (!d || !s || raw == null) {
    return { ...base, state: 'kosong' as DetailState, value: '—', unit: undefined, meta: 'Belum ada data · perangkat belum pernah sinkron', rows: mk([NO_DATA, NO_DATA, NO_DATA, 'Tidak diketahui']) };
  }

  const ec = num(s.ec_ms_cm);
  const hum = num(s.humidity);
  const lvl = num(s.water_level);
  const valve = d.water_control?.valve_state?.toUpperCase();
  const rows = mk([
    ec == null ? NO_DATA : fmt(ec, 1),
    hum == null ? NO_DATA : fmt(hum, 0),
    lvl == null ? NO_DATA : `${fmt(lvl, 0)}%`,
    valve === 'ON' ? 'Pompa menyala' : valve === 'OFF' ? 'Pompa mati' : 'Tidak diketahui',
  ]);
  const at = jam(s.created_at);
  const value = fmt(raw, p.digits);

  // Perangkat offline lebih diutamakan: nilai lama tidak boleh tampil segar atau anomali.
  if (!d.is_online) {
    return { ...base, state: 'basi' as DetailState, value, chip: { label: 'Data basi' as const, tone: 'warn' as const }, dim: true, meta: `Diperbarui ${at} · umur ${umur(d.seconds_ago)}`, rows };
  }
  if (d.anomalies.some((a) => a.sensor === param)) {
    return { ...base, state: 'anomali' as DetailState, value, chip: { label: 'Anomali' as const, tone: 'warn' as const }, meta: `Ditandai · ${at}`, rows };
  }
  return { ...base, state: 'segar' as DetailState, value, meta: `Diperbarui ${at} · umur ${umur(d.seconds_ago)}`, rows };
}
