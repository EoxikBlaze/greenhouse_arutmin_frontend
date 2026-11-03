// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const login = vi.fn()
vi.mock('../lib/authContext', () => ({ useAuth: () => ({ login }) }))

import LoginPage from './LoginPage'

let wadah: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  wadah = document.createElement('div')
  document.body.appendChild(wadah)
  root = createRoot(wadah)
})

afterEach(() => {
  act(() => root.unmount())
  wadah.remove()
  login.mockReset()
})

function isi(sel: string, nilai: string) {
  const el = wadah.querySelector<HTMLInputElement>(sel)!
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, nilai)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('LoginPage', () => {
  it('gagal berulang tetap menampilkan SATU banner, tanpa pesan kolom yang sama', async () => {
    const pesan = 'Username / Password salah.'
    login.mockRejectedValue({ response: { data: { message: pesan, errors: { username: [pesan] } } } })
    await act(async () => {
      root.render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      )
    })
    isi('#login-username', 'garap')
    isi('#login-password', 'salah')
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        wadah.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      })
    }
    expect(login).toHaveBeenCalledTimes(3)
    expect(wadah.querySelectorAll('.vsf-banner-danger')).toHaveLength(1)
    expect(wadah.querySelector('#login-username-error')).toBeNull()
  })
})
