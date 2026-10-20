import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DemoBanner } from '../components/DemoBanner'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../lib/authContext'
import type { Role } from '../lib/authTypes'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'
import { useApiObject } from '../lib/useApiObject'

/** Bentuk data /dashboard yang dipakai chrome (hanya utk indikator IoT). */
type DashboardStatus = { iotStatus?: { online?: boolean } | null }

/** Monogram Vertonik — SVG (R3: tanpa emoji, bentuk konsisten di sidebar & login). */
export function Monogram({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Vertonik Smart Farm">
      <rect x="1.25" y="1.25" width="37.5" height="37.5" rx="11" fill="#0A1F38" stroke="#E9CD53" strokeWidth="1.5" />
      <path
        d="M11.5 13 20 28.5 28.5 13"
        fill="none"
        stroke="#E9CD53"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 24.5c2.6-1 4.2-3 4.6-5.8-2.9-.1-5 1.6-5.6 4.4z" fill="#6B9D4A" />
    </svg>
  )
}

/** Judul halaman dinamis (sesuai topbar wireframe .pen) */
const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sensor-realtime': 'Sensor Real-Time',
  '/watercontrol': 'Water Control',
  '/tanam': 'Tanam Saya',
  '/semai': 'Semai',
  '/peremajaan': 'Peremajaan',
  '/pendewasaan': 'Pendewasaan',
  '/panen': 'Panen',
  '/siklus': 'Durasi Siklus',
  '/tanaman': 'Jenis Tanaman',
  '/meja': 'Meja Tanaman',
  '/ambang': 'Ambang Sensor',
  '/laporan': 'Laporan',
  '/notifikasi-wa': 'Notifikasi WhatsApp',
  '/user': 'Manajemen User',
  '/profil': 'Profil',
  '/cctv': 'CCTV — Ruang Greenhouse',
  '/asisten-ai': 'Asisten AI — Chat',
  '/dosing': 'Dosing Otomatis',
}

/* ── QW5 · Sidebar per role ───────────────────────────────────────────
 * Data NAV terstruktur; `allow` = role yang boleh LIHAT menu — sengaja
 * disamakan dengan guard router (router.tsx): ALL = semua role,
 * ADMIN_DEMO = admin + demo (petani tidak). Tanpa `allow` = semua role.
 * Subheader opsional ("Data Tahap") hanya tampil bila anaknya lolos filter. */
type RoleSet = Role[]
const ADMIN_DEMO: RoleSet = ['admin', 'demo']

