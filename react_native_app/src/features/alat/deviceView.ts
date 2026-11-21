export interface WaterControl {
  mode?: string | null;
  valve_state?: string | null;
  command?: string | null;
  updated_at?: string | null;
}

export type CommandStatus = 'menunggu' | 'selesai' | 'kedaluwarsa';

export interface DeviceApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export const EXPIRE_MS = 120_000;

// Backend lokal tidak punya antrean perintah bertahap. STOP menaruh command=FORCE_STOP; perangkat
// mengambilnya lalu command kembali AUTO. "Selesai" hanya bila katup juga terbaca OFF.
export function commandStatus(wc: WaterControl | null, sentAt: number, now: number): CommandStatus {
  if (wc?.command === 'FORCE_STOP') return now - sentAt > EXPIRE_MS ? 'kedaluwarsa' : 'menunggu';
  if (wc && wc.command && wc.valve_state?.toUpperCase() === 'OFF') return 'selesai';
  return now - sentAt > EXPIRE_MS ? 'kedaluwarsa' : 'menunggu';
}

export const stopPompa = (api: DeviceApi) => api.post('/watercontrol/stop', {});
