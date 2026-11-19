import { describe, expect, it } from 'vitest'
import { langkahTarget, targetPada, tickWaktu } from './nutrisiGrafik'

const JAM = 3_600_000

describe('langkahTarget — garis target bertangga', () => {
  it('bertahan di nilai lama sampai target baru, lalu sampai akhir', () => {
    const s = langkahTarget([{ t: 0, ppm: 400 }, { t: 10, ppm: 450 }, { t: 20, ppm: 500 }], 30)
    expect(s).toEqual([[0, 400], [10, 400], [10, 450], [20, 450], [20, 500], [30, 500]])
  })

  it('urutan masukan bebas; kosong → kosong; satu titik → garis datar', () => {
    expect(langkahTarget([{ t: 10, ppm: 450 }, { t: 0, ppm: 400 }], 15)[0]).toEqual([0, 400])
    expect(langkahTarget([], 10)).toEqual([])
    expect(langkahTarget([{ t: 5, ppm: 300 }], 9)).toEqual([[5, 300], [9, 300]])
  })
})

describe('targetPada', () => {
  const titik = [{ t: 0, ppm: 400 }, { t: 10, ppm: 450 }]
  it('nilai terakhir yang sudah dikirim pada waktu itu', () => {
    expect(targetPada(titik, 5)).toBe(400)
    expect(targetPada(titik, 10)).toBe(450)
    expect(targetPada(titik, 99)).toBe(450)
  })
  it('belum ada target sebelum titik pertama', () => {
    expect(targetPada(titik, -1)).toBeNull()
    expect(targetPada([], 5)).toBeNull()
  })
})

describe('tickWaktu', () => {
  it('rentang pendek: tiap 6 jam; rentang panjang: tiap tengah malam', () => {
    const dari = new Date(2026, 10, 18, 3, 30).getTime()
    const pendek = tickWaktu(dari, dari + 24 * JAM)
    expect(pendek.length).toBeGreaterThanOrEqual(3)
    expect(pendek.every((t) => new Date(t).getHours() % 6 === 0)).toBe(true)
    const panjang = tickWaktu(dari, dari + 7 * 24 * JAM)
    expect(panjang.length).toBe(7)
    expect(panjang.every((t) => new Date(t).getHours() === 0)).toBe(true)
  })
})
