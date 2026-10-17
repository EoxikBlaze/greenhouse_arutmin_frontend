import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()

    // validasi inline — state "field kosong" (wajib isi)
    const next: typeof errors = {}
    if (!username.trim()) next.username = 'Wajib isi nama pengguna.'
    if (!password) next.password = 'Wajib isi kata sandi.'
    setErrors(next)
    setServerError('')
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      // Login NYATA ke backend (bcrypt + rate limit anti brute-force)
      const redirect = await login(username, password)
      navigate(redirect || '/dashboard', { replace: true })
    } catch (err) {
      const data = (
        err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      )?.response?.data
      setServerError(data?.message || 'Login gagal — periksa koneksi ke server.')
      if (data?.errors) {
        setErrors({
          username: data.errors.username?.[0],
          password: data.errors.password?.[0],
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_420px] gap-4 min-h-[520px] vsf-stagger">
        <div className="vsf-card border-dashed flex items-center justify-center text-slate-500">
          LATAR FOTO HIDROPONIK + overlay gelap
        </div>
        <form className="vsf-card p-5" onSubmit={onSubmit} noValidate>
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500">Kartu login</div>
          <div className="mt-3 h-[74px] rounded-card border border-dashed border-arutmin-border flex items-center justify-center text-slate-500">
            Logo (lingkaran Arutmin)
          </div>
          <div className="mt-3 text-center">
            <div className="text-[16px] font-bold">PT Arutmin Indonesia</div>
            <div className="text-[13px] text-slate-600">Sistem Cerdas Manajemen &amp; Monitoring Hidroponik</div>
          </div>

          {serverError && (
            <div className="vsf-banner mt-4 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              ✖ {serverError}
            </div>
          )}

          <div className="mt-5">
            <label className="block text-[12px] font-bold text-slate-700" htmlFor="login-username">
              Nama Pengguna / Username
            </label>
            <input
              id="login-username"
              className="vsf-input mt-2 w-full"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
            />
            {errors.username && <div className="mt-1 text-[12px] text-red-700">{errors.username}</div>}

            <label className="block text-[12px] font-bold text-slate-700 mt-4" htmlFor="login-password">
              Kata Sandi / Password
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="login-password"
                className="vsf-input w-full"
                type={showPass ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="vsf-input w-[44px] px-0 transition-transform hover:scale-110 active:scale-95"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && <div className="mt-1 text-[12px] text-red-700">{errors.password}</div>}

            <button type="submit" className="vsf-btn-primary mt-4 w-full" disabled={submitting}>
              {submitting && <span className="vsf-spinner" />}
              {submitting ? 'Memproses…' : 'Masuk ke Dashboard →'}
            </button>

            <div className="mt-4 text-center text-[12px] text-slate-500">
              © 2026 PT Arutmin Indonesia • GARAP
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
