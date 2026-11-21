export interface AlertRow {
  id: number | string;
  type?: string | null;
  value?: string | null;
  severity?: string | null;
  acknowledged?: boolean | null;
  created_at?: string | null;
}

export type Level = 'kritis' | 'peringatan' | 'info';

export interface AlertView {
  id: string;
  level: Level;
  levelLabel: 'Kritis' | 'Peringatan' | 'Info';
  judul: string;
  sumber: string;
  waktu: string;
  acked: boolean | null;
}

export interface AlertApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export function parseAlerts(p: unknown): AlertRow[] {
  const o = p as { data?: unknown; recent_alerts?: unknown } | null;
  const list = Array.isArray(p) ? p : Array.isArray(o?.data) ? o!.data : Array.isArray(o?.recent_alerts) ? o!.recent_alerts : [];
  return list as AlertRow[];
}

const LEVELS: Record<Level, AlertView['levelLabel']> = { kritis: 'Kritis', peringatan: 'Peringatan', info: 'Info' };

export function alertView(r: AlertRow): AlertView {
  const sev = String(r.severity ?? '').toLowerCase();
  const level: Level = sev === 'critical' ? 'kritis' : sev === 'warning' ? 'peringatan' : 'info';
  const t = r.created_at ? new Date(r.created_at) : null;
  const waktu = t && !Number.isNaN(t.getTime()) ? `${String(t.getHours()).padStart(2, '0')}.${String(t.getMinutes()).padStart(2, '0')}` : '—';
  return {
    id: String(r.id),
    level,
    levelLabel: LEVELS[level],
    judul: r.value?.toString().trim() || 'Peringatan terdeteksi',
    sumber: r.type?.toString().trim() || 'Sumber tidak diketahui',
    waktu,
    acked: typeof r.acknowledged === 'boolean' ? r.acknowledged : null,
  };
}

// Kontrak garap.net: /alert-logs (+ /:id/ack). Backend lokal hanya punya alert_logs di /dashboard (5 terbaru, tanpa ack).
export async function loadAlerts(api: AlertApi): Promise<{ rows: AlertRow[]; source: 'alert-logs' | 'dashboard'; canAck: boolean }> {
  try {
    return { rows: parseAlerts(await api.get('/alert-logs?limit=100')), source: 'alert-logs', canAck: true };
  } catch {
    return { rows: parseAlerts(await api.get('/dashboard')), source: 'dashboard', canAck: false };
  }
}

export const ackAlert = (api: AlertApi, id: string) => api.post(`/alert-logs/${encodeURIComponent(id)}/ack`, {});
