import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { Monogram } from '../layouts/AppShell'

/** Ikon SVG inline (R3 — tanpa emoji agar konsisten & terbaca screen reader). */
function IconAlert({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 3 1.8 20.5h20.4z" />
      <path d="M12 9.5v4.5M12 17.2v.2" />
    </svg>
  )
}
function IconCheck({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  )
}
function IconEye({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.8" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

const KEUNGGULAN = ['Sensor real-time', 'Kendali katup & dosing', 'Laporan + notifikasi WA']

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
    <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-10">
      <div className="vsf-stagger grid grid-cols-1 gap-5 lg:min-h-[560px] lg:grid-cols-[1.35fr_420px]">
        {/* ── Panel brand (R6: panel penuh, bukan strip 34px di 390px) ── */}
        <aside className="relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-lg bg-brandPanel p-6 text-white shadow-deep sm:p-8 lg:min-h-full">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-emas/25"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-4 top-32 h-36 w-36 rounded-full border border-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_0%_0%,rgba(107,157,74,.25),transparent_58%)]"
          />

          <div className="relative flex items-center gap-3">
            <Monogram className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-display text-[18px] font-bold leading-tight">Vertonik Smart Farm</div>
              <div className="vsf-eyebrow vsf-eyebrow-emas mt-1">PT Arutmin Indonesia</div>
            </div>
          </div>

          <div className="relative mt-8">
            <h1 className="max-w-[20ch] font-bold leading-[1.2]">
              Satu layar untuk seluruh siklus tanam hidroponik.
            </h1>
            <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-white/75">
              Dari semai sampai panen — pH, TDS, suhu air, dan katup tandon terpantau real-time, lengkap
              dengan laporan dan notifikasi.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {KEUNGGULAN.map((k) => (
                <li
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/90"
                >
                  <span className="text-emas">
                    <IconCheck />
                  </span>
                  {k}
                </li>
              ))}
            </ul>
          </div>

          <div className="vsf-eyebrow vsf-eyebrow-light relative mt-8">GARAP · greenhouse hidroponik</div>
        </aside>

        {/* ── Kartu form lega ── */}
        <form
          className="rounded-lg border border-garis bg-white p-6 shadow-soft sm:p-7"
          onSubmit={onSubmit}
          noValidate
        >
          <div className="vsf-eyebrow">Masuk ke akun</div>
          <h2 className="mt-2 text-[20px] font-bold leading-tight">Selamat datang kembali</h2>
          <p className="mt-1 text-[13px] text-abu">Gunakan nama pengguna dan kata sandi yang terdaftar.</p>

          {/* S8 — error server diumumkan ke screen reader */}
          {serverError && (
            <div
              role="alert"
              aria-live="assertive"
              className="vsf-banner mt-4 flex items-start gap-2 rounded-std border border-red-600/50 bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700"
            >
              <IconAlert />
              <span>{serverError}</span>
            </div>
          )}

          <div className="mt-6">
            <label className="block text-[12px] font-bold text-tinta" htmlFor="login-username">
              Nama Pengguna / Username
            </label>
            <input
              id="login-username"
              className="vsf-input mt-2 w-full"
              value={username}
              autoComplete="username"
              // S8 — fokus ke field pertama begitu halaman terbuka
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'login-username-error' : undefined}
            />
            {errors.username && (
              <div id="login-username-error" role="alert" className="mt-1 text-[12px] text-red-700">
                {errors.username}
              </div>
            )}

            <label className="mt-5 block text-[12px] font-bold text-tinta" htmlFor="login-password">
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
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              <button
                type="button"
                className="vsf-input inline-flex w-[44px] shrink-0 items-center justify-center px-0 text-slate-600"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                <IconEye off={!showPass} />
              </button>
            </div>
            {errors.password && (
              <div id="login-password-error" role="alert" className="mt-1 text-[12px] text-red-700">
                {errors.password}
              </div>
            )}

            <button type="submit" className="vsf-btn-primary mt-6 w-full" disabled={submitting}>
              {submitting && <span className="vsf-spinner" aria-hidden />}
              {submitting ? 'Memproses…' : 'Masuk ke Dashboard'}
            </button>

            <div className="mt-5 flex items-center justify-center gap-2 border-t border-garis pt-4 text-[12px] text-abu">
              <Monogram className="h-4 w-4" />
              © 2026 PT Arutmin Indonesia · Vertonik Smart Farm
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
