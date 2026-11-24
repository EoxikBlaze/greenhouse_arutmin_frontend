// Target nutrisi: naik harian per tanaman (GET/PUT /dosing/naik-harian) dan kurva per batch (PUT /tanam/semai/:id/kurva).
// Semua nilai ditulis ke server dan dipakai dosing, jadi validasi di sini ketat dan layar selalu meminta tinjauan sebelum menyimpan.

export interface NaikHarian { id_tanaman: number; nama: string; ppm_awal: number | null; ppm_target: number | null; hari_capai: number | null }

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) ? n : null;
};

// Isian pengguna: koma desimal boleh, kosong -> null, bukan angka -> null.
export const parseAngka = (s: string): number | null => num(s.trim());

export function parseNaikHarian(p: unknown): { list: NaikHarian[]; ambangMaks: number | null } {
  const o = (p ?? {}) as Record<string, any>;
  const list = (Array.isArray(o.data) ? o.data : []).flatMap((r: any): NaikHarian[] => {
    const id = num(r?.id_tanaman);
    if (id === null) return [];
    return [{ id_tanaman: id, nama: String(r?.nama_tanaman ?? '').trim() || `Tanaman ${id}`, ppm_awal: num(r?.ppm_awal), ppm_target: num(r?.ppm_target), hari_capai: num(r?.hari_capai) }];
  });
  return { list, ambangMaks: num(o?.ambang_tds?.max) };
}

// Kenaikan ppm per hari; null bila isian belum lengkap atau tidak masuk akal.
export function kenaikanPerHari(awal: number | null, target: number | null, hari: number | null): number | null {
  if (awal === null || target === null || hari === null || hari <= 0 || target < awal) return null;
  return (target - awal) / hari;
}

export const angka = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace('.', ',');

export interface IsianNaik { awal: string; target: string; hari: string }

// Mengembalikan pesan galat, atau null bila isian layak dikirim.
export function validasiNaik(i: IsianNaik): string | null {
  const awal = parseAngka(i.awal), target = parseAngka(i.target), hari = parseAngka(i.hari);
  if (target === null || target <= 0) return 'Isi target akhir (ppm) dengan angka lebih dari 0.';
  if (awal === null || awal < 0) return 'Isi ppm awal dengan angka 0 atau lebih.';
  if (hari === null || hari < 1 || !Number.isInteger(hari)) return 'Isi jumlah hari dengan bilangan bulat minimal 1.';
  if (target < awal) return 'Target akhir tidak boleh lebih kecil dari ppm awal.';
  return null;
}

export const naikBody = (i: IsianNaik) => ({ ppm_awal: parseAngka(i.awal), ppm_target: parseAngka(i.target), hari_capai: parseAngka(i.hari) });
export const naikMati = { ppm_awal: null, ppm_target: null, hari_capai: null } as const;

// Kolom kurva sesuai web: kurva "harian" (awal, akhir, hari) atau "tahap" (ppm tetap per tahap), plus rentang pH.
export type KurvaServer =
  | { cara: 'harian'; ppm_awal: number; ppm_target: number; hari_capai: number; diubah_hari?: number | null }
  | { cara: 'tahap'; ppm_semai: number; ppm_peremajaan: number; ppm_pendewasaan: number }
  | null
  | undefined;

export function kolomKurva(cara: 'harian' | 'tahap', berjalan: boolean): { key: string; label: string }[] {
  const dasar = cara === 'tahap'
    ? [{ key: 'ppm_semai', label: 'Semai (ppm)' }, { key: 'ppm_peremajaan', label: 'Peremajaan (ppm)' }, { key: 'ppm_pendewasaan', label: 'Pendewasaan (ppm)' }]
    : [{ key: 'ppm_awal', label: 'ppm awal' }, { key: 'ppm_target', label: 'ppm akhir' }, { key: 'hari_capai', label: 'Dicapai setelah (hari sejak mulai semai)' }]
      .filter((k) => !(k.key === 'ppm_awal' && berjalan));
  return [...dasar, { key: 'ph_min', label: 'pH min' }, { key: 'ph_max', label: 'pH maks' }];
}

export function isianAwalKurva(k: KurvaServer, phMin?: number | null, phMax?: number | null): Record<string, string> {
  const t = (v: unknown) => (v == null ? '' : String(v).replace('.', ','));
  return {
    ppm_awal: t(k?.cara === 'harian' ? k.ppm_awal : null), ppm_target: t(k?.cara === 'harian' ? k.ppm_target : null), hari_capai: t(k?.cara === 'harian' ? k.hari_capai : null),
    ppm_semai: t(k?.cara === 'tahap' ? k.ppm_semai : null), ppm_peremajaan: t(k?.cara === 'tahap' ? k.ppm_peremajaan : null), ppm_pendewasaan: t(k?.cara === 'tahap' ? k.ppm_pendewasaan : null),
    ph_min: t(phMin), ph_max: t(phMax),
  };
}

// Hanya kolom yang tampil dan terisi yang dikirim (isian kosong tidak menimpa nilai di server).
export function kurvaBody(isi: Record<string, string>, kolom: { key: string }[]): { body: Record<string, number>; galat: string | null } {
  const body: Record<string, number> = {};
  for (const { key } of kolom) {
    const raw = (isi[key] ?? '').trim();
    if (!raw) continue;
    const n = parseAngka(raw);
    if (n === null || n < 0) return { body, galat: `Isian "${key}" harus angka 0 atau lebih.` };
    if (key === 'hari_capai' && (n < 1 || !Number.isInteger(n))) return { body, galat: 'Hari dicapai harus bilangan bulat minimal 1.' };
    body[key] = n;
  }
  if (Object.keys(body).length === 0) return { body, galat: 'Isi minimal satu nilai.' };
  if (body.ph_min !== undefined && body.ph_max !== undefined && body.ph_min >= body.ph_max) return { body, galat: 'pH min harus lebih kecil dari pH maks.' };
  if (body.ppm_awal !== undefined && body.ppm_target !== undefined && body.ppm_target < body.ppm_awal) return { body, galat: 'ppm akhir tidak boleh lebih kecil dari ppm awal.' };
  return { body, galat: null };
}

// Status penjagaan alat untuk batch (firmware v6 mode SEMAI), dibaca dari GET /dashboard.
export interface KeadaanAlat { mode?: string | null; siap?: boolean | null; kurang?: string | null; estop?: boolean | null }

export function alatView(d: unknown): { tampil: boolean; dijaga: boolean; alasan: string } {
  const o = (d ?? {}) as { iotStatus?: { online?: boolean } | null; keadaan_alat?: KeadaanAlat | null };
  if (o.iotStatus === undefined && o.keadaan_alat === undefined) return { tampil: false, dijaga: false, alasan: '' };
  const online = !!o.iotStatus?.online;
  const a = o.keadaan_alat ?? null;
  if (online && a?.mode === 'SEMAI') return { tampil: true, dijaga: true, alasan: '' };
  const alasan = !online ? 'alat tidak terhubung ke server'
    : a?.estop ? 'E-STOP aktif'
    : a?.siap === false ? `alat belum siap, kurang ${a.kurang || 'konfigurasi'}`
    : a?.mode === 'PANEN' ? 'alat dalam mode PANEN'
    : 'alat belum menerima perintah SEMAI';
  return { tampil: true, dijaga: false, alasan };
}
