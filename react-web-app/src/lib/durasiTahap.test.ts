import { describe, expect, it } from 'vitest'
import { bagiDurasi, durasiDariIsian, hariBulat, isianDurasi, jumlahTahap, totalBulat } from './durasiTahap'

describe('durasiTahap', () => {
  it('bagi total ke tiga tahap: jumlah persis total dan tiap tahap minimal 1 hari', () => {
    for (const t of [3, 4, 10, 30, 33, 40, 45, 90, 365]) {
      const d = bagiDurasi(t)
      expect(d).not.toBeNull()
      expect(jumlahTahap(d)).toBe(t)
      expect(Math.min(d!.semai, d!.peremajaan, d!.pendewasaan)).toBeGreaterThanOrEqual(1)
    }
    expect(bagiDurasi(33)).toEqual({ semai: 7, peremajaan: 12, pendewasaan: 14 })
  })

  it('total tidak sah → null', () => {
    expect(bagiDurasi(2)).toBeNull()
    expect(bagiDurasi(null)).toBeNull()
    expect(totalBulat('366')).toBeNull()
    expect(totalBulat('abc')).toBeNull()
    expect(hariBulat('0')).toBeNull()
  })

  it('isian: tiga tahap lengkap menang atas total; total saja dibagi otomatis; kosong → null', () => {
    expect(durasiDariIsian('33', '5', '10', '20')).toEqual({ semai: 5, peremajaan: 10, pendewasaan: 20 })
    expect(durasiDariIsian('33', '', '', '')).toEqual({ semai: 7, peremajaan: 12, pendewasaan: 14 })
    expect(durasiDariIsian('', '', '', '')).toBeNull()
  })

  it('tersimpan sama dengan pembagian otomatis → tahap dikosongkan di form; beda → diisi', () => {
    expect(isianDurasi({ semai: 7, peremajaan: 12, pendewasaan: 14 })).toEqual({ dur_total: '33', dur_semai: '', dur_peremajaan: '', dur_pendewasaan: '' })
    expect(isianDurasi({ semai: 5, peremajaan: 10, pendewasaan: 20 })).toEqual({ dur_total: '35', dur_semai: '5', dur_peremajaan: '10', dur_pendewasaan: '20' })
  })
})
