export interface Param { key: string; nama: string; satuan: string; min: number; max: number }
export type Spek = { buah: Param[]; sayur: Param[] };
export interface Hasil { parameter: string; nilai: string; satuan: string; tanggal: string }

const num = (v: unknown): number | null => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

// Kontrak garap.net: GET /uji-lab/parameter -> { data: { buah: { kunci: {nama, satuan, min, max} }, sayur: {...} } }
export function parseSpek(p: unknown): Spek {
  const data = (p as { data?: Record<string, unknown> } | null)?.data ?? {};
  const kat = (k: string): Param[] =>
    Object.entries((data[k] as Record<string, any>) ?? {}).map(([key, v]) => ({
      key, nama: String(v?.nama ?? key), satuan: String(v?.satuan ?? ''), min: num(v?.min) ?? 0, max: num(v?.max) ?? Infinity,
    }));
  return { buah: kat('buah'), sayur: kat('sayur') };
}

export function buildHasil(spek: Param[], isian: Record<string, string>): { hasil: { parameter: string; nilai: number }[]; galat: string | null } {
  const hasil: { parameter: string; nilai: number }[] = [];
  for (const p of spek) {
    const mentah = (isian[p.key] ?? '').trim();
    if (!mentah) continue;
    const n = Number(mentah.replace(',', '.'));
    if (!Number.isFinite(n) || n < p.min || n > p.max) {
      return { hasil: [], galat: `${p.nama} harus angka ${p.min}–${Number.isFinite(p.max) ? p.max : 'atas'}.` };
    }
    hasil.push({ parameter: p.key, nilai: n });
  }
  return { hasil, galat: hasil.length ? null : 'Isi minimal satu parameter.' };
}

export function parseRiwayat(p: unknown): Hasil[] {
  const list = (p as { data?: unknown } | null)?.data;
  if (!Array.isArray(list)) return [];
  return list.map((r: any) => ({
    parameter: String(r?.parameter ?? ''), nilai: String(r?.nilai ?? ''), satuan: String(r?.satuan ?? ''), tanggal: String(r?.tanggal ?? '').split('T')[0],
  }));
}
