export interface Cam { id: string; nama: string; lokasi: string; tipe: string; url: string | null; interval: number; aktif: boolean }

// GET /cctv -> { list: [{ id, nama, lokasi, tipe: 'rtsp'|'mjpeg'|'snapshot', url, interval_detik, aktif }] }
export function parseCameras(p: unknown): Cam[] {
  const list = (p as { list?: unknown } | null)?.list;
  if (!Array.isArray(list)) return [];
  return list.map((c: any) => {
    const s = Number(c?.interval_detik);
    return {
      id: String(c?.id), nama: String(c?.nama ?? '').trim() || 'Kamera', lokasi: String(c?.lokasi ?? '').trim() || 'Tanpa lokasi',
      tipe: String(c?.tipe ?? ''), url: c?.url ? String(c.url) : null, interval: Number.isFinite(s) && s > 0 ? Math.min(60, Math.round(s)) : 5, aktif: c?.aktif === true,
    };
  });
}

// rtsp diambil lewat server (butuh token di header); mjpeg/snapshot memakai url kamera.
export function previewUrl(c: Cam, baseUrl: string, tick: number): string | null {
  if (!c.aktif) return null;
  if (c.tipe === 'rtsp') return `${baseUrl}/cctv/${c.id}/gambar?t=${tick}`;
  if (!c.url) return null;
  return `${c.url}${c.url.includes('?') ? '&' : '?'}t=${tick}`;
}
