// Analitik server: GET /api/analitik/prediksi-panen dan /api/analitik/saran-dosis?jam=6 (kontrak sama dengan web).
export type StatusPrediksi = 'sesuai' | 'segera' | 'terlambat';
export interface ItemPrediksi {
  tipe: 'semai' | 'peremajaan' | 'pendewasaan';
  id: number;
  varietas: string | null;
  meja: string | null;
  mulai: string;
  prediksi: null | { tgl_prediksi: string; sisa_hari: number; status: StatusPrediksi };
}
export interface Prediksi { list: ItemPrediksi[]; tanpaPrediksi: number }

export type StatusSaran = 'aman' | 'perhatian' | 'di_luar' | 'data_kurang';
export interface ItemSaran { sensor: 'ph' | 'tds'; status: StatusSaran; nilai?: number; saran: string; perkiraan_jam_ke_batas?: number }
export interface Saran { saran: ItemSaran[]; jendelaJam: number; jumlahBacaan: number; catatan: string }

const STATUS_PRED: readonly string[] = ['sesuai', 'segera', 'terlambat'];
const STATUS_SARAN: readonly string[] = ['aman', 'perhatian', 'di_luar', 'data_kurang'];
const TIPE: readonly string[] = ['semai', 'peremajaan', 'pendewasaan'];
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function parsePrediksi(p: unknown): Prediksi {
  const o = (p ?? {}) as Record<string, any>;
  const list: ItemPrediksi[] = (Array.isArray(o.list) ? o.list : []).flatMap((r: any) => {
    if (!TIPE.includes(r?.tipe) || !str(r?.mulai)) return [];
    const pr = r.prediksi;
    const valid = pr && str(pr.tgl_prediksi) && num(pr.sisa_hari) !== undefined && STATUS_PRED.includes(pr.status);
    return [{
      tipe: r.tipe, id: Number(r.id) || 0, varietas: str(r.varietas) || null, meja: str(r.meja) || null, mulai: str(r.mulai),
      prediksi: valid ? { tgl_prediksi: str(pr.tgl_prediksi), sisa_hari: pr.sisa_hari, status: pr.status } : null,
    }];
  });
  return { list, tanpaPrediksi: num(o.tanpa_prediksi) ?? list.filter((i) => !i.prediksi).length };
}

export function parseSaran(p: unknown): Saran {
  const o = (p ?? {}) as Record<string, any>;
  const saran: ItemSaran[] = (Array.isArray(o.saran) ? o.saran : []).flatMap((r: any) => {
    if (!['ph', 'tds'].includes(r?.sensor) || !STATUS_SARAN.includes(r?.status) || !str(r?.saran)) return [];
    return [{ sensor: r.sensor, status: r.status, nilai: num(r.nilai), saran: str(r.saran), perkiraan_jam_ke_batas: num(r.perkiraan_jam_ke_batas) }];
  });
  return { saran, jendelaJam: num(o.jendela_jam) ?? 0, jumlahBacaan: num(o.jumlah_bacaan) ?? 0, catatan: str(o.catatan) };
}

export const sisaHari = (n: number) => (n === 0 ? 'hari ini' : n > 0 ? `${n} hari lagi` : `lewat ${-n} hari`);

export const STATUS_PRED_LABEL: Record<StatusPrediksi, string> = { sesuai: 'Sesuai jadwal', segera: 'Segera', terlambat: 'Terlambat' };
export const STATUS_SARAN_LABEL: Record<StatusSaran, string> = { aman: 'Aman', perhatian: 'Perhatian', di_luar: 'Di luar batas', data_kurang: 'Data kurang' };
export const SENSOR_LABEL = { ph: 'pH', tds: 'TDS (ppm)' } as const;
