import { today, addDays } from '@/features/tanam/tanamApi';

export type RentangKey = '7' | '30' | 'semua';
export interface Baris { periode: string; semai: number; remaja: number; dewasa: number; panenKg: number; rataPh: number | null }

export function rentang(k: RentangKey, now = new Date()): { dari?: string; sampai?: string } {
  if (k === 'semua') return {};
  const sampai = today(now);
  return { dari: addDays(sampai, -(Number(k) - 1)), sampai };
}

const n = (v: unknown) => { const x = Number(v); return v == null || !Number.isFinite(x) ? 0 : x; };

// GET /laporan -> { matriks: [{ periode, semai, remaja, dewasa, panen_kg, rata_ph }] }
export function parseMatriks(p: unknown): Baris[] {
  const list = (p as { matriks?: unknown } | null)?.matriks;
  if (!Array.isArray(list)) return [];
  return list.map((r: any) => ({
    periode: String(r?.periode ?? ''), semai: n(r?.semai), remaja: n(r?.remaja), dewasa: n(r?.dewasa), panenKg: n(r?.panen_kg),
    rataPh: r?.rata_ph == null || !Number.isFinite(Number(r.rata_ph)) ? null : Number(r.rata_ph),
  }));
}

export function csvLaporan(rows: Baris[]): string {
  const lines = ['PERIODE,SEMAI,REMAJA,DEWASA,PANEN (KG),RATA-RATA PH'];
  for (const r of rows) lines.push([r.periode, r.semai, r.remaja, r.dewasa, r.panenKg, r.rataPh ?? ''].join(','));
  return lines.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function htmlLaporan(rows: Baris[], periode: string): string {
  const tr = rows.map((r) => `<tr><td>${esc(r.periode)}</td><td>${r.semai}</td><td>${r.remaja}</td><td>${r.dewasa}</td><td>${r.panenKg}</td><td>${r.rataPh ?? '—'}</td></tr>`).join('');
  return `<html><body style="font-family:sans-serif;padding:24px"><h2>Laporan GARAP</h2><p>Periode: ${esc(periode)}</p>
<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Periode</th><th>Semai</th><th>Remaja</th><th>Dewasa</th><th>Panen (kg)</th><th>Rata-rata pH</th></tr>${tr}</table></body></html>`;
}
