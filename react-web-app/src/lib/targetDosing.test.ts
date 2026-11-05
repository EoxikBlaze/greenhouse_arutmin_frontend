import { describe, expect, it } from 'vitest'
import { angkaOpsional, bodyTargetDosing, formDariNaik, targetBerubah, validasiTargetDosing } from './targetDosing'

describe('targetDosing', () => {
  it('semua kosong → sah (target dosing dimatikan, tanpa nilai bawaan)', () => {
    expect(validasiTargetDosing({})).toEqual({})
    expect(validasiTargetDosing({ ppm_awal: '', ppm_target: ' ', hari_capai: '' })).toEqual({})
    expect(bodyTargetDosing({})).toEqual({ ppm_awal: null, ppm_target: null, hari_capai: null })
  })

  it('sebagian terisi → galat pada kolom yang kosong (aturan semua-atau-tidak-sama-sekali database)', () => {
    const e = validasiTargetDosing({ ppm_awal: '400', ppm_target: '', hari_capai: '' })
    expect(Object.keys(e).sort()).toEqual(['hari_capai', 'ppm_target'])
    expect(validasiTargetDosing({ ppm_target: '900' }).ppm_awal?.[0]).toMatch(/Isi ketiga kolom/)
  })

  it('bukan angka → galat; koma dianggap desimal; rentang BUKAN urusan klien', () => {
    expect(validasiTargetDosing({ ppm_awal: 'abc', ppm_target: '10', hari_capai: '5' }).ppm_awal).toEqual(['Harus berupa angka.'])
    expect(angkaOpsional('1200,5')).toBe(1200.5)
    expect(validasiTargetDosing({ ppm_awal: '9999', ppm_target: '1', hari_capai: '0' })).toEqual({})
    expect(angkaOpsional('')).toBeNull()
    expect(angkaOpsional('x')).toBeNaN()
  })

  it('formDariNaik: kosong bila belum diatur; angka dari server dinormalkan', () => {
    expect(formDariNaik(null)).toEqual({ ppm_awal: '', ppm_target: '', hari_capai: '' })
    expect(formDariNaik({ id_tanaman: 1, ppm_awal: '400.00', ppm_target: '2400.00', hari_capai: 60 })).toEqual({ ppm_awal: '400', ppm_target: '2400', hari_capai: '60' })
  })

  it('targetBerubah: hanya true bila isian berbeda dari data server', () => {
    const n = { id_tanaman: 1, ppm_awal: '400.00', ppm_target: '2400.00', hari_capai: 60 }
    expect(targetBerubah({ ppm_awal: '400', ppm_target: '2400', hari_capai: '60' }, n)).toBe(false)
    expect(targetBerubah({ ppm_awal: '400,0', ppm_target: '2400', hari_capai: '60' }, n)).toBe(false)
    expect(targetBerubah({ ppm_awal: '400', ppm_target: '2300', hari_capai: '60' }, n)).toBe(true)
    expect(targetBerubah({}, n)).toBe(true)
    expect(targetBerubah({}, null)).toBe(false)
    expect(targetBerubah({ ppm_awal: '1', ppm_target: '2', hari_capai: '3' }, undefined)).toBe(true)
  })
})
