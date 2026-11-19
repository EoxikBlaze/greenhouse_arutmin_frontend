// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TombolStopPompa } from '../components/TombolStopPompa'
import { WaterControlPage } from './HidroV41Pages'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
let mockRole: 'admin' | 'petani' | 'demo' = 'admin'

vi.mock('../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}))

vi.mock('../lib/authContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'tester', nama: 'Tester' },
    role: mockRole,
    demo: mockRole === 'demo',
    isAuthenticated: true,
  }),
}))

vi.mock('../lib/crudApi', () => ({
  useApiList: () => ({ rows: [], loading: false, error: null, reload: () => {}, total: null }),
  useApiError: () => (err: unknown) => ({
    status: 500,
    message: err instanceof Error ? err.message : 'Galat',
    fieldErrors: {},
  }),
  fieldError: () => undefined,
}))

describe('Pemulihan fitur website GARAP', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockRole = 'admin'
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockGet.mockResolvedValue({ data: { data: [], perangkat: [] } })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('TombolStopPompa meminta konfirmasi dan memanggil POST /iot-v41/stop serta menyebut E-STOP fisik', async () => {
    mockPost.mockResolvedValueOnce({
      data: { status: true, id_perintah: 77, message: 'Perintah STOP masuk antrean.' },
    })

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TombolStopPompa />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('bukan pengganti E-STOP fisik')
    const btnStop = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('STOP pompa'))
    expect(btnStop).toBeTruthy()

    await act(async () => {
      btnStop!.click()
    })

    const btnYa = Array.from(document.body.querySelectorAll('button')).find((b) => b.textContent?.includes('Ya, kirim STOP'))
    expect(btnYa).toBeTruthy()

    await act(async () => {
      btnYa!.click()
    })

    expect(mockPost).toHaveBeenCalledWith('/iot-v41/stop', {})
    expect(container.textContent).toContain('#77')
  })

  it('WaterControlPage menjelaskan status nonaktif 503', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <WaterControlPage />
        </MemoryRouter>,
      )
    })

    expect(container.textContent).toContain('HTTP 503')
  })
})

