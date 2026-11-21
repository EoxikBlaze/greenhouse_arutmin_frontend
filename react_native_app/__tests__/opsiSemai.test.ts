import { loadOpsiSemai } from '@/features/tanam/tanamApi';

const api = (routes: Record<string, unknown>) => ({
  get: async <T,>(p: string) => {
    if (!(p in routes)) throw new Error('404');
    return routes[p] as T;
  },
  post: async <T,>() => ({} as T),
});

test('memakai /tanam/pilihan bila ada', async () => {
  const o = await loadOpsiSemai(api({ '/tanam/pilihan': { meja: [{ id: 1, nama: 'Meja 1' }], tanaman: [{ id: '5', nama: 'Melon' }] } }));
  expect(o).toEqual({ meja: [{ id: 1, label: 'Meja 1' }], tanaman: [{ id: 5, label: 'Melon' }], tanpaId: false });
});

test('fallback ke /meja dan /tanaman yang membawa id', async () => {
  const o = await loadOpsiSemai(api({ '/meja': [{ id_meja: 2, meja: 'Meja 2' }], '/tanaman': [{ id_tanaman: 3, nama_tanaman: 'Selada' }] }));
  expect(o.meja).toEqual([{ id: 2, label: 'Meja 2' }]);
  expect(o.tanaman).toEqual([{ id: 3, label: 'Selada' }]);
  expect(o.tanpaId).toBe(false);
});

test('baris tanpa id tidak dikarang: kosong dan tanpaId=true', async () => {
  const o = await loadOpsiSemai(api({ '/meja': [{ meja: 'A' }], '/tanaman': [{ nama_tanaman: 'B' }] }));
  expect(o).toEqual({ meja: [], tanaman: [], tanpaId: true });
});

test('daftar benar-benar kosong -> tanpaId=false', async () => {
  const o = await loadOpsiSemai(api({ '/meja': [], '/tanaman': [] }));
  expect(o.tanpaId).toBe(false);
});

test('galat jaringan di fallback dilempar, bukan ditelan', async () => {
  await expect(loadOpsiSemai(api({}))).rejects.toThrow();
});
