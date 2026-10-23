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

/** Baris pipa hidroponik — motif brand di sisi kanan panel hero (hanya ≥xl,
 *  di mana panel cukup lega: teks tak pernah tersentuh; fade ke kiri lewat mask). */
function PipeMotif() {
  const rows = [46, 128, 210, 292]
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[30%] overflow-hidden xl:block"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
      }}
    >
      <svg
        className="absolute -right-6 bottom-0 h-[86%] w-[130%] max-w-none"
        viewBox="0 0 560 340"
        fill="none"
        preserveAspectRatio="xMaxYMax slice"
      >
        {rows.map((y, i) => (
          <g key={y}>
            {/* pipa */}
            <path d={`M0 ${y} H560`} stroke="rgba(233,205,83,0.10)" strokeWidth="11" strokeLinecap="round" />
            <path d={`M0 ${y} H560`} stroke="rgba(233,205,83,0.09)" strokeWidth="1.5" />
            {/* aliran nutrisi — bergerak halus, arah selang-seling */}
            <path
              d={`M0 ${y} H560`}
              stroke="rgba(207,226,206,0.26)"
              strokeWidth="2"
              strokeDasharray="8 16"
              className={i % 2 === 0 ? 'vsf-flow' : 'vsf-flow vsf-flow-rev'}
            />
            {/* net pot */}
            {[70, 200, 330, 460].map((x) => (
              <circle
                key={x}
                cx={x}
                cy={y}
                r="7.5"
                fill="rgba(7,21,39,0.72)"
                stroke="rgba(107,157,74,0.4)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}

const KEUNGGULAN = [
  { label: 'Sensor real-time', detail: 'pH, TDS, dan suhu air dalam satu tampilan' },
  { label: 'Kendali katup & dosing', detail: 'Atur tandon dan pompa dari satu layar' },
  { label: 'Laporan siklus', detail: 'Rekap siklus tanam per bulan, bisa diunduh CSV' },
]

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
    <div className="flex min-h-screen w-full items-center bg-arutmin-page px-4 py-7 sm:px-6 sm:py-10">
      <div className="vsf-stagger mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-5 lg:min-h-[600px] lg:grid-cols-[1.35fr_430px] lg:gap-6">
        {/* ── Panel brand: identitas produk + janji nilai (R6: panel penuh di 390px) ── */}
        <aside className="relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-card bg-brandPanel p-6 text-white shadow-deep sm:p-8 lg:min-h-full">
          <PipeMotif />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-emas/25"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_0%_0%,rgba(107,157,74,.28),transparent_58%)]"
          />

          {/* Baris identitas */}
          <header className="relative flex items-center gap-3">
            <Monogram className="h-12 w-[4.5rem] shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-display text-[16px] font-bold leading-tight tracking-[0.02em]">
                GARAP
              </div>
              <div className="vsf-eyebrow vsf-eyebrow-emas mt-0.5">PT Arutmin Indonesia</div>
            </div>
          </header>

          {/* Hero / judul produk */}
          <div className="vsf-stagger relative mt-9 lg:mt-12">
            <p className="vsf-eyebrow vsf-eyebrow-light">Greenhouse hidroponik · IoT</p>
            <h1 className="mt-3 font-display text-[27px] font-bold leading-[1.06] tracking-[-0.02em] text-white sm:text-[34px] lg:text-[40px]">
              Vertonik Smart Farm
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-white/85 sm:text-[17px]">
              Satu layar untuk seluruh siklus tanam hidroponik — dari semai sampai panen.
            </p>
            <p className="mt-3 hidden max-w-[52ch] text-[13.5px] leading-relaxed text-white/65 sm:block">
              pH, TDS, suhu air, dan katup tandon terpantau real-time, lengkap dengan laporan siklus.
            </p>

            <ul className="mt-7 grid gap-4 sm:max-w-[54ch]">
              {KEUNGGULAN.map((k) => (
                <li key={k.label} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-emas ring-1 ring-inset ring-white/15">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-snug text-white">
                      {k.label}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-white/60">
                      {k.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="vsf-eyebrow vsf-eyebrow-light relative mt-9 text-white/70">GARAP · greenhouse hidroponik</div>
        </aside>

        {/* ── Kartu login: hierarki jelas + state loading & error yang jernih ── */}
        <form
          className="relative flex flex-col justify-center overflow-hidden rounded-card border border-garis bg-white shadow-soft"
          onSubmit={onSubmit}
          noValidate
          aria-busy={submitting}
        >
          {/* Progress bar hanya saat proses login berjalan */}
          {submitting && (
            <div className="absolute inset-x-0 top-0 h-[3px] bg-arutmin-mint/60">
              <div className="vsf-progress h-full w-full" />
            </div>
          )}

          <div className="px-5 pt-6 sm:px-7 sm:pt-7">
            <h2 className="font-display text-[22px] font-bold leading-tight tracking-[-0.01em] sm:text-[24px]">
              Selamat datang kembali
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-abu">
              Masuk dengan nama pengguna dan kata sandi yang terdaftar untuk membuka dashboard.
            </p>
          </div>

          <div className="px-5 pb-6 sm:px-7 sm:pb-7">
            {/* S8 — error server diumumkan ke screen reader */}
            {serverError && (
              <div
                key={serverError}
                role="alert"
                aria-live="assertive"
                className="vsf-banner-danger mt-5 flex items-start gap-2 rounded-std border border-red-600/50 bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-700"
              >
                <IconAlert />
                <span>{serverError}</span>
              </div>
            )}

            <div className={serverError ? 'mt-5' : 'mt-6'}>
              <label className="block text-[13px] font-semibold text-tinta" htmlFor="login-username">
                Nama Pengguna / Username
              </label>
              <input
                id="login-username"
                className="vsf-input mt-2.5 w-full"
                value={username}
                placeholder="cth. admin"
                autoComplete="username"
                // S8 — fokus ke field pertama begitu halaman terbuka
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                disabled={submitting}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'login-username-error' : undefined}
              />
              {errors.username && (
                <div
                  key={errors.username}
                  id="login-username-error"
                  role="alert"
                  className="vsf-banner mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-red-700"
                >
                  <IconAlert className="h-3.5 w-3.5 shrink-0" />
                  {errors.username}
                </div>
              )}

              <label className="mt-6 block text-[13px] font-semibold text-tinta" htmlFor="login-password">
                Kata Sandi / Password
              </label>
              <div className="mt-2.5 flex gap-3">
                <input
                  id="login-password"
                  className="vsf-input w-full"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  disabled={submitting}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="vsf-input inline-flex w-[44px] shrink-0 items-center justify-center px-0 text-slate-600 hover:border-arutmin-moss hover:text-arutmin-forest disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setShowPass((v) => !v)}
                  disabled={submitting}
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <IconEye off={!showPass} />
                </button>
              </div>
              {errors.password && (
                <div
                  key={errors.password}
                  id="login-password-error"
                  role="alert"
                  className="vsf-banner mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-red-700"
                >
                  <IconAlert className="h-3.5 w-3.5 shrink-0" />
                  {errors.password}
                </div>
              )}

              <button type="submit" className="vsf-btn-primary mt-7 w-full" disabled={submitting}>
                {submitting && <span className="vsf-spinner" aria-hidden />}
                {submitting ? 'Memproses…' : 'Masuk ke Dashboard'}
              </button>

              <p className="mt-3 min-h-[18px] text-center text-[12px] text-abu" aria-live="polite">
                {submitting ? 'Memverifikasi kredensial ke server…' : ' '}
              </p>

              <div className="mt-3 flex items-center justify-center gap-2 border-t border-garis pt-4 text-[12px] text-abu">
                <Monogram className="h-5 w-7" />
                © 2026 PT Arutmin Indonesia · Vertonik Smart Farm
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
