import type { Tone } from '@/ui/MetricCard';

export interface LatestSensor {
  is_online: boolean;
  seconds_ago: number | null;
  anomalies: { sensor: string; value: number; min: number; max: number }[];
  sensor: {
    ph: number; tds: number; waterTemp: number; airTemp: number; created_at: string;
    humidity?: number | string | null; water_level?: string | number | null; ec_ms_cm?: number | string | null;
  } | null;
  water_control?: { valve_state?: string | null } | null;
}

export interface MetricView {
  key: 'ph' | 'tds' | 'waterTemp' | 'airTemp';
  label: string;
  value: string | null;
  unit?: string;
  status: string;
  tone: Tone;
}

const DEFS = [
  { key: 'ph', label: 'pH', digits: 1 },
  { key: 'tds', label: 'Nutrisi / TDS', unit: 'ppm', digits: 0 },
  { key: 'waterTemp', label: 'Suhu air', unit: '°C', digits: 1 },
  { key: 'airTemp', label: 'Suhu udara', unit: '°C', digits: 1 },
] as const;

const fmt = (n: number, d: number) => n.toFixed(d).replace('.', ',');

// "09.41" dalam zona waktu perangkat.
export function jam(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sensorView(d: LatestSensor) {
  const offline = !d.is_online;
  const metrics: MetricView[] = DEFS.map((def) => {
    const raw = d.sensor?.[def.key];
    if (raw == null) return { key: def.key, label: def.label, unit: undefined, value: null, status: 'Menunggu data', tone: 'warn' };
    const anomaly = d.anomalies.some((a) => a.sensor === def.key);
    // Perangkat offline lebih diutamakan: nilai lama tidak boleh tampil sebagai segar.
    const [status, tone]: [string, Tone] = offline ? ['Data basi', 'warn'] : anomaly ? ['Di luar ambang', 'danger'] : ['Segar', 'ok'];
    return { key: def.key, label: def.label, unit: 'unit' in def ? def.unit : undefined, value: fmt(raw, def.digits), status, tone };
  });
  return {
    offline,
    metrics,
    alerts: d.anomalies,
    lastAt: d.sensor ? jam(d.sensor.created_at) : null,
  };
}
