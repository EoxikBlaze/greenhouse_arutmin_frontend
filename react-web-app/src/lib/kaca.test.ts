import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bacaKaca, mulaiKaca, pantauKaca, setKaca } from './kaca'

// Penyimpanan dalam memori: Node baru punya `localStorage` global sendiri yang menutupi milik jsdom.
function penyimpananMemori(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', penyimpananMemori())
  delete document.documentElement.dataset.kaca
  document.documentElement.className = ''
  document.body.innerHTML = ''
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('preferensi transparansi', () => {
  it('bawaan "standar" bila belum ada pilihan', () => {
    expect(bacaKaca()).toBe('standar')
  })

  it('membaca pilihan tersimpan', () => {
    localStorage.setItem('vsf-kaca', 'jernih')
    expect(bacaKaca()).toBe('jernih')
  })

  it('nilai tersimpan yang tidak dikenal jatuh ke "standar"', () => {
    localStorage.setItem('vsf-kaca', 'transparan-banget')
    expect(bacaKaca()).toBe('standar')
  })

  it('penyimpanan diblokir tidak membuat error', () => {
    const diblokir = () => {
      throw new Error('diblokir')
    }
    vi.stubGlobal('localStorage', { getItem: diblokir, setItem: diblokir })
    expect(bacaKaca()).toBe('standar')
    expect(() => setKaca('pekat')).not.toThrow()
    expect(document.documentElement.dataset.kaca).toBe('pekat')
  })

  it('setKaca menulis atribut html dan localStorage', () => {
    setKaca('pekat')
    expect(document.documentElement.dataset.kaca).toBe('pekat')
    expect(localStorage.getItem('vsf-kaca')).toBe('pekat')
  })

  it('mulaiKaca menerapkan pilihan tersimpan', () => {
    localStorage.setItem('vsf-kaca', 'jernih')
    mulaiKaca()
    expect(document.documentElement.dataset.kaca).toBe('jernih')
  })
})

describe('pantauKaca', () => {
  type Cb = (es: Partial<IntersectionObserverEntry>[]) => void
  let picu: Cb

  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: Cb) {
          picu = cb
        }
        observe() {}
        disconnect() {}
      },
    )
  })

  it('kartu di luar layar diberi .vsf-di-luar dan dilepas saat terlihat', () => {
    const root = document.createElement('div')
    const kartu = document.createElement('section')
    kartu.className = 'vsf-card'
    root.appendChild(kartu)
    document.body.appendChild(root)

    const henti = pantauKaca(root)
    picu([{ target: kartu, isIntersecting: false }])
    expect(kartu.classList.contains('vsf-di-luar')).toBe(true)
    picu([{ target: kartu, isIntersecting: true }])
    expect(kartu.classList.contains('vsf-di-luar')).toBe(false)
    henti()
  })

  it('semua jenis permukaan kaca dipantau, elemen biasa tidak', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<section class="glass-chrome"></section><section class="glass-hero"></section>' +
      '<section class="glass-card"></section><section class="vsf-kpi-kaca"></section>' +
      '<section class="biasa"></section>'
    document.body.appendChild(root)

    const diamati: Element[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe(e: Element) {
          diamati.push(e)
        }
        disconnect() {}
      },
    )
    const henti = pantauKaca(root)
    expect(diamati.length).toBe(4)
    expect(diamati.some((e) => e.classList.contains('biasa'))).toBe(false)
    henti()
  })
})
