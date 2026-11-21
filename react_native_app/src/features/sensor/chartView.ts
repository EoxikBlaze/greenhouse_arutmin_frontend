export type ChartParam = 'ph' | 'waterTemp';

export interface MonitoringRow {
  created_at: string;
  ph: number | string | null;
  waterTemp: number | string | null;
}

export interface Bar {
  label: string;
  /** 0..1 dalam rentang data, atau null bila bucket tanpa bacaan. */
  height: number | null;
}

const H = 3_600_000;
const BUCKETS = 6;
const BUCKET_MS = 2 * H;

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// Enam bucket 2 jam yang berakhir di jam genap pertama setelah `now`, sehingga bacaan terbaru selalu masuk.
export function chartView(rows: MonitoringRow[], param: ChartParam, now: Date): { empty: boolean; bars: Bar[] } {
  const e = new Date(now);
  e.setMinutes(0, 0, 0);
  e.setHours(e.getHours() + (2 - (e.getHours() % 2)));
  const end = e.getTime();
  const start = end - BUCKETS * BUCKET_MS;

  const sums = Array.from({ length: BUCKETS }, () => ({ sum: 0, n: 0 }));
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const v = num(r[param]);
    if (!Number.isFinite(t) || v == null || t < start || t >= end) continue;
    const b = sums[Math.floor((t - start) / BUCKET_MS)];
    b.sum += v;
    b.n += 1;
  }

  const avgs = sums.map((b) => (b.n ? b.sum / b.n : null));
  const present = avgs.filter((a): a is number => a != null);
  const min = Math.min(...present);
  const max = Math.max(...present);
  const bars = avgs.map((a, i) => ({
    label: String(new Date(start + i * BUCKET_MS).getHours()).padStart(2, '0'),
    height: a == null ? null : max === min ? 0.5 : (a - min) / (max - min),
  }));
  return { empty: present.length === 0, bars };
}
