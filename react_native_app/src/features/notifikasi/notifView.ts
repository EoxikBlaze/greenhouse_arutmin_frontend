import type { AlertRow } from '@/features/peringatan/alertView';

const idDari = (r: AlertRow) => {
  const n = Number(r.id);
  return Number.isFinite(n) ? n : null;
};

// Peringatan yang perlu dinotifikasikan: id di atas acuan dan belum ditangani.
// Panggilan pertama (idTerakhir null) hanya menetapkan acuan, supaya peringatan lama tidak membanjiri HP.
export function saringAlertBaru(rows: readonly AlertRow[], idTerakhir: number | null): { baru: AlertRow[]; idTerakhir: number | null } {
  const ids = rows.map(idDari).filter((n): n is number => n !== null);
  const maks = ids.length ? Math.max(...ids) : idTerakhir;
  const acuan = idTerakhir === null ? maks : maks !== null && maks > idTerakhir ? maks : idTerakhir;
  if (idTerakhir === null) return { baru: [], idTerakhir: acuan };
  const baru = rows.filter((r) => {
    const id = idDari(r);
    return id !== null && id > idTerakhir && r.acknowledged !== true;
  });
  return { baru, idTerakhir: acuan };
}

// Satu notifikasi per tanggal laporan analisis harian (tanggal terakhir disimpan di perangkat).
export function analisisPerluNotif(data: unknown, tanggalTerakhir: string | null): string | null {
  const t = (data as { tanggal?: unknown } | null)?.tanggal;
  return typeof t === 'string' && t !== '' && t !== tanggalTerakhir ? t : null;
}

export function teksAlert(r: AlertRow): { judul: string; isi: string } {
  return { judul: `Peringatan: ${r.type?.toString().trim() || 'GARAP'}`, isi: r.value?.toString().trim() || 'Ada peringatan baru di greenhouse.' };
}
