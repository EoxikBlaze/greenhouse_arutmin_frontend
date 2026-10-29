import { describe, expect, it } from 'vitest'
import { riwayatUntukServer, type Pesan } from './riwayatChat'

let n = 0
const user = (teks: string): Pesan => ({ id: ++n, peran: 'user', teks, waktu: 0 })
const ai = (teks: string, ekstra: Partial<Pesan> = {}): Pesan => ({ id: ++n, peran: 'ai', teks, waktu: 0, ...ekstra })

describe('riwayatUntukServer', () => {
  it('meneruskan percakapan normal apa adanya (hanya peran dan teks)', () => {
    const r = riwayatUntukServer([user('pH?'), ai('pH 6,2', { sumber: 'data' })])
    expect(r).toEqual([
      { peran: 'user', teks: 'pH?' },
      { peran: 'ai', teks: 'pH 6,2' },
    ])
  })

  it('jawaban galat membuang pertanyaan pengguna di atasnya juga', () => {
    const r = riwayatUntukServer([user('pH?'), ai('pH 6,2'), user('halo?'), ai('gagal', { galat: true })])
    expect(r.map((x) => x.teks)).toEqual(['pH?', 'pH 6,2'])
  })

  it('jawaban yang ditolak pengaman membuang pasangannya utuh, pertanyaan sah berikutnya tetap lolos', () => {
    const r = riwayatUntukServer([user('resep kue'), ai('ditolak', { sumber: 'tolak' }), user('kondisi TDS?')])
    expect(r.map((x) => x.teks)).toEqual(['kondisi TDS?'])
  })

  it('hanya 8 pesan terakhir yang dikirim', () => {
    const banyak: Pesan[] = []
    for (let i = 0; i < 12; i++) banyak.push(i % 2 === 0 ? user(`q${i}`) : ai(`a${i}`))
    const r = riwayatUntukServer(banyak)
    expect(r).toHaveLength(8)
    expect(r[0].teks).toBe('q4')
    expect(r[7].teks).toBe('a11')
  })

  it('galat tanpa pertanyaan di depannya tidak merusak (daftar kosong)', () => {
    expect(riwayatUntukServer([ai('gagal', { galat: true })])).toEqual([])
  })
})
