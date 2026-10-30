import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TEMA_KEY, aturTema, ambilTema, balikTema, bacaTersimpan, langgananTema, mulaiTema, temaAwal, terapkanTema } from './tema'

function pasangSistem(gelap: boolean) {
  const dengar = new Set<() => void>()
  const mq = {
    matches: gelap,
    addEventListener: (_: string, f: () => void) => dengar.add(f),
    removeEventListener: (_: string, f: () => void) => dengar.delete(f),
  }
  vi.stubGlobal('matchMedia', () => mq)
  return { ubah: (g: boolean) => { mq.matches = g; dengar.forEach((f) => f()) } }
}

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.tema
    document.documentElement.style.colorScheme = ''
  })
  afterEach(() => vi.unstubAllGlobals())

  it('pilihan tersimpan menang atas sistem; nilai tak sah diabaikan', () => {
    pasangSistem(true)
    expect(temaAwal()).toBe('gelap')
    localStorage.setItem(TEMA_KEY, 'terang')
    expect(temaAwal()).toBe('terang')
    localStorage.setItem(TEMA_KEY, 'ungu')
    expect(bacaTersimpan()).toBeNull()
    expect(temaAwal()).toBe('gelap')
  })

  it('terapkanTema mengatur atribut dan color-scheme; balikTema bolak-balik', () => {
    terapkanTema('gelap')
    expect(ambilTema()).toBe('gelap')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    terapkanTema('terang')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(balikTema('terang')).toBe('gelap')
    expect(balikTema('gelap')).toBe('terang')
  })

  it('aturTema menyimpan pilihan pengguna dan memberi tahu pendengar; dari sistem tidak menyimpan', () => {
    const f = vi.fn()
    const lepas = langgananTema(f)
    aturTema('gelap')
    expect(localStorage.getItem(TEMA_KEY)).toBe('gelap')
    expect(f).toHaveBeenCalledTimes(1)
    localStorage.clear()
    aturTema('terang', false)
    expect(localStorage.getItem(TEMA_KEY)).toBeNull()
    expect(f).toHaveBeenCalledTimes(2)
    lepas()
    aturTema('gelap')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('mulaiTema: mengikuti sistem hanya bila pengguna belum memilih; tab lain menyinkronkan', () => {
    const sis = pasangSistem(false)
    const henti = mulaiTema()
    expect(ambilTema()).toBe('terang')
    sis.ubah(true)
    expect(ambilTema()).toBe('gelap')
    expect(localStorage.getItem(TEMA_KEY)).toBeNull()
    aturTema('terang') // pengguna memilih eksplisit
    sis.ubah(true)
    expect(ambilTema()).toBe('terang')
    localStorage.setItem(TEMA_KEY, 'gelap')
    window.dispatchEvent(new StorageEvent('storage', { key: TEMA_KEY, newValue: 'gelap' }))
    expect(ambilTema()).toBe('gelap')
    henti()
  })
})
