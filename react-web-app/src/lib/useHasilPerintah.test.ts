import { describe, expect, it } from 'vitest'
import { kalimatHasil } from './useHasilPerintah'

describe('kalimatHasil', () => {
  it('belum ada kabar', () => {
    expect(kalimatHasil(null)).toMatch(/menunggu kabar/)
  })
  it('menyertakan alasan firmware dan tidak mengaku selesai saat gagal', () => {
    expect(kalimatHasil({ id: '7', status: 'gagal', alasan: 'estop' })).toBe('alat melapor GAGAL (estop)')
    expect(kalimatHasil({ id: '7', status: 'selesai', alasan: null })).toBe('alat melapor selesai')
    expect(kalimatHasil({ id: '7', status: 'kedaluwarsa', alasan: null })).toMatch(/offline/)
  })
})
