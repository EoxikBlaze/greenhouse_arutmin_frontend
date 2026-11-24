// Backend tidak punya endpoint "pindah tahap": tahap baru dibuat lewat CRUD tahap, lalu semai ditutup.
// Tahap baru dibuat DULU; bila gagal, batch tetap utuh di tahap lama.
export interface TanamApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export type TipeTahap = 'semai' | 'peremajaan' | 'pendewasaan';

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return today(new Date(y, m - 1, d + days));
}

// Kolom tgl_akhir_* NOT NULL = tanggal rencana. Dihitung dari durasi tahap di /siklus (hari), tidak pernah ditebak.
const NAMA_TAHAP = { semai: 'Semai', peremajaan: 'Peremajaan', pendewasaan: 'Pendewasaan' } as const;

async function tglAkhir(api: TanamApi, idTanaman: unknown, tahap: TipeTahap): Promise<string> {
  const rows = await api.get<{ id_tanaman?: unknown; nama_siklus?: string; waktu_siklus?: unknown }[]>('/siklus');
  const hari = Number((Array.isArray(rows) ? rows : []).find(
    (r) => Number(r.id_tanaman) === Number(idTanaman) && r.nama_siklus?.trim().toLowerCase() === tahap,
  )?.waktu_siklus);
  if (!Number.isFinite(hari) || hari <= 0) throw new Error(`Durasi tahap ${NAMA_TAHAP[tahap]} belum diatur untuk tanaman ini.`);
  return addDays(today(), hari);
}

export interface MulaiSemaiInput { id_tanaman: number; id_meja: number }

// Rute /tanam/mulai tidak mengirim tgl_akhir_semai (NOT NULL), jadi memakai CRUD /semai.
export async function mulaiSemai(api: TanamApi, i: MulaiSemaiInput) {
  const akhir = await tglAkhir(api, i.id_tanaman, 'semai');
  return api.post('/semai', { id_tanaman: i.id_tanaman, id_meja: i.id_meja, jumlah_benih: 0, tgl_awal_semai: today(), tgl_akhir_semai: akhir, status: 'proses' });
}

export interface OpsiItem { id: number; label: string }
export interface OpsiSemai { meja: OpsiItem[]; tanaman: OpsiItem[]; tanpaId: boolean }

const asId = (v: unknown) => { const x = Number(v); return v != null && v !== '' && Number.isInteger(x) ? x : null; };

function toOpsi(rows: unknown, idKey: string, nameKey: string): { items: OpsiItem[]; raw: number } {
  const list = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
  const items: OpsiItem[] = [];
  for (const r of list) {
    const id = asId(r?.[idKey]);
    if (id != null) items.push({ id, label: String(r[nameKey] ?? '').trim() || `#${id}` });
  }
  return { items, raw: list.length };
}

// Kontrak garap.net: GET /tanam/pilihan. Backend lokal tidak punya rute itu dan /meja, /tanaman tidak
// mengirim kolom id, jadi pilihan tanpa id tidak ditampilkan (id tidak boleh ditebak).
export async function loadOpsiSemai(api: TanamApi): Promise<OpsiSemai> {
  try {
    const d = await api.get<{ meja?: unknown; tanaman?: unknown }>('/tanam/pilihan');
    const m = toOpsi(d?.meja, 'id', 'nama');
    const t = toOpsi(d?.tanaman, 'id', 'nama');
    if (m.items.length || t.items.length) return { meja: m.items, tanaman: t.items, tanpaId: false };
  } catch { /* rute tidak ada: coba master */ }
  const [mj, tn] = await Promise.all([api.get<unknown>('/meja'), api.get<unknown>('/tanaman')]);
  const m = toOpsi(mj, 'id_meja', 'meja');
  const t = toOpsi(tn, 'id_tanaman', 'nama_tanaman');
  return { meja: m.items, tanaman: t.items, tanpaId: (m.raw > 0 && !m.items.length) || (t.raw > 0 && !t.items.length) };
}

// Hanya semais punya kolom status. tgl_akhir_* di peremajaan/pendewasaan adalah tanggal rencana (NOT NULL), jangan ditimpa:
// tahap tersebut berakhir secara implisit saat tahap berikutnya dibuat.
const tutupSemai = (api: TanamApi, id: number | string) => api.post(`/tanam/semai/${id}/selesai`, {});

export async function catatPanen(api: TanamApi, idPendewasaan: number | string) {
  await api.post('/panen', { id_pendewasaan: idPendewasaan, tgl_panen: today() });
}

export async function pindahTahap(api: TanamApi, tipe: TipeTahap, id: number | string) {
  if (tipe === 'pendewasaan') return catatPanen(api, id);
  const d = await api.get<Record<string, unknown>>(`/${tipe}/${id}`);
  const idMeja = d.id_meja ?? null;
  if (tipe === 'semai') {
    const akhir = await tglAkhir(api, d.id_tanaman, 'peremajaan');
    await api.post('/peremajaan', {
      id_semai: id, id_meja: idMeja, jumlah_masuk: n(d.jumlah_benih),
      tgl_awal_peremajaan: today(), tgl_akhir_peremajaan: akhir, benih_berhasil: 0, benih_gagal: 0,
    });
    await tutupSemai(api, id);
  } else {
    // Tanaman diwarisi dari semai induk.
    const semai = await api.get<Record<string, unknown>>(`/semai/${d.id_semai}`);
    const akhir = await tglAkhir(api, semai.id_tanaman, 'pendewasaan');
    await api.post('/pendewasaan', {
      id_peremajaan: id, id_meja: idMeja, jumlah_masuk: n(d.jumlah_masuk),
      tgl_awal_pendewasaan: today(), tgl_akhir_pendewasaan: akhir, tanaman_berhasil: 0, tanaman_gagal: 0,
    });
  }
}
