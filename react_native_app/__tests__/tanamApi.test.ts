import { addDays, catatPanen, mulaiSemai, pindahTahap, today } from '@/features/tanam/tanamApi';

const SIKLUS = [
  { id_tanaman: 3, nama_siklus: 'Semai', waktu_siklus: 7 },
  { id_tanaman: 3, nama_siklus: 'Peremajaan', waktu_siklus: 14 },
  { id_tanaman: 3, nama_siklus: 'Pendewasaan', waktu_siklus: 21 },
];

function fake(routes: Record<string, unknown>, failOn?: string) {
  const calls: string[] = [];
  const bodies: Record<string, any> = {};
  return {
    calls, bodies,
    get: async <T,>(p: string) => {
      calls.push(`GET ${p}`);
      if (!(p in routes)) throw new Error(`tak ada ${p}`);
      return routes[p] as T;
    },
    post: async <T,>(p: string, b: unknown) => {
      calls.push(`POST ${p}`); bodies[p] = b;
      if (p === failOn) throw new Error('gagal');
      return {} as T;
    },
  };
}

const T = today();

test('today dan addDays: YYYY-MM-DD lokal, lintas bulan/tahun', () => {
  expect(today(new Date(2026, 2, 5))).toBe('2026-03-05');
  expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
  expect(addDays('2026-02-20', 10)).toBe('2026-03-02');
});

test('mulaiSemai: POST /semai dengan tgl_akhir_semai = hari ini + durasi Semai', async () => {
  const a = fake({ '/siklus': SIKLUS });
  await mulaiSemai(a, { id_tanaman: 3, id_meja: 2 });
  expect(a.bodies['/semai']).toEqual({ id_tanaman: 3, id_meja: 2, jumlah_benih: 0, tgl_awal_semai: T, tgl_akhir_semai: addDays(T, 7), status: 'proses' });
});

test('durasi tahap tak ada -> galat jelas, tanpa POST', async () => {
  const a = fake({ '/siklus': [] });
  await expect(mulaiSemai(a, { id_tanaman: 3, id_meja: 2 })).rejects.toThrow('Durasi tahap Semai belum diatur');
  expect(a.calls.some((c) => c.startsWith('POST'))).toBe(false);
});

test('semai -> peremajaan: tgl_akhir rencana + hitungan awal, lalu tutup semai', async () => {
  const a = fake({ '/semai/7': { id_meja: 3, id_tanaman: 3, jumlah_benih: 40 }, '/siklus': SIKLUS });
  await pindahTahap(a, 'semai', 7);
  expect(a.calls.filter((c) => c.startsWith('POST'))).toEqual(['POST /peremajaan', 'POST /tanam/semai/7/selesai']);
  expect(a.bodies['/peremajaan']).toEqual({
    id_semai: 7, id_meja: 3, jumlah_masuk: 40, tgl_awal_peremajaan: T, tgl_akhir_peremajaan: addDays(T, 14), benih_berhasil: 0, benih_gagal: 0,
  });
});

test('peremajaan -> pendewasaan: tanaman dari semai induk, tgl_akhir +21 hari', async () => {
  const a = fake({ '/peremajaan/9': { id_semai: 7, id_meja: 4, jumlah_masuk: 30 }, '/semai/7': { id_tanaman: 3 }, '/siklus': SIKLUS });
  await pindahTahap(a, 'peremajaan', 9);
  expect(a.calls.filter((c) => c.startsWith('POST'))).toEqual(['POST /pendewasaan']);
  expect(a.bodies['/pendewasaan']).toEqual({
    id_peremajaan: 9, id_meja: 4, jumlah_masuk: 30, tgl_awal_pendewasaan: T, tgl_akhir_pendewasaan: addDays(T, 21), tanaman_berhasil: 0, tanaman_gagal: 0,
  });
});

test('gagal membuat tahap baru -> semai tidak ditutup', async () => {
  const a = fake({ '/semai/7': { id_meja: 3, id_tanaman: 3, jumlah_benih: 1 }, '/siklus': SIKLUS }, '/peremajaan');
  await expect(pindahTahap(a, 'semai', 7)).rejects.toThrow('gagal');
  expect(a.calls).not.toContain('POST /tanam/semai/7/selesai');
});

test('catatPanen dan pendewasaan -> POST /panen saja', async () => {
  const a = fake({});
  await catatPanen(a, 5);
  await pindahTahap(a, 'pendewasaan', 5);
  expect(a.calls).toEqual(['POST /panen', 'POST /panen']);
  expect(a.bodies['/panen']).toEqual({ id_pendewasaan: 5, tgl_panen: T });
});

test('nilai kosong dari backend tidak menjadi undefined/NaN', async () => {
  const a = fake({ '/semai/1': { id_meja: null, id_tanaman: 3, jumlah_benih: null }, '/siklus': SIKLUS });
  await pindahTahap(a, 'semai', 1);
  expect(a.bodies['/peremajaan']).toMatchObject({ id_meja: null, jumlah_masuk: 0 });
});
