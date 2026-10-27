import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const KEUNGGULAN = [
  { label: 'Sensor real-time', detail: 'pH, TDS, dan suhu air tiap meja' },
  { label: 'Dosing otomatis', detail: 'Nutrisi ditakar sistem, aman berlapis' },
  { label: 'Siklus tanam', detail: 'Semai sampai panen, cukup isi hasilnya' },
]

/** Judul poster — sama dengan hero halaman Tentang (TentangPage.tsx FONT_POSTER). */
const FONT_POSTER = "'Oswald','Anton',Impact,'Arial Narrow',sans-serif"
const LOGO_MITRA = [
  { src: '/logo/arutmin.png', alt: 'PT Arutmin Indonesia' },
  { src: '/logo/polytala.png', alt: 'Politeknik Negeri Tanah Laut' },
  { src: '/logo/trkj.png', alt: 'TRKJ' },
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
    <div className="relative isolate flex min-h-dvh w-full flex-col text-tinta">
      {/* latar lukisan gunung yang sama dengan halaman Tentang + gelap di kiri agar teks terbaca */}
      <div className="vsf-latar" aria-hidden />
      <div className="vsf-kabut" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1] bg-[linear-gradient(180deg,rgba(7,21,39,.55)_0%,rgba(7,21,39,.15)_55%,rgba(7,21,39,.45)_100%)] lg:bg-[linear-gradient(90deg,rgba(7,21,39,.72)_0%,rgba(7,21,39,.35)_48%,rgba(7,21,39,.05)_72%)]"
      />

      <header className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Monogram className="h-10 w-14 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate font-display text-[17px] font-bold leading-tight text-white">Vertonik</span>
            <span className="block truncate text-[12px] font-semibold text-[var(--emas)]">Smart Farm</span>
            <span className="sr-only">, ke beranda</span>
          </span>
        </Link>
        <span className="flex-1" />
        <Link to="/" className="vsf-bilah-tombol-kaca inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white">
          <span aria-hidden>←</span> Beranda
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-[1180px] flex-1 grid-cols-1 items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 lg:py-10">
        {/* ── Brand: ringkas di HP (form tetap terlihat tanpa gulir), lengkap di layar lebar ── */}
        <section className="vsf-stagger min-w-0 text-white" aria-labelledby="login-hero">
          <div className="vsf-kaca inline-flex max-w-full items-center gap-3 rounded-full px-4 py-2">
            {LOGO_MITRA.map((l) => (
              <img key={l.src} src={l.src} alt={l.alt} className="h-7 w-auto sm:h-8" draggable={false} />
            ))}
            <span className="hidden h-5 w-px bg-slate-300 sm:block" aria-hidden />
            <span className="hidden text-[12px] font-extrabold uppercase tracking-[.08em] text-navy sm:inline">KKN Arutmin Asik 2026</span>
          </div>

          <h1 id="login-hero" className="mt-5 [text-shadow:0_4px_22px_rgba(7,21,39,.55)]" style={{ fontFamily: FONT_POSTER }}>
            <span className="block -skew-x-6 text-[34px] font-bold uppercase leading-none text-white sm:text-[52px] lg:text-[64px]">Vertonik Smart Farm</span>
            <span className="mt-2 block -skew-x-6 text-[19px] font-bold uppercase italic leading-tight text-[var(--emas)] sm:text-[26px] lg:text-[30px]">
              Greenhouse hidroponik · PT Arutmin Indonesia
            </span>
          </h1>
          <p className="mt-4 hidden max-w-[52ch] text-[16px] leading-relaxed text-white/90 [text-shadow:0_2px_12px_rgba(7,21,39,.6)] sm:block">
            Merawat nutrisi tanaman tanpa petani harus menakar sendiri — pantau sensor, dosing, dan siklus tanam dari satu tempat.
          </p>

          <ul className="mt-6 hidden gap-3 lg:grid lg:max-w-[560px] lg:grid-cols-3">
            {KEUNGGULAN.map((k) => (
              <li key={k.label} className="vsf-kaca vsf-kaca-gelap rounded-[18px] p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--emas)] text-navy">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <span className="mt-3 block text-[14px] font-bold leading-snug text-white">{k.label}</span>
                <span className="mt-1 block text-[12.5px] leading-snug text-white/75">{k.detail}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Kartu login kaca: hierarki jelas + state loading & error yang jernih ── */}
        <form
          className="vsf-kaca vsf-pop relative w-full overflow-hidden rounded-[28px] p-6 sm:p-8"
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

          <div className="vsf-eyebrow">Akses sistem</div>
          <h2 className="mt-2 font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-navy sm:text-[27px]">
            Selamat datang kembali
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
            Masuk dengan akun GARAP Anda untuk membuka dashboard greenhouse.
          </p>

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

          <label className="mt-6 block text-[13px] font-semibold text-tinta" htmlFor="login-username">
            Nama pengguna
          </label>
          <input
            id="login-username"
            className="vsf-input mt-2 w-full bg-white"
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

          <label className="mt-5 block text-[13px] font-semibold text-tinta" htmlFor="login-password">
            Kata sandi
          </label>
          <div className="relative mt-2">
            <input
              id="login-password"
              className="vsf-input w-full bg-white pr-12"
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
              className="absolute inset-y-0 right-1 my-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-arutmin-mint/40 hover:text-arutmin-forest disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="mt-3 min-h-[18px] text-center text-[12px] text-slate-500" aria-live="polite">
            {submitting ? 'Memverifikasi kredensial ke server…' : 'Lupa kata sandi? Hubungi admin greenhouse.'}
          </p>
        </form>
      </main>

      <footer className="mx-auto w-full max-w-[1180px] px-4 pb-5 text-center text-[12px] text-white/80 [text-shadow:0_1px_8px_rgba(7,21,39,.7)] sm:px-6 lg:text-left">
        © 2026 PT Arutmin Indonesia · Vertonik Smart Farm · Instagram & TikTok @kkn.arutminidn2026
      </footer>
    </div>
  )
}