type NavItem = {
  to: string
  label: string
  allow?: RoleSet
  indent?: boolean
  /** Label kecil di atas item pertama dalam grup (mis. "Data Tahap"). */
  subheader?: string
}
type NavGroup = { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: 'Ikhtisar',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/asisten-ai', label: 'Asisten AI' },
    ],
  },
  {
    label: 'Kebun & Sensor',
    items: [
      { to: '/sensor-realtime', label: 'Sensor Real-Time' },
      { to: '/watercontrol', label: 'Water Control', allow: ADMIN_DEMO },
      { to: '/dosing', label: 'Dosing Otomatis', allow: ADMIN_DEMO },
      { to: '/tanam', label: 'Tanam Saya' },
      { to: '/cctv', label: 'CCTV' },
    ],
  },
  {
    label: 'Siklus Tanam',
    items: [
      { to: '/semai', label: '› Semai', allow: ADMIN_DEMO, indent: true, subheader: 'Data Tahap' },
      { to: '/peremajaan', label: '› Peremajaan', allow: ADMIN_DEMO, indent: true },
      { to: '/pendewasaan', label: '› Pendewasaan', allow: ADMIN_DEMO, indent: true },
      { to: '/panen', label: '› Panen', allow: ADMIN_DEMO, indent: true },
      { to: '/siklus', label: 'Durasi Siklus', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/tanaman', label: 'Jenis Tanaman', allow: ADMIN_DEMO },
      { to: '/meja', label: 'Meja Tanaman', allow: ADMIN_DEMO },
      { to: '/ambang', label: 'Ambang Sensor', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Laporan & Notifikasi',
    items: [
      { to: '/laporan', label: 'Laporan', allow: ADMIN_DEMO },
      { to: '/notifikasi-wa', label: 'Notifikasi WhatsApp', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { to: '/profil', label: 'Profil' },
      { to: '/user', label: 'Manajemen User', allow: ADMIN_DEMO },
    ],
  },
]

/** Menu yang berhak dilihat role ini (petani → hanya rute ALL, tanpa 19 menu). */
function visibleItems(group: NavGroup, role: Role): NavItem[] {
  return group.items.filter((i) => !i.allow || i.allow.includes(role))
}

function SideItem({ to, children, indent }: { to: string; children: ReactNode; indent?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          // QW2 — target sentuh ≥44px.
          'flex min-h-[44px] items-center rounded-std-sm px-3 py-2 text-[14px] transition-all duration-200',
          indent ? 'pl-6 text-[13px]' : '',
          // QW4 (dipertahankan) — teks putih solid, kontras ≥7:1 di atas navy.
          // Aksen "aktif" = batang moss (token --moss) di tepi kiri + pill terang.
          isActive
            ? 'bg-white/[.12] font-semibold text-white shadow-[inset_3px_0_0_0_var(--moss)] ring-1 ring-white/15'
            : 'text-white/80 hover:bg-white/[.08] hover:text-white hover:translate-x-1',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="vsf-eyebrow vsf-eyebrow-light mt-5 mb-1 flex items-center gap-2">
      <span aria-hidden className="h-px w-3 bg-emas/70" />
      {children}
    </div>
  )
}

/** jam live HH:MM:SS (format .pen: 14:02:33) */
function formatClock(): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function AppShell() {
  const { demo, role, username, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [clock, setClock] = useState(() => formatClock())
  const [confirmKeluar, setConfirmKeluar] = useState(false)
  // QW6 — sidebar off-canvas di layar kecil (hamburger + backdrop).
  const [navOpen, setNavOpen] = useState(false)

  // S6 — indikator IoT topbar DARI data live (bukan hard-code selalu hijau).
  // Satu GET /dashboard per sesi AppShell + senyap tiap 60s; bila belum ada
  // data / gagal → badge disembunyikan (tak menampilkan status bohong).
  const { data: dash } = useApiObject<DashboardStatus>('/dashboard', { pollMs: 60_000 })
  const iotOnline = dash?.iotStatus?.online
  const namaUser = (username || role || '').trim()
  const inisial = (namaUser || '?').slice(0, 2).toUpperCase()

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000)
    return () => clearInterval(id)
  }, [])

  // Pindah rute → tutup sidebar mobile (penyesuaian state DILARANG di effect:
  // oxlint react(set-state-in-effect); pola "adjust state during render".)
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    if (navOpen) setNavOpen(false)
  }

  const title =
    TITLES[location.pathname] ??
    (TITLES[location.pathname.replace(/\/$/, '')] ?? 'GARAP')

  // QW5 — notice dari RequireAuth saat redirect karena role tak diizinkan.
  const notice = (location.state as { notice?: string } | null)?.notice
  function dismissNotice() {
    navigate(location.pathname, { replace: true, state: null })
  }

  function doLogout() {
    setConfirmKeluar(false)
    logout()
    navigate('/login', { replace: true })
  }

  // QW3 — dialog logout: fokus judul saat buka, kembali ke tombol "Keluar",
  // Escape & klik backdrop menutup, Tab terkunci di dalam dialog.
  const {
    dialogRef: logoutRef,
    onKeyDown: logoutKeyDown,
    backdropProps: logoutBackdrop,
  } = useDialog({ open: confirmKeluar, onClose: () => setConfirmKeluar(false) })

  return (
    <div className="min-h-dvh bg-arutmin-page">
      <DemoBanner demo={demo} />
      {/* R4 — skip-link ke konten utama (sembunyi sampai difokus keyboard). */}
      <a
        href="#vsf-main"
        className="vsf-btn-secondary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:shadow-deep"
      >
        Lewati ke konten utama
      </a>
      <div className="flex min-h-dvh">
        {/* QW6 — mobile: fixed off-canvas (tersembunyi ke kiri), desktop: statis. */}
        <aside
          id="vsf-sidebar"
          className={[
            '-translate-x-full fixed inset-y-0 left-0 z-40 w-[260px] shrink-0 overflow-y-auto bg-sidebar px-4 py-4 text-white vsf-stagger max-h-dvh transition-transform duration-200',
            'lg:static lg:z-auto lg:translate-x-0',
            navOpen ? 'translate-x-0' : '',
          ].join(' ')}
        >
          {/* Kepala sidebar — brand Vertonik/Arutmin: monogram SVG + teks (R3). */}
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
            <Monogram className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <div className="truncate font-display text-[16px] font-bold leading-tight text-white">Vertonik</div>
              <div className="vsf-eyebrow vsf-eyebrow-emas mt-0.5 truncate">Smart Farm</div>
              <div className="truncate text-[11px] text-white/55">PT Arutmin Indonesia</div>
            </div>
          </div>

          {/* QW5 — grup & item terfilter per role (petani: dashboard, asisten,
              sensor, tanam, cctv, profil saja). */}
          {NAV.map((group) => {
            const items = visibleItems(group, role)
            if (items.length === 0) return null
            return (
              <div key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>
                <div className="mt-2 grid gap-1">
                  {items.map((item) => (
                    <div key={item.to}>
                      {item.subheader && (
                        <div className="px-3 pt-1 text-[12px] font-bold text-white/70">{item.subheader}</div>
                      )}
                      <SideItem to={item.to} indent={item.indent}>
                        {item.label}
                      </SideItem>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="mt-4 grid gap-1">
            <button
              type="button"
              onClick={() => setConfirmKeluar(true)}
              className="flex min-h-[44px] w-full items-center rounded-[12px] px-3 py-2 text-left text-[14px] text-white/85 transition-all duration-200 hover:translate-x-1 hover:bg-white/10"
            >
              Keluar
            </button>
          </div>
        </aside>

        {/* Backdrop off-canvas (mobile saja). */}
        {navOpen && (
          <div
            aria-hidden
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        <main id="vsf-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {/* QW6 — header responsif: hamburger di <lg, badge/clock disederhanakan.
              Chrome navy (token --navy/--navy2) + aksen emas. */}
          <header className="vsf-topbar flex min-h-[64px] items-center gap-3 border-b border-white/10 bg-topbar px-4 text-white shadow-[0_16px_34px_-28px_rgba(7,21,39,.95)] sm:px-6">
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-std-sm border border-white/25 text-white transition-colors hover:bg-white/10 lg:hidden"
              aria-expanded={navOpen}
              aria-controls="vsf-sidebar"
              aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              onClick={() => setNavOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {navOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-bold leading-tight sm:text-[24px]">{title}</h1>
              <div className="vsf-eyebrow vsf-eyebrow-light hidden sm:block">GARAP · greenhouse hidroponik</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {/* S6 — status IoT dari data live /dashboard (lihat useApiObject di atas). */}
              {dash && (
                <span className="hidden md:inline-flex">
                  <StatusBadge
                    tone={iotOnline ? 'online' : 'offline'}
                    label={iotOnline ? 'Alat Terhubung' : 'Alat Terputus'}
                  />
                </span>
              )}
              <span className="hidden font-mono text-[13px] tabular-nums text-white/75 sm:block">{clock}</span>
              {/* Avatar inisial user (bukan emoji) + nama & role. */}
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full bg-emas text-[12px] font-bold uppercase leading-none text-navy"
                  aria-hidden
                >
                  {inisial}
                </span>
                <span className="text-[13px] font-semibold text-white">{namaUser || role}</span>
                <span className="hidden text-[11px] text-white/60 lg:block">{role}</span>
              </div>
            </div>
          </header>

          <div className="min-w-0 overflow-x-hidden p-4 sm:p-6">
            {/* QW5 — notice redirect role (state dari RequireAuth). */}
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="vsf-banner mb-4 flex items-center gap-3 rounded-std border border-amber-600/40 bg-amber-50 px-3 py-2 text-[13px] text-amber-800"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M12 3 1.8 20.5h20.4z" />
                  <path d="M12 9.5v4.5M12 17.2v.2" />
                </svg>
                <span>{notice}</span>
                <button
                  type="button"
                  aria-label="Tutup pemberitahuan"
                  className="ml-auto inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full px-2 text-amber-800 hover:bg-amber-100"
                  onClick={dismissNotice}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            )}
            <div key={location.pathname} className="vsf-page min-w-0">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Confirm sheet: Keluar — QW3: alertdialog + label + fokus + trap. */}
      {confirmKeluar && (
        <ModalBackdrop onMouseDown={logoutBackdrop.onMouseDown}>
          <div
            ref={logoutRef}
            onKeyDown={logoutKeyDown}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vsf-logout-title"
            aria-describedby="vsf-logout-desc"
            className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card"
          >
            <div id="vsf-logout-title" data-dialog-title tabIndex={-1} className="text-[16px] font-bold outline-none">
              Keluar dari akun?
            </div>
            <div id="vsf-logout-desc" className="mt-2 text-[13px] text-slate-700">
              Kamu akan keluar dari sesi <b>{username || role}</b>. Untuk masuk lagi, login ulang.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-btn-secondary" onClick={() => setConfirmKeluar(false)}>
                Batal
              </button>
              <button className="vsf-btn-danger" onClick={doLogout}>
                Ya, keluar
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}
