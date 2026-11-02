import { describe, expect, it } from 'vitest'
import { tautanAman } from './riwayatChat'

describe('tautanAman', () => {
  it('menerima jalur internal sederhana', () => {
    expect(tautanAman([{ label: 'Kebun Saya', to: '/tanam' }])).toEqual([{ label: 'Kebun Saya', to: '/tanam' }])
  })
  it('menolak host, protokol, query, dan jalur ganda', () => {
    const buruk = [
      { label: 'x', to: 'https://contoh.com' },
      { label: 'x', to: '//contoh.com' },
      { label: 'x', to: '/tanam?x=1' },
      { label: 'x', to: '/a/b' },
      { label: 'x', to: 'javascript:alert(1)' },
      { label: 'x', to: '/Tanam' },
      { label: '', to: '/tanam' },
      { label: 'x'.repeat(41), to: '/tanam' },
      { label: 5, to: '/tanam' },
      null,
    ]
    expect(tautanAman(buruk)).toEqual([])
  })
  it('membuang kembar dan membatasi 5', () => {
    const d = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k) => ({ label: k, to: `/${k}` }))
    expect(tautanAman([...d, { label: 'dobel', to: '/a' }])).toHaveLength(5)
    expect(tautanAman('bukan array')).toEqual([])
  })
})

import { beforeEach } from 'vitest'
import { hapusSemuaChat, muatChat, simpanChat, type Pesan } from './riwayatChat'

describe('riwayat chat per tab', () => {
  beforeEach(() => sessionStorage.clear())
  const p = (id: number, peran: 'user' | 'ai', teks: string): Pesan => ({ id, peran, teks, waktu: 1 })

  it('pindah halaman lalu kembali: percakapan dipulihkan', () => {
    simpanChat('petani1', [p(1, 'user', 'cara menyemai'), { ...p(2, 'ai', 'langkah...'), tautan: [{ label: 'Kebun Saya', to: '/tanam' }] }])
    const balik = muatChat('petani1')
    expect(balik.map((x) => x.teks)).toEqual(['cara menyemai', 'langkah...'])
    expect(balik[1].tautan).toEqual([{ label: 'Kebun Saya', to: '/tanam' }])
  })
  it('akun lain di tab yang sama tidak melihat percakapan', () => {
    simpanChat('petani1', [p(1, 'user', 'rahasia')])
    expect(muatChat('admin')).toEqual([])
  })
  it('keluar menghapus semua riwayat; data rusak diabaikan', () => {
    simpanChat('petani1', [p(1, 'user', 'x')])
    hapusSemuaChat()
    expect(muatChat('petani1')).toEqual([])
    sessionStorage.setItem('vsf-chat:petani1', '{rusak')
    expect(muatChat('petani1')).toEqual([])
    sessionStorage.setItem('vsf-chat:petani1', JSON.stringify([{ peran: 'ai', teks: 1 }, { ...p(3, 'ai', 'ok'), tautan: [{ label: 'x', to: 'https://jahat' }] }]))
    expect(muatChat('petani1')).toEqual([{ ...p(3, 'ai', 'ok'), tautan: [] }])
  })
})
