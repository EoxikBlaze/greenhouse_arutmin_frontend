import { describe, expect, it } from 'vitest'
import { BATAS_FOTO_BYTE, tipeFotoDiizinkan, ukuranKecil } from './fotoProfil'

describe('foto profil', () => {
  it('ukuranKecil menjaga rasio dan tidak memperbesar', () => {
    expect(ukuranKecil(387, 516)).toEqual({ lebar: 384, tinggi: 512 })
    expect(ukuranKecil(200, 100)).toEqual({ lebar: 200, tinggi: 100 })
    expect(ukuranKecil(4000, 2000)).toEqual({ lebar: 512, tinggi: 256 })
    expect(ukuranKecil(1000, 3000, 600)).toEqual({ lebar: 200, tinggi: 600 })
  })

  it('hanya PNG, JPEG, WebP yang diizinkan (SVG dan GIF ditolak)', () => {
    expect(tipeFotoDiizinkan('image/png')).toBe(true)
    expect(tipeFotoDiizinkan('image/jpeg')).toBe(true)
    expect(tipeFotoDiizinkan('image/webp')).toBe(true)
    expect(tipeFotoDiizinkan('image/svg+xml')).toBe(false)
    expect(tipeFotoDiizinkan('image/gif')).toBe(false)
    expect(tipeFotoDiizinkan('')).toBe(false)
  })

  it('batas unggah sama dengan backend (512 KB)', () => {
    expect(BATAS_FOTO_BYTE).toBe(524288)
  })
})
