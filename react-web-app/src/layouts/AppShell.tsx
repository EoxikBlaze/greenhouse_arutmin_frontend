import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { Monogram } from '../components/Monogram'
import { DemoBanner } from '../components/DemoBanner'
import { useAuth } from '../lib/authContext'
import type { Role } from '../lib/authTypes'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'
import { useApiObject } from '../lib/useApiObject'

/** Bentuk data /dashboard yang dipakai chrome (hanya utk indikator IoT). */
type DashboardStatus = { iotStatus?: { online?: boolean } | null }

export { Monogram } from '../components/Monogram'

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
  '/user': 'Manajemen User',
  '/profil': 'Profil',
  '/cctv': 'CCTV',
  '/asisten-ai': 'Asisten AI',
  '/dosing': 'Dosing Otomatis',
  '/kalibrasi': 'Kalibrasi Alat',
  '/audit': 'Riwayat Audit',
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
  /** Nama ikon di IKON (garis 24×24, stroke currentColor). */
  ikon: keyof typeof IKON
  /** Nomor urut tahap (Semai 1 … Panen 4) — ganti ikon dengan bulatan bernomor. */
  langkah?: number
}
type NavGroup = { label: string; items: NavItem[] }

/** Ikon garis minimalis — satu gaya dengan ikon halaman Tentang. */
const IKON = {
  dashboard: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  ai: 'M12 3l1.8 4.8 4.8 1.8-4.8 1.8L12 16.2l-1.8-4.8L5.4 9.6l4.8-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  sensor: 'M12 3c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0C7 9.6 9 7 12 3z',
  air: 'M4 15h16M7 15V9a5 5 0 0 1 10 0v6M12 4v2M9 19h6',
  dosing: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M7.5 15h9',
  tanam: 'M12 21v-9M12 12c0-4-3-7-8-7 0 4 3 7 8 7zM12 12c0-4 3-7 8-7 0 4-3 7-8 7z',
  cctv: 'M3 8l12-3 2 5-12 3zM17 10l4 1v4l-4-1M8 17l-1 4',
  siklus: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  daun: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l8-8',
  meja: 'M3 9h18M5 9v10M19 9v10M3 5h18v4H3z',
  ambang: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  laporan: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6',
  user: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.6c2 .6 3.3 2.4 3.6 5.4',
  audit: 'M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 3v4h4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  kalibrasi: 'M5 19a9 9 0 1 1 14 0M12 13l4-5M12 13h.01M8 19h8',
} as const

function Ikon({ nama, className = 'h-[18px] w-[18px]' }: { nama: keyof typeof IKON; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={IKON[nama]} />
    </svg>
  )
}

