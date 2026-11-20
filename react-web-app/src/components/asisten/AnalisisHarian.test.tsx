// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalisisHarian, type Laporan } from './AnalisisHarian'

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
}))
vi.mock('../../lib/crudApi', () => ({
  useApiError: () => (e: unknown) => ({ status: 500, message: e instanceof Error ? e.message : 'Galat', errors: {} }),
}))

const LAP: Laporan = {
  id: 5, tanggal: '2026-11-17', pemicu: 'jadwal', diperbarui_pada: '2026-11-17T00:00:05Z',
  isi: {
    judul: 'Analisis harian 2026-11-17', prioritas: 'tinggi', ringkasan_utama: 'Periksa alat sensor.',
    bagian: [
      { judul: 'Kondisi sensor terkini', butir: ['pH: tidak tersedia.'] },
      { judul: 'Saran', butir: ['Koreksi nutrisi/pH hanya boleh diajukan lewat alur persetujuan dosing.'] },
    ],
  },
}

function jawab(url: string) {
  if (url.endsWith('/terbaru')) return Promise.resolve({ data: { data: LAP } })
  if (url.endsWith('/analisis-harian')) return Promise.resolve({ data: { data: [{ id: 5, tanggal: '2026-11-17', judul: LAP.isi.judul, prioritas: 'tinggi' }] } })
  return Promise.resolve({ data: { data: { ...LAP, tanggal: '2026-11-16' } } })
}

describe('AnalisisHarian', () => {
  let container: HTMLDivElement
  let root: Root
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockGet.mockReset().mockImplementation(jawab)
    mockPost.mockReset().mockResolvedValue({ data: { data: LAP } })
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('menampilkan laporan terbaru per bagian dan menandainya sudah dilihat', async () => {
    const onDilihat = vi.fn()
    await act(async () => root.render(<AnalisisHarian admin={false} onDilihat={onDilihat} />))
    const teks = container.textContent ?? ''
    expect(teks).toContain('Analisis harian 2026-11-17')
    expect(teks).toContain('Kondisi sensor terkini')
    expect(teks).toContain('pH: tidak tersedia.')
    expect(teks).toContain('Prioritas tinggi')
    expect(onDilihat).toHaveBeenCalledWith(5)
    expect(container.textContent).not.toContain('Jalankan sekarang')
  })

  it('admin bisa menjalankan sekarang', async () => {
    await act(async () => root.render(<AnalisisHarian admin onDilihat={() => {}} />))
    const tombol = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Jalankan sekarang'))!
    await act(async () => tombol.click())
    expect(mockPost).toHaveBeenCalledWith('/api/ai/analisis-harian/jalankan')
  })

  it('keadaan kosong bila belum ada laporan', async () => {
    mockGet.mockImplementation((url: string) => Promise.resolve({ data: { data: url.endsWith('/terbaru') ? null : [] } }))
    await act(async () => root.render(<AnalisisHarian admin={false} onDilihat={() => {}} />))
    expect(container.textContent).toContain('Belum ada analisis')
  })
})
