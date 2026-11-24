import { describe, expect, it } from 'vitest'
import { bangunPaketRiset, type PaketRiset } from './paketRiset'

const PAKET: PaketRiset = {
  metadata: { dibuat: '2026-11-21T08:00:00.000Z', dari: '2026-11-14T08:00:00.000Z', sampai: '2026-11-21T08:00:00.000Z', interval_detik: 300, catatan: ['tds = ppm = EC x 500'], terpotong: false, baris_maks: 30000 },
  ambang: { ph: { min: 5, max: 7 }, tds: { min: '50', max: '2600' } },
  perangkat: [{ kode: 'aktuator-01', nama: 'Alat 1', peran: 'gabungan', versi_firmware: 'hidro-v6.3.0', id_meja: 1 }],
  kalibrasi: [{ sensor: 'ec', dilakukan_pada: '2026-11-19T10:00:00.000Z', nilai_ref: 1.413, bacaan_sebelum: null, bacaan_sesudah: 0.157, lulus: true, catatan: 'Titik 1' }],
  dosing: [{ t: Date.UTC(2026, 10, 20, 3, 0, 0), jenis: 'AB' }, { t: Date.UTC(2026, 10, 20, 9, 0, 0), jenis: 'PH' }],
  batch: [{ id: 1, tanaman: 'Melon', meja: 'Meja 1', mulai: '2026-11-10', tgl_panen: null, status: 'proses', jumlah_benih: 50, panen_berhasil: 0, panen_gagal: 0 }],
  sensor: [
    { waktu: '2026-11-20T00:00:00', ph: 6.4, tds: 430, ec_ms_cm: 0.86, suhu_air: 27, suhu_udara: 30, kelembapan: 60 },
    { waktu: '2026-11-20T00:05:00', ph: null, tds: 431, ec_ms_cm: null, suhu_air: 27, suhu_udara: 30, kelembapan: 60 },
  ],
}

describe('paket data riset', () => {
  it('membuat buku kerja dengan lembar yang dijanjikan dan baris sesuai data', async () => {
    const wb = await bangunPaketRiset(PAKET)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Petunjuk', 'Sensor', 'Dosing', 'Kalibrasi', 'Batch', 'Ambang', 'Perangkat'])
    expect(wb.getWorksheet('Sensor')!.rowCount).toBe(3) // header + 2 baris
    expect(wb.getWorksheet('Dosing')!.rowCount).toBe(3)
    expect(wb.getWorksheet('Ambang')!.getRow(3).getCell(2).value).toBe(50) // '50' → angka
    expect(wb.getWorksheet('Sensor')!.getRow(3).getCell(2).value).toBeNull() // pH kosong tetap kosong
    expect((await wb.xlsx.writeBuffer()).byteLength).toBeGreaterThan(1000)
  })

  it('peringatan muncul di lembar Petunjuk bila data dipotong', async () => {
    const wb = await bangunPaketRiset({ ...PAKET, metadata: { ...PAKET.metadata, terpotong: true } })
    const teks = JSON.stringify(wb.getWorksheet('Petunjuk')!.getSheetValues())
    expect(teks).toContain('PERINGATAN')
  })
})
