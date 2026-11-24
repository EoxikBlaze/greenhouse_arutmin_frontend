export type Tahap = 'semai' | 'peremajaan' | 'pendewasaan' | 'panen';

// Satu baris GET /tanam (routes/tanam.js).
export interface TanamRow {
  id: number | string;
  tipe: 'semai' | 'peremajaan' | 'pendewasaan';
  status: string | null;
  mulai: string | null;
  varietas: string | null;
  meja: string | null;
  // Akar batch (semais.id_semai): kurva nutrisi disimpan per batch di sana.
  id_semai?: number | string | null;
  nutrisi?: {
    kurva: import('./nutrisiView').KurvaServer;
    hari_semai?: number | null;
    target_hari_ini: number | null;
    ph_min?: number | null;
    ph_max?: number | null;
  } | null;
}

export interface BatchView {
  id: number | string;
  tipe: TanamRow['tipe'];
  nama: string;
  tahapLabel: string;
  tanggal: string;
}

export const TAHAP: { key: Tahap; judul: string }[] = [
  { key: 'semai', judul: 'Semai' },
  { key: 'peremajaan', judul: 'Peremajaan' },
  { key: 'pendewasaan', judul: 'Pendewasaan' },
  { key: 'panen', judul: 'Panen' },
];

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NO_DATE = 'Belum ada tanggal mulai';

export function tanggalId(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export const nextTahap = (t: Tahap): Tahap | null => TAHAP[TAHAP.findIndex((x) => x.key === t) + 1]?.key ?? null;

export const judulTahap = (t: Tahap) => TAHAP.find((x) => x.key === t)!.judul;

export function batchView(r: TanamRow): BatchView {
  const nama = ['Batch', r.varietas?.trim() || 'tanpa nama'].join(' ') + (r.meja?.trim() ? ` · ${r.meja.trim()}` : '');
  const tgl = tanggalId(r.mulai);
  return { id: r.id, tipe: r.tipe, nama, tahapLabel: `Tahap: ${judulTahap(r.tipe)}`, tanggal: tgl ? `Mulai ${tgl}` : NO_DATE };
}

export function groupByTahap(list: TanamRow[]) {
  return TAHAP.map(({ key, judul }) => ({
    tahap: key,
    judul,
    batches: list.filter((r) => r.tipe === key).map(batchView),
  }));
}