const NAV: NavGroup[] = [
  {
    label: 'Ikhtisar',
    items: [
      { to: '/dashboard', label: 'Dashboard', ikon: 'dashboard' },
      { to: '/asisten-ai', label: 'Asisten AI', ikon: 'ai' },
    ],
  },
  {
    label: 'Kebun & Sensor',
    items: [
      { to: '/sensor-realtime', label: 'Sensor Real-Time', ikon: 'sensor' },
      { to: '/tanam', label: 'Tanam Saya', ikon: 'tanam' },
      { to: '/watercontrol', label: 'Water Control', ikon: 'air', allow: ADMIN_DEMO },
      { to: '/dosing', label: 'Dosing Otomatis', ikon: 'dosing', allow: ADMIN_DEMO },
      { to: '/kalibrasi', label: 'Kalibrasi Alat', ikon: 'kalibrasi', allow: ADMIN_DEMO },
      { to: '/cctv', label: 'CCTV', ikon: 'cctv' },
    ],
  },
  {
    label: 'Siklus Tanam',
    items: [
      { to: '/semai', label: 'Semai', ikon: 'tanam', langkah: 1, allow: ADMIN_DEMO },
      { to: '/peremajaan', label: 'Peremajaan', ikon: 'tanam', langkah: 2, allow: ADMIN_DEMO },
      { to: '/pendewasaan', label: 'Pendewasaan', ikon: 'tanam', langkah: 3, allow: ADMIN_DEMO },
      { to: '/panen', label: 'Panen', ikon: 'tanam', langkah: 4, allow: ADMIN_DEMO },
      { to: '/siklus', label: 'Durasi Siklus', ikon: 'siklus', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/tanaman', label: 'Jenis Tanaman', ikon: 'daun', allow: ADMIN_DEMO },
      { to: '/meja', label: 'Meja Tanaman', ikon: 'meja', allow: ADMIN_DEMO },
      { to: '/ambang', label: 'Ambang Sensor', ikon: 'ambang', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Laporan & Sistem',
    items: [
      { to: '/laporan', label: 'Laporan', ikon: 'laporan', allow: ADMIN_DEMO },
      { to: '/user', label: 'Manajemen User', ikon: 'user', allow: ADMIN_DEMO },
      // Riwayat Audit — baca saja; guard setara backend (requireRole admin).
      { to: '/audit', label: 'Riwayat Audit', ikon: 'audit', allow: ADMIN_DEMO },
      { to: '/profil', label: 'Profil', ikon: 'profil' },
    ],
  },
]

/** Preferensi tampilan sidebar per peramban (aman bila storage diblokir). */
const SIMPAN_KEY = 'vsf-sidebar'
type Pref = { ciut?: boolean; tutup?: string[] }
function bacaPref(): Pref {
  try {
    return JSON.parse(localStorage.getItem(SIMPAN_KEY) || '{}') as Pref
  } catch {
    return {}
  }
}
function tulisPref(p: Pref) {
  try {
    localStorage.setItem(SIMPAN_KEY, JSON.stringify(p))
  } catch {
    /* storage diblokir → preferensi tidak diingat, sidebar tetap jalan */
  }
}

/** Menu yang berhak dilihat role ini (petani → hanya rute ALL, tanpa 19 menu). */
function visibleItems(group: NavGroup, role: Role): NavItem[] {
  return group.items.filter((i) => !i.allow || i.allow.includes(role))
}

function SideItem({ item, ciut }: { item: NavItem; ciut: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={ciut ? item.label : undefined}
      aria-label={ciut ? item.label : undefined}
      className={({ isActive }) =>
        [
          // QW2 — target sentuh ≥44px di layar sentuh; desktop sedikit lebih rapat (40px).
          'group/item flex min-h-[44px] items-center gap-3 rounded-std-sm px-3 py-2 text-[14px] transition-all duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:min-h-[40px]',
          ciut ? 'lg:justify-center lg:px-0' : '',
          // QW4 (dipertahankan) — teks putih solid, kontras ≥7:1 di atas navy; aktif = batang moss + pill terang.
          isActive
            ? 'bg-white/[.12] font-semibold text-white shadow-[inset_3px_0_0_0_var(--moss)] ring-1 ring-white/15'
            : 'text-white/75 hover:bg-white/[.08] hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {item.langkah ? (
            <span
              aria-hidden
              className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[10px] font-bold ${isActive ? 'border-emas bg-emas text-navy' : 'border-white/45 text-white/80'}`}
            >
              {item.langkah}
            </span>
          ) : (
            <Ikon nama={item.ikon} className={`h-[18px] w-[18px] ${isActive ? 'text-emas' : ''}`} />
          )}
          <span className={ciut ? 'lg:sr-only' : 'truncate'}>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

/** Judul grup yang bisa dilipat (desktop & mobile); saat sidebar diciutkan diganti garis pemisah. */
function GroupLabel({ label, buka, onToggle, ciut }: { label: string; buka: boolean; onToggle: () => void; ciut: boolean }) {
  if (ciut) return <div aria-hidden className="mx-auto mb-1 mt-4 hidden h-px w-6 bg-white/20 lg:block" />
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={buka}
      className="vsf-eyebrow vsf-eyebrow-light mt-4 mb-1 flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:text-white"
    >
      <span aria-hidden className="h-px w-3 bg-emas/70" />
      <span className="flex-1">{label}</span>
      <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform duration-[150ms] ${buka ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
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
  // Sidebar desktop bisa diciutkan jadi deretan ikon; grup bisa dilipat. Diingat per peramban.
  const [pref, setPref] = useState<Pref>(() => bacaPref())
  const ciut = !!pref.ciut && !navOpen
  function ubahPref(p: Pref) {
    setPref(p)
    tulisPref(p)
  }
  const grupAktif = NAV.find((gr) => gr.items.some((it) => (it.to === '/' ? location.pathname === '/' : location.pathname.startsWith(it.to))))?.label
  // grup halaman yang sedang dibuka selalu terbuka, walau pernah dilipat
  const grupBuka = (label: string) => label === grupAktif || !(pref.tutup ?? []).includes(label)
  function toggleGrup(label: string) {
    const tutup = new Set(pref.tutup ?? [])
    if (grupBuka(label)) tutup.add(label)
    else tutup.delete(label)
    ubahPref({ ...pref, tutup: [...tutup] })
  }

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
  // Menu mobile terbuka → kunci scroll latar agar tidak "bocor" ke halaman.
  useEffect(() => {
    if (!navOpen) return
    const lama = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = lama
    }
  }, [navOpen])

  // Pindah halaman → mulai dari atas (SPA tidak mereset scroll sendiri).
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

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
    closing: logoutClosing,
    handleClose: logoutClose,
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
            '-translate-x-full fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col bg-sidebar text-white vsf-stagger max-h-dvh transition-[transform,width] duration-[150ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
            'lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0',
            ciut ? 'lg:w-[76px]' : '',
            navOpen ? 'translate-x-0' : '',
          ].join(' ')}
        >
          {/* Kepala sidebar — brand + tombol ciutkan (desktop). */}
          <div className={`flex items-center gap-3 px-4 pt-4 ${ciut ? 'lg:flex-col lg:px-2' : ''}`}>
            <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-white/[.06] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] ${ciut ? 'lg:flex-none lg:p-1.5' : ''}`}>
              <Monogram className={`shrink-0 ${ciut ? 'h-9 w-11' : 'h-10 w-14'}`} />
              <div className={`min-w-0 ${ciut ? 'lg:hidden' : ''}`}>
                <div className="truncate font-display text-[16px] font-bold leading-tight text-white">Vertonik</div>
                <div className="vsf-eyebrow vsf-eyebrow-emas mt-0.5 truncate">Smart Farm</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => ubahPref({ ...pref, ciut: !pref.ciut })}
              aria-label={ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
              title={ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white lg:grid"
            >
              <svg viewBox="0 0 24 24" className={`h-4 w-4 ${ciut ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          </div>

          {/* QW5 — grup & item terfilter per role (petani: dashboard, asisten, sensor, tanam, cctv, profil). */}
          <nav aria-label="Menu utama" className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 ${ciut ? 'lg:px-3' : ''}`}>
            {NAV.map((group) => {
              const items = visibleItems(group, role)
              if (items.length === 0) return null
              const buka = ciut || grupBuka(group.label)
              return (
                <div key={group.label}>
                  <GroupLabel label={group.label} buka={buka} ciut={ciut} onToggle={() => toggleGrup(group.label)} />
                  {buka && (
                    <div className="grid gap-0.5">
                      {items.map((item) => (
                        <SideItem key={item.to} item={item} ciut={ciut} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Halaman publik (/) — rutenya di luar RequireAuth, jadi bukan bagian grup menu. */}
          <div className={`px-4 pb-2 ${ciut ? 'lg:px-3' : ''}`}>
            <SideItem item={{ to: '/', label: 'Tentang Kami', ikon: 'info' }} ciut={ciut} />
          </div>

          {/* Kartu pengguna + Keluar — selalu terlihat di dasar sidebar. */}
          <div className={`border-t border-white/10 p-3 ${ciut ? 'lg:px-2' : ''}`}>
            <div className={`flex items-center gap-2.5 rounded-lg bg-white/[.06] p-2 ${ciut ? 'lg:flex-col lg:bg-transparent lg:p-0' : ''}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emas text-[12px] font-bold uppercase text-navy" aria-hidden>
                {inisial}
              </span>
              <div className={`min-w-0 flex-1 ${ciut ? 'lg:hidden' : ''}`}>
                <div className="truncate text-[13.5px] font-semibold text-white">{namaUser || role}</div>
                <div className="truncate text-[11.5px] capitalize text-white/60">{role}</div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmKeluar(true)}
                aria-label="Keluar"
                title="Keluar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

          {/* Backdrop off-canvas (mobile saja) — P7: fade 180ms (bukan pop). */}
        {navOpen && (
          <div
            aria-hidden
            className="fixed inset-0 z-30 bg-black/40 lg:hidden vsf-backdrop"
            onClick={() => setNavOpen(false)}
          />
        )}

        <main id="vsf-main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          {/* QW6 — header responsif: hamburger di <lg, badge/clock disederhanakan.
              Chrome navy (token --navy/--navy2) + aksen emas. */}
          {/* Header — bilah liquid glass melayang (gaya sama dengan landing), tint navy lebih pekat
              karena latar aplikasi terang. */}
          <header className="vsf-topbar sticky top-0 z-20 px-3 pt-3 sm:px-6 sm:pt-4">
            <div className="vsf-bilah vsf-bilah-app flex min-h-[60px] items-center gap-3 py-2 pl-2 pr-2 sm:pl-5">
              <button
                type="button"
                className="vsf-bilah-tautan !min-h-[44px] !min-w-[44px] justify-center !px-0 lg:!hidden"
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
                <h1 className="truncate text-[19px] font-bold leading-tight text-white sm:text-[22px]">{title}</h1>
                <div className="hidden text-[12px] text-white/70 sm:block">GARAP · greenhouse hidroponik</div>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* S6 — status IoT dari data live /dashboard (lihat useApiObject di atas). */}
                {dash && (
                  <span className="hidden md:inline-flex">
                    <span className="vsf-bilah-chip" role="status">
                      <span className={`h-2 w-2 rounded-full ${iotOnline ? 'bg-moss' : 'bg-arutmin-error'}`} aria-hidden />
                      {iotOnline ? 'Alat terhubung' : 'Alat terputus'}
                    </span>
                  </span>
                )}
                <span className="hidden text-[14px] font-semibold tabular-nums text-white/85 sm:block">{clock}</span>
                {/* Avatar inisial user (bukan emoji) + nama & role. */}
                <div className="vsf-bilah-chip !gap-2 !py-1 !pl-1">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full bg-emas text-[12px] font-bold uppercase leading-none text-navy [text-shadow:none]"
                    aria-hidden
                  >
                    {inisial}
                  </span>
                  <span className="text-[14px] font-semibold text-white">{namaUser || role}</span>
                  <span className="hidden text-[12px] text-white/65 lg:block">{role}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-6">
            {/* QW5 — notice redirect role (state dari RequireAuth). */}
            {notice && (
              <div
                role="status"
                aria-live="polite"
                className="vsf-banner mb-4 flex items-center gap-3 rounded-std vsf-tone-warn px-3 py-2 text-[13px]"
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
          <SiteFooter pekat />
        </main>
      </div>

      {/* Confirm sheet: Keluar — QW3: alertdialog + label + fokus + trap. */}
      {confirmKeluar && (
        <ModalBackdrop onMouseDown={logoutBackdrop.onMouseDown} closing={logoutClosing}>
          <div
            ref={logoutRef}
            onKeyDown={logoutKeyDown}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="vsf-logout-title"
            aria-describedby="vsf-logout-desc"
            className={`w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card${logoutClosing ? ' is-closing' : ''}`}
          >
            <div id="vsf-logout-title" data-dialog-title tabIndex={-1} className="text-[16px] font-bold outline-none">
              Keluar dari akun?
            </div>
            <div id="vsf-logout-desc" className="mt-2 text-[13px] text-slate-700">
              Kamu akan keluar dari sesi <b>{username || role}</b>. Untuk masuk lagi, login ulang.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="vsf-btn-secondary" onClick={logoutClose}>
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
