import { alatView, isianAwalKurva, kenaikanPerHari, kolomKurva, kurvaBody, naikBody, parseAngka, parseNaikHarian, validasiNaik } from '@/features/tanam/nutrisiView';

test('parseAngka: koma desimal, kosong dan teks -> null', () => {
  expect(parseAngka('6,5')).toBe(6.5);
  expect(parseAngka(' 400 ')).toBe(400);
  expect(parseAngka('')).toBeNull();
  expect(parseAngka('abc')).toBeNull();
});

test('parseNaikHarian: ambang dan baris tanpa id', () => {
  const r = parseNaikHarian({ ambang_tds: { max: 1000 }, data: [{ id_tanaman: 1, nama_tanaman: 'Melon', ppm_awal: 400, ppm_target: 800, hari_capai: 20 }, { nama_tanaman: 'x' }, { id_tanaman: '2' }] });
  expect(r.ambangMaks).toBe(1000);
  expect(r.list).toEqual([
    { id_tanaman: 1, nama: 'Melon', ppm_awal: 400, ppm_target: 800, hari_capai: 20 },
    { id_tanaman: 2, nama: 'Tanaman 2', ppm_awal: null, ppm_target: null, hari_capai: null },
  ]);
  expect(parseNaikHarian(null)).toEqual({ list: [], ambangMaks: null });
});

test('kenaikanPerHari: rata per hari, tidak masuk akal -> null', () => {
  expect(kenaikanPerHari(400, 800, 20)).toBe(20);
  expect(kenaikanPerHari(800, 400, 20)).toBeNull();
  expect(kenaikanPerHari(400, 800, 0)).toBeNull();
  expect(kenaikanPerHari(null, 800, 5)).toBeNull();
});

test('validasiNaik: tiap aturan, lalu valid', () => {
  expect(validasiNaik({ awal: '400', target: '', hari: '10' })).toMatch(/target akhir/i);
  expect(validasiNaik({ awal: '-1', target: '800', hari: '10' })).toMatch(/ppm awal/i);
  expect(validasiNaik({ awal: '400', target: '800', hari: '2,5' })).toMatch(/bilangan bulat/);
  expect(validasiNaik({ awal: '900', target: '800', hari: '10' })).toMatch(/lebih kecil/);
  expect(validasiNaik({ awal: '400', target: '800', hari: '20' })).toBeNull();
  expect(naikBody({ awal: '400', target: '800', hari: '20' })).toEqual({ ppm_awal: 400, ppm_target: 800, hari_capai: 20 });
});

test('kolomKurva: batch berjalan menyembunyikan ppm awal; cara tahap beda kolom', () => {
  expect(kolomKurva('harian', false).map((k) => k.key)).toEqual(['ppm_awal', 'ppm_target', 'hari_capai', 'ph_min', 'ph_max']);
  expect(kolomKurva('harian', true).map((k) => k.key)).toEqual(['ppm_target', 'hari_capai', 'ph_min', 'ph_max']);
  expect(kolomKurva('tahap', false).map((k) => k.key)).toEqual(['ppm_semai', 'ppm_peremajaan', 'ppm_pendewasaan', 'ph_min', 'ph_max']);
});

test('isianAwalKurva: nilai server menjadi teks berkoma', () => {
  const i = isianAwalKurva({ cara: 'harian', ppm_awal: 400, ppm_target: 800, hari_capai: 20 }, 5.5, 6.5);
  expect(i).toMatchObject({ ppm_awal: '400', ppm_target: '800', hari_capai: '20', ph_min: '5,5', ph_max: '6,5', ppm_semai: '' });
});

test('kurvaBody: hanya kolom tampil yang terisi, validasi pH dan ppm', () => {
  const k = kolomKurva('harian', true);
  expect(kurvaBody({ ppm_awal: '999', ppm_target: '800', hari_capai: '20', ph_min: '', ph_max: '' }, k)).toEqual({ body: { ppm_target: 800, hari_capai: 20 }, galat: null });
  expect(kurvaBody({}, k).galat).toMatch(/minimal satu/);
  expect(kurvaBody({ ph_min: '6,5', ph_max: '5,5' }, k).galat).toMatch(/pH min/);
  expect(kurvaBody({ hari_capai: '0' }, k).galat).toMatch(/bilangan bulat/);
  expect(kurvaBody({ ppm_target: '-5' }, k).galat).toMatch(/0 atau lebih/);
  const awal = kolomKurva('harian', false);
  expect(kurvaBody({ ppm_awal: '900', ppm_target: '800' }, awal).galat).toMatch(/lebih kecil/);
});

test('alatView: server tanpa data alat -> tersembunyi; alasan per keadaan', () => {
  expect(alatView({}).tampil).toBe(false);
  expect(alatView({ iotStatus: { online: true }, keadaan_alat: { mode: 'SEMAI' } })).toEqual({ tampil: true, dijaga: true, alasan: '' });
  expect(alatView({ iotStatus: { online: false }, keadaan_alat: null }).alasan).toBe('alat tidak terhubung ke server');
  expect(alatView({ iotStatus: { online: true }, keadaan_alat: { estop: true } }).alasan).toBe('E-STOP aktif');
  expect(alatView({ iotStatus: { online: true }, keadaan_alat: { siap: false, kurang: 'target' } }).alasan).toBe('alat belum siap, kurang target');
  expect(alatView({ iotStatus: { online: true }, keadaan_alat: { mode: 'PANEN' } }).alasan).toBe('alat dalam mode PANEN');
  expect(alatView({ iotStatus: { online: true }, keadaan_alat: { mode: 'IDLE' } }).alasan).toBe('alat belum menerima perintah SEMAI');
});
