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
