import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DemoBanner } from '../components/DemoBanner'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../lib/authContext'
import type { Role } from '../lib/authTypes'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'

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
          'flex min-h-[44px] items-center rounded-[12px] px-3 py-2 text-[14px] transition-all duration-200',
          indent ? 'pl-6 text-[13px]' : '',
          // QW4 — nav aktif: gradient #3F5C41→#2D452F + teks putih SOLID
          // (dulu text-white/85 menumpuk di atas pill → kontras 2.76:1).
          isActive
            ? 'bg-[linear-gradient(135deg,#3F5C41_0%,#2D452F_100%)] text-white font-semibold shadow-[0_4px_12px_-6px_rgba(107,157,74,.9)]'
            : 'text-white/85 hover:bg-white/10 hover:translate-x-1',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 text-[11px] tracking-[.14em] uppercase text-white/60 font-bold">{children}</div>
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
          <div className="rounded-card border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] tracking-[.14em] uppercase text-white/70">PT ARUTMIN INDONESIA</div>
            <div className="mt-1 text-[14px] font-extrabold">GARAP</div>
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

        <main className="flex-1 min-w-0">
          {/* QW6 — header responsif: hamburger di <lg, badge/clock disederhanakan. */}
          <header className="flex min-h-[64px] items-center gap-3 border-b border-arutmin-border bg-white/90 px-4 backdrop-blur sm:px-6">
            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] border border-arutmin-border text-[18px] text-slate-700 lg:hidden"
              aria-expanded={navOpen}
              aria-controls="vsf-sidebar"
              aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? '✕' : '☰'}
            </button>
            <div className="min-w-0">
              <div className="truncate text-[18px] font-bold leading-tight">{title}</div>
              <div className="hidden text-[10px] uppercase tracking-[.14em] text-slate-500 sm:block">
                GARAP · greenhouse hidroponik
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden md:inline-flex">
                <StatusBadge tone="online" label="Alat Terhubung" />
              </span>
              <div className="hidden text-[13px] font-mono tabular-nums text-slate-600 sm:block">{clock}</div>
              <div className="rounded-full border border-arutmin-border px-3 py-1 text-[12px] font-semibold text-slate-700">
                ▾ {username || role}
              </div>
            </div>
          </header>

          <div className="min-w-0 overflow-x-hidden p-4 sm:p-6">
            {/* QW5 — notice redirect role (state dari RequireAuth). */}
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="vsf-banner mb-4 flex items-center gap-3 rounded-input border border-amber-600/40 bg-amber-50 px-3 py-2 text-[13px] text-amber-800"
              >
                <span>⚠ {notice}</span>
                <button
                  type="button"
                  aria-label="Tutup pemberitahuan"
                  className="ml-auto min-h-[36px] min-w-[36px] rounded-full px-2 text-amber-800 hover:bg-amber-100"
                  onClick={dismissNotice}
                >
                  ✕
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
              <button className="vsf-input rounded-full" onClick={() => setConfirmKeluar(false)}>
                Batal
              </button>
              <button className="rounded-full bg-red-700 px-4 py-2 text-[13px] font-semibold text-white" onClick={doLogout}>
                Ya, keluar
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </div>
  )
}
