import { describe, expect, it } from 'vitest'
import { angkaId, statusSensor } from './format'

describe('format HP (pen)', () => {
  it('angka koma Indonesia, kosong jadi strip', () => {
    expect(angkaId(6.4, 2)).toBe('6,40')
    expect(angkaId(null, 2)).toBe('—')
    expect(angkaId('', 1)).toBe('—')
  })
  it('status: tanpa data, data lama, perlu dicek, aman', () => {
    const amb = { ph: { min: 5.5, max: 6.5 } }
    expect(statusSensor(null, 'ph', amb, true, true).teks).toBe('Menunggu data')
    expect(statusSensor(6, 'ph', amb, false, true).teks).toBe('Data lama')
    expect(statusSensor(7, 'ph', amb, true, true)).toEqual({ teks: 'Perlu dicek', tone: 'bahaya' })
    expect(statusSensor(6, 'ph', amb, true, true)).toEqual({ teks: 'Aman', tone: 'ok' })
  })
})
