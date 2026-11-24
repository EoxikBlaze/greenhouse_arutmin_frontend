import { describe, expect, it } from 'vitest'
import { bacaCsvSensor } from './riwayatSensor'
import { bangunWorkbook } from './sensorLaporan'

describe('laporan dari CSV sensor', () => {
  it('bacaan hasil bacaCsvSensor bisa dibuat menjadi workbook (ringkasan + data)', async () => {
    const csv = 'WAKTU,SUHU AIR (C),PH,NUTRISI (PPM),EC (MS/CM),SUHU UDARA (C),KELEMBAPAN (%)\n'
      + '2026-11-14 00:45:04,29,6.4,430,0.86,30,60\n2026-11-14 00:50:04,29,8.4,432,0.864,31,61\n'
    const rows = bacaCsvSensor(csv)
    const wb = await bangunWorkbook({
      rows, ambang: { ph: { min: 5, max: 7 } }, periode: 'Uji (14/11/2026)', dibuat: Date.UTC(2026, 10, 14), terpotong: false,
    })
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(2)
    const buf = await wb.xlsx.writeBuffer()
    expect(buf.byteLength).toBeGreaterThan(1000)
  })
})
