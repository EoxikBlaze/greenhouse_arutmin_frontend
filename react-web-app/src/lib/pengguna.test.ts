import { describe, expect, it } from 'vitest'
import { buatPassword, hitungPerLevel, inisial, kekuatanPassword, saring, type UserRow } from './pengguna'

const rows: UserRow[] = [
  { id: 1, username: 'garap', email: 'admin@politala.ac.id', level: 'admin' },
  { id: 2, username: 'demo', email: 'demo@vertonik.local', level: 'user', is_demo: true },
  { id: 3, username: 'petani', email: 'petani@vertonik.local', level: 'petani' },
]

describe('inisial', () => {
  it('satu kata → dua huruf awal', () => expect(inisial('garap')).toBe('GA'))
  it('dua kata → huruf pertama tiap kata', () => expect(inisial('budi_santoso')).toBe('BS'))
  it('kosong → ?', () => expect(inisial('  ')).toBe('?'))
})

describe('saring', () => {
  it('cari di username & email tanpa beda huruf', () => {
    expect(saring(rows, 'POLITALA', null).map((r) => r.id)).toEqual([1])
    expect(saring(rows, 'vertonik', null)).toHaveLength(2)
  })
  it('filter level', () => expect(saring(rows, '', 'petani').map((r) => r.id)).toEqual([3]))
  it('gabungan', () => expect(saring(rows, 'demo', 'admin')).toHaveLength(0))
})

describe('hitungPerLevel', () => {
  it('menghitung per level', () => expect(hitungPerLevel(rows)).toEqual({ admin: 1, user: 1, petani: 1 }))
})

describe('kekuatanPassword', () => {
  it('kosong', () => expect(kekuatanPassword('').skor).toBe(0))
  it('pendek', () => expect(kekuatanPassword('abc1').skor).toBe(1))
  it('cukup', () => expect(kekuatanPassword('abcdefg1h').skor).toBe(2))
  it('kuat', () => expect(kekuatanPassword('Abcdefgh1234').skor).toBe(3))
})

describe('buatPassword', () => {
  it('12 karakter, memuat besar/kecil/angka, tanpa karakter mirip', () => {
    for (let i = 0; i < 50; i++) {
      const p = buatPassword()
      expect(p).toHaveLength(12)
      expect(p).toMatch(/[a-z]/)
      expect(p).toMatch(/[A-Z]/)
      expect(p).toMatch(/\d/)
      expect(p).not.toMatch(/[0O1lI]/)
    }
  })
  it('tidak selalu sama', () => expect(buatPassword()).not.toBe(buatPassword()))
})
