// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn()
vi.mock('./api', () => ({ api: { get: (...a: unknown[]) => mockGet(...a) } }))
// objek/fungsi TETAP: bila baru tiap render, useApiError berubah identitas → hook memuat ulang tanpa henti
const auth = { logout: vi.fn() }
const navigasi = vi.fn()
vi.mock('./authContext', () => ({ useAuth: () => auth }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigasi }))

import { useApiList } from './crudApi'

type Baris = { id: number }
const halaman = (dari: number, n: number, total: number) => ({
  data: Array.from({ length: n }, (_, i) => ({ id: dari + i })),
  headers: { 'x-total-count': String(total) },
})

let wadah: HTMLDivElement
let root: Root
let hook: ReturnType<typeof useApiList<Baris>>

function Probe({ path }: { path: string }) {
  const res = useApiList<Baris>(path)
  useEffect(() => {
    hook = res
  })
  return null
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  wadah = document.createElement('div')
  document.body.appendChild(wadah)
  root = createRoot(wadah)
  mockGet.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  wadah.remove()
})

describe('useApiList — paginasi', () => {
  it('membaca X-Total-Count; muatLagi menambah baris berikutnya (offset = jumlah baris sekarang)', async () => {
    mockGet.mockResolvedValueOnce(halaman(1, 3, 5)).mockResolvedValueOnce(halaman(4, 2, 5))
    await act(async () => { root.render(<Probe path="/semai" />) })
    expect(hook.rows.map((r) => r.id)).toEqual([1, 2, 3])
    expect(hook.total).toBe(5)

    await act(async () => { await hook.muatLagi() })
    expect(mockGet).toHaveBeenLastCalledWith('/semai?offset=3')
    expect(hook.rows.map((r) => r.id)).toEqual([1, 2, 3, 4, 5])
    expect(hook.total).toBe(5)
  })

  it('path yang sudah punya query memakai & bukan ?', async () => {
    mockGet.mockResolvedValueOnce(halaman(1, 2, 4)).mockResolvedValueOnce(halaman(3, 2, 4))
    await act(async () => { root.render(<Probe path="/x?status=a" />) })
    await act(async () => { await hook.muatLagi() })
    expect(mockGet).toHaveBeenLastCalledWith('/x?status=a&offset=2')
  })

  it('tanpa header total (endpoint tak dipaginasi) → total null, muatLagi tidak memanggil API', async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: 1 }], headers: {} })
    await act(async () => { root.render(<Probe path="/meja" />) })
    expect(hook.total).toBeNull()
    await act(async () => { await hook.muatLagi() })
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('terpotong dibaca dari {list, terpotong:true} (/tanam)', async () => {
    mockGet.mockResolvedValueOnce({ data: { page: 'tanam', list: [{ id: 1 }], terpotong: true }, headers: {} })
    await act(async () => { root.render(<Probe path="/tanam" />) })
    expect(hook.terpotong).toBe(true)
  })
})
