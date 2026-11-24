// Analisis AI harian (07.00 WIB) — GET /api/ai/analisis-harian[/terbaru|/:tanggal], POST /jalankan (admin).
// Laporan deterministik dari server: hanya rekomendasi, tidak menjalankan alat.
export interface Bagian { judul: string; butir: string[] }
export interface Laporan {
  id: number;
  tanggal: string;
  pemicu: 'jadwal' | 'manual';
  diperbaruiPada: string | null;
  isi: { judul: string; prioritas: 'tinggi' | 'sedang' | 'rendah'; ringkasan_utama: string; bagian: Bagian[] };
}
export interface Ringkas { id: number; tanggal: string; judul: string; prioritas: string }

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const PRIORITAS = ['tinggi', 'sedang', 'rendah'] as const;

// Bentuk server: { data: Laporan | null }. Apa pun yang tidak sesuai bentuk dianggap "belum ada laporan".
export function parseLaporan(p: unknown): Laporan | null {
  const d = (p as { data?: unknown } | null)?.data as Record<string, any> | null | undefined;
  if (!d || typeof d !== 'object' || !str(d.tanggal) || !d.isi || typeof d.isi !== 'object') return null;
  const prioritas = PRIORITAS.find((x) => x === str(d.isi.prioritas).toLowerCase()) ?? 'rendah';
  const bagian: Bagian[] = (Array.isArray(d.isi.bagian) ? d.isi.bagian : [])
    .map((b: any) => ({ judul: str(b?.judul), butir: (Array.isArray(b?.butir) ? b.butir : []).map(str).filter(Boolean) }))
    .filter((b: Bagian) => b.judul && b.butir.length);
  return {
    id: Number(d.id) || 0,
    tanggal: str(d.tanggal),
    pemicu: d.pemicu === 'manual' ? 'manual' : 'jadwal',
    diperbaruiPada: str(d.diperbarui_pada) || null,
    isi: { judul: str(d.isi.judul) || 'Analisis harian', prioritas, ringkasan_utama: str(d.isi.ringkasan_utama), bagian },
  };
}

export function parseDaftar(p: unknown): Ringkas[] {
  const list = (p as { data?: unknown } | null)?.data;
  return (Array.isArray(list) ? list : [])
    .map((r: any) => ({ id: Number(r?.id) || 0, tanggal: str(r?.tanggal), judul: str(r?.judul), prioritas: str(r?.prioritas).toLowerCase() }))
    .filter((r) => r.tanggal);
}

export const PRIORITAS_LABEL = { tinggi: 'Prioritas tinggi', sedang: 'Prioritas sedang', rendah: 'Prioritas rendah' } as const;
