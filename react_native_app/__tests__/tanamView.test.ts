import { batchView, groupByTahap, nextTahap, TanamRow } from '@/features/tanam/tanamView';

const row = (o: Partial<TanamRow>): TanamRow => ({ id: 1, tipe: 'semai', status: 'proses', mulai: '2026-03-12T04:00:00.000Z', varietas: 'Melon', meja: 'Meja 3', ...o });

test('selalu empat bagian dalam urutan desain, walau daftar kosong', () => {
  const g = groupByTahap([]);
  expect(g.map((s) => s.judul)).toEqual(['Semai', 'Peremajaan', 'Pendewasaan', 'Panen']);
  expect(g.every((s) => s.batches.length === 0)).toBe(true);
});

test('batch dikelompokkan menurut tipe', () => {
  const g = groupByTahap([row({ id: 1 }), row({ id: 2, tipe: 'peremajaan' }), row({ id: 3 })]);
  expect(g[0].batches.map((b) => b.id)).toEqual([1, 3]);
  expect(g[1].batches).toHaveLength(1);
});

test('tipe tak dikenal diabaikan, bukan crash', () => {
  expect(() => groupByTahap([row({ tipe: 'aneh' as never })])).not.toThrow();
});

test('batchView: nama, tahap, tanggal Indonesia', () => {
  expect(batchView(row({}))).toMatchObject({ nama: 'Batch Melon · Meja 3', tahapLabel: 'Tahap: Semai', tanggal: 'Mulai 12 Mar 2026' });
});

test('varietas/meja null -> tanpa "null"', () => {
  const v = batchView(row({ varietas: null, meja: null, mulai: null }));
  expect(v.nama).toBe('Batch tanpa nama');
  expect(v.tanggal).toBe('Belum ada tanggal mulai');
  expect(JSON.stringify(v)).not.toContain('null');
});

test('tanggal rusak -> Belum ada tanggal mulai', () => {
  expect(batchView(row({ mulai: 'bukan tanggal' })).tanggal).toBe('Belum ada tanggal mulai');
});

test('nextTahap', () => {
  expect(nextTahap('semai')).toBe('peremajaan');
  expect(nextTahap('peremajaan')).toBe('pendewasaan');
  expect(nextTahap('pendewasaan')).toBe('panen');
  expect(nextTahap('panen')).toBeNull();
});
