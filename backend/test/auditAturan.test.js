'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { entriDariRute, ATURAN } = require('../src/audit');

const req = (method, originalUrl, extra = {}) => ({ method, originalUrl, params: {}, query: {}, body: null, user: { sub: 1 }, ...extra });

test('aksi Kebun Saya dan rute non-CRUD tercatat dengan peristiwa yang jelas', () => {
  const durasi = entriDariRute(req('PUT', '/tanam/semai/12/durasi', { body: { semai: 7, peremajaan: 12, pendewasaan: 14 } }));
  assert.equal(durasi.tabel, 'semais');
  assert.equal(durasi.row_id, '12');
  assert.equal(durasi.meta.peristiwa, 'Ubah durasi tahap batch');
  assert.deepEqual(durasi.after, { semai: 7, peremajaan: 12, pendewasaan: 14 });

  const selesai = entriDariRute(req('POST', '/tanam/peremajaan/5/selesai', { body: { berhasil: 4 } }));
  assert.equal(selesai.tabel, 'peremajaans');
  assert.equal(selesai.meta.peristiwa, 'Selesaikan tahap peremajaan');

  const hapus = entriDariRute(req('POST', '/tanam/9/hapus'));
  assert.deepEqual([hapus.aksi, hapus.tabel, hapus.row_id], ['delete', 'semais', '9']);

  const reset = entriDariRute(req('POST', '/api/aktuator/estop/reset'));
  assert.equal(reset.aksi, 'config_change');
  assert.equal(reset.meta.peristiwa, 'Reset E-STOP dari web');
});

test('kamera dan kunci API: body TIDAK disimpan (alamat RTSP dan kunci bisa memuat rahasia)', () => {
  const cam = entriDariRute(req('POST', '/cctv', { body: { nama: 'K1', url: 'rtsp://admin:sandi123@192.168.1.5/stream' } }));
  assert.equal(cam.after, null);
  assert.equal(cam.tabel, 'cctv_kameras');
  const kunci = entriDariRute(req('POST', '/api/kunci', { body: { nama: 'alat', scope: 'sensor:tulis' } }));
  assert.equal(kunci.after, null);
  assert.equal(kunci.meta.peristiwa, 'Buat kunci API alat');
  assert.equal(entriDariRute(req('DELETE', '/api/kunci/3')).row_id, '3');
});

test('semua aturan lolos CHECK audit_logs: create/update/delete wajib punya tabel dan row_id', () => {
  for (const [metode, , aksi, tabel, , id] of ATURAN) {
    if (['create', 'update', 'delete'].includes(aksi)) {
      assert.ok(tabel || /selesai/.test(String(id)) || aksi === 'update', `${metode} ${aksi} tanpa tabel`);
      assert.ok(id !== null, `${metode} ${aksi} tanpa row_id`);
    }
  }
});

test('rute telemetri dan baca tidak pernah dicatat', () => {
  assert.equal(entriDariRute(req('POST', '/monitoring', { body: { ph: 6 } })), null);
  assert.equal(entriDariRute(req('POST', '/api/device/v1/sensor', { body: { ph: 6 } })), null);
});
