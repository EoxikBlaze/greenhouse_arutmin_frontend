import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { Monogram } from '../components/Monogram'
import { DemoBanner } from '../components/DemoBanner'
import { useAuth } from '../lib/authContext'
import type { Role } from '../lib/authTypes'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'
import { Ikon, type NamaIkon } from '../components/Ikon'
import { PillNav } from '../components/PillNav'
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

/* ── Menu per role ────────────────────────────────────────────────────
 * Desktop: rail ikon di kiri = menu utama (satu ikon per grup); nav pill di
 * atas = submenu grup yang sedang aktif. Mobile: laci berisi semua grup.
 * `allow` = role yang boleh LIHAT menu — sengaja disamakan dengan guard
 * router (router.tsx): ALL = semua role, ADMIN_DEMO = admin + demo. */
type RoleSet = Role[]
const ADMIN_DEMO: RoleSet = ['admin', 'demo']

type NavItem = {
  to: string
  label: string
  allow?: RoleSet
  /** Nama ikon di IKON (garis 24×24, stroke currentColor). */
  ikon: NamaIkon
  /** Nomor urut tahap (Semai 1 … Panen 4) — ganti ikon dengan bulatan bernomor. */
  langkah?: number
}
type NavGroup = { label: string; ikon: NamaIkon; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    label: 'Ikhtisar',
    ikon: 'dashboard',
    items: [
      { to: '/dashboard', label: 'Dashboard', ikon: 'dashboard' },
      { to: '/asisten-ai', label: 'Asisten AI', ikon: 'ai' },
    ],
  },
  {
    label: 'Kebun & Sensor',
    ikon: 'sensor',
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
    ikon: 'siklus',
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
    ikon: 'meja',
    items: [
      { to: '/tanaman', label: 'Jenis Tanaman', ikon: 'daun', allow: ADMIN_DEMO },
      { to: '/meja', label: 'Meja Tanaman', ikon: 'meja', allow: ADMIN_DEMO },
      { to: '/ambang', label: 'Ambang Sensor', ikon: 'ambang', allow: ADMIN_DEMO },
    ],
  },
  {
    label: 'Laporan & Sistem',
    ikon: 'laporan',
    items: [
      { to: '/laporan', label: 'Laporan', ikon: 'laporan', allow: ADMIN_DEMO },
      { to: '/user', label: 'Manajemen User', ikon: 'user', allow: ADMIN_DEMO },
      // Riwayat Audit — baca saja; guard setara backend (requireRole admin).
      { to: '/audit', label: 'Riwayat Audit', ikon: 'audit', allow: ADMIN_DEMO },
      { to: '/profil', label: 'Profil', ikon: 'profil' },
    ],
  },
]

/** Menu yang berhak dilihat role ini (petani → hanya rute ALL, tanpa 19 menu). */
function visibleItems(group: NavGroup, role: Role): NavItem[] {
  return group.items.filter((i) => !i.allow || i.allow.includes(role))
}

/** Satu ikon di rail desktop; label muncul sebagai tooltip kaca saat disorot/fokus. */
function RailItem({ to, label, ikon, aktif }: { to: string; label: string; ikon: NamaIkon; aktif: boolean }) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={aktif ? 'true' : undefined}
      className={[
        'group/rail relative grid h-12 w-12 place-items-center rounded-[18px] transition-all duration-[var(--dur-normal)] ease-[var(--ease-v2)]',
        aktif
          ? 'bg-activePill text-white shadow-[0_10px_20px_-10px_rgba(78,119,51,.95),inset_0_1px_0_rgba(255,255,255,.35)]'
          : 'text-tinta/70 hover:bg-white/75 hover:text-tinta',
      ].join(' ')}
    >
      <Ikon nama={ikon} className="h-[22px] w-[22px]" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[13px] font-semibold text-tinta opacity-0 shadow-[0_8px_24px_-10px_rgba(40,80,130,.4)] backdrop-blur-md transition-all duration-[var(--dur-normal)] group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-visible/rail:translate-x-0 group-focus-visible/rail:opacity-100"
      >
        {label}
      </span>
    </Link>
  )
}

/** Item di laci mobile (semua grup, daftar penuh). */
function DrawerItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        [
          'flex min-h-[44px] items-center gap-3 rounded-std-sm px-3 py-2 text-[14px] transition-all duration-[var(--dur-normal)] ease-[var(--ease-v2)]',
          isActive
            ? 'bg-activePill font-semibold text-white shadow-[0_8px_18px_-10px_rgba(78,119,51,.9)]'
            : 'text-tinta/80 hover:bg-white/70 hover:text-tinta',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {item.langkah ? (
            <span
              aria-hidden
              className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[12px] font-bold ${isActive ? 'border-emas bg-emas text-navy' : 'border-tinta/30 text-tinta/70'}`}
            >
              {item.langkah}
            </span>
          ) : (
            <Ikon nama={item.ikon} className={`h-[18px] w-[18px] ${isActive ? 'text-emas' : ''}`} />
          )}
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
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
  // Laci menu di layar kecil (hamburger + backdrop).
  const [navOpen, setNavOpen] = useState(false)

  const grupTampil = NAV.map((gr) => ({ ...gr, items: visibleItems(gr, role) })).filter((gr) => gr.items.length > 0)
  const grupAktif = grupTampil.find((gr) =>
    gr.items.some((it) => location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)),
  )

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

  // Laci mobile terbuka → kunci scroll latar agar tidak "bocor" ke halaman.
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

  // Pindah rute → tutup laci ("adjust state during render", bukan di effect).
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    if (navOpen) setNavOpen(false)
  }

  const title =
    TITLES[location.pathname] ??
    (TITLES[location.pathname.replace(/\/$/, '')] ?? 'GARAP')
  const beranda = location.pathname === '/dashboard'

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

  // Kilau spekular: titik terang di kaca mengikuti kursor (hanya perangkat pointer halus).
  // Satu pembaruan per frame: event pointermove bisa datang jauh lebih sering dari 60/detik.
  const kursor = useRef<{ el: HTMLElement; x: number; y: number } | null>(null)
  const kursorFrame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(kursorFrame.current), [])
  function ikutiKursor(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== 'mouse') return
    const el = (e.target as HTMLElement).closest<HTMLElement>('.vsf-card, .vsf-kpi-kaca, .vsf-kpi')
    if (!el) return
    kursor.current = { el, x: e.clientX, y: e.clientY }
    if (kursorFrame.current) return
    kursorFrame.current = requestAnimationFrame(() => {
      kursorFrame.current = 0
      const k = kursor.current
      if (!k) return
      const r = k.el.getBoundingClientRect()
      k.el.style.setProperty('--mx', `${(((k.x - r.left) / r.width) * 100).toFixed(1)}%`)
      k.el.style.setProperty('--my', `${(((k.y - r.top) / r.height) * 100).toFixed(1)}%`)
    })
  }

  return (
    <div className="relative isolate min-h-dvh">
      <div className="app-latar" aria-hidden />
      <DemoBanner demo={demo} />
      {/* R4 — skip-link ke konten utama (sembunyi sampai difokus keyboard). */}
      <a
        href="#vsf-main"
        className="vsf-btn-secondary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:shadow-deep"
      >
        Lewati ke konten utama
      </a>

      {/* Rail desktop — menu utama: satu ikon per grup, tooltip kaca di kanan. */}
      <aside
        aria-label="Menu utama"
        className="glass-chrome vsf-stagger fixed bottom-3 left-3 top-3 z-40 hidden w-[72px] flex-col items-center gap-2 py-3 lg:flex"
      >
        <Link to="/dashboard" aria-label="GARAP — ke dashboard" className="mb-1 block">
          <Monogram className="h-9 w-12" />
        </Link>
        <div className="my-1 h-px w-8 bg-tinta/15" aria-hidden />
        <nav className="flex flex-1 flex-col items-center gap-2">
          {grupTampil.map((gr) => (
            <RailItem key={gr.label} to={gr.items[0].to} label={gr.label} ikon={gr.ikon} aktif={gr === grupAktif} />
          ))}
        </nav>
        <RailItem to="/" label="Tentang Kami" ikon="info" aktif={false} />
        <button
          type="button"
          onClick={() => setConfirmKeluar(true)}
          aria-label="Keluar"
          title="Keluar"
          className="grid h-12 w-12 place-items-center rounded-[18px] text-tinta/70 transition hover:bg-white/75 hover:text-tinta"
        >
          <Ikon nama="keluar" className="h-[22px] w-[22px]" />
        </button>
      </aside>

      {/* Laci mobile (<lg) — semua grup + menu berurutan. */}
      <aside
        id="vsf-sidebar"
        className={[
          'glass-chrome fixed inset-y-3 left-3 z-40 flex w-[280px] max-w-[calc(100vw-1.5rem)] flex-col transition-transform duration-[var(--dur-normal)] ease-[var(--ease-v2)] lg:hidden',
          navOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-4 pt-4">
          <Monogram className="h-10 w-14" />
          <div className="min-w-0">
            <div className="truncate font-display text-[16px] font-bold leading-tight text-tinta">Vertonik</div>
            <div className="vsf-eyebrow vsf-eyebrow-gold mt-0.5 truncate">Smart Farm</div>
          </div>
        </div>
        <nav aria-label="Menu utama" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
          {grupTampil.map((gr) => (
            <div key={gr.label}>
              <div className="vsf-eyebrow vsf-eyebrow-chrome mb-1 mt-4 flex items-center gap-2 px-1">
                <span aria-hidden className="h-px w-3 bg-emas/70" />
                {gr.label}
              </div>
              <div className="grid gap-0.5">
                {gr.items.map((item) => (
                  <DrawerItem key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-4 pb-2">
          <DrawerItem item={{ to: '/', label: 'Tentang Kami', ikon: 'info' }} />
        </div>
        <div className="border-t border-white/60 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-white/55 p-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emas text-[12px] font-bold uppercase text-navy" aria-hidden>
              {inisial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-tinta">{namaUser || role}</div>
              <div className="truncate text-[12px] capitalize text-abu">{role}</div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmKeluar(true)}
              aria-label="Keluar"
              title="Keluar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-tinta/70 hover:bg-white/75 hover:text-tinta"
            >
              <Ikon nama="keluar" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop laci mobile — fade 180ms. */}
      {navOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-[rgba(10,31,56,0.32)] backdrop-blur-[3px] lg:hidden vsf-backdrop"
          onClick={() => setNavOpen(false)}
        />
      )}

      <main id="vsf-main" tabIndex={-1} onPointerMove={ikutiKursor} className="flex min-h-dvh min-w-0 flex-col outline-none lg:pl-[92px]">
        {/* Bilah atas: merek, nav pill submenu grup aktif, status. */}
        <header className="vsf-topbar sticky top-0 z-20 px-4 pt-3 sm:px-6">
          <div className="glass-chrome flex flex-wrap items-center gap-x-3 gap-y-2 py-2 pl-2 pr-2 sm:pl-3 xl:flex-nowrap">
            <button
              type="button"
              className="vsf-chrome-tautan !min-h-[44px] !min-w-[44px] justify-center !px-0 lg:!hidden"
              aria-expanded={navOpen}
              aria-controls="vsf-sidebar"
              aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              onClick={() => setNavOpen((v) => !v)}
            >
              <Ikon nama={navOpen ? 'tutup' : 'menu'} className="h-5 w-5" />
            </button>
            <div className="min-w-0 xl:hidden 2xl:block 2xl:w-[190px] 2xl:shrink-0">
              <div className="truncate font-display text-[16px] font-bold leading-tight text-tinta">Vertonik Smart Farm</div>
              <div className="hidden truncate text-[12px] text-abu sm:block">GARAP · greenhouse hidroponik</div>
            </div>
            {grupAktif && (
              <PillNav
                items={grupAktif.items}
                label={`Submenu ${grupAktif.label}`}
                className="order-last w-full xl:order-none xl:w-auto xl:min-w-0 xl:flex-1"
              />
            )}
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* S6 — status IoT dari data live /dashboard (lihat useApiObject di atas). */}
              {dash && (
                <span className="hidden md:inline-flex xl:hidden 2xl:inline-flex">
                  <span className="vsf-chip-terang" role="status">
                    <span className={`h-2 w-2 rounded-full ${iotOnline ? 'bg-moss' : 'bg-arutmin-error'}`} aria-hidden />
                    {iotOnline ? 'Alat terhubung' : 'Alat terputus'}
                  </span>
                </span>
              )}
              <span className="hidden text-[14px] font-semibold tabular-nums text-tinta/85 sm:block">{clock}</span>
              {/* Avatar inisial user (bukan emoji) + nama & role. */}
              <div className="vsf-chip-terang !gap-2 !py-1 !pl-1">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full bg-emas text-[12px] font-bold uppercase leading-none text-navy [text-shadow:none]"
                  aria-hidden
                >
                  {inisial}
                </span>
                <span className="text-[14px] font-semibold text-tinta">{namaUser || role}</span>
                <span className="hidden text-[12px] text-abu lg:block">{role}</span>
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
              <Ikon nama="peringatan" className="h-4 w-4" />
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Tutup pemberitahuan"
                className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2 text-amber-800 sm:min-h-[36px] sm:min-w-[36px] hover:bg-amber-100"
                onClick={dismissNotice}
              >
                <Ikon nama="tutup" className="h-4 w-4" />
              </button>
            </div>
          )}
          <div key={location.pathname} className="vsf-page min-w-0">
            {/* Judul halaman (dashboard punya sapaan sendiri sebagai h1). */}
            {!beranda && (
              <div className="mx-auto mb-4 w-full max-w-[1180px] md:mb-6">
                <div className="glass-card inline-flex flex-col gap-0.5 px-5 py-3">
                  {grupAktif && <div className="vsf-eyebrow vsf-eyebrow-chrome">{grupAktif.label}</div>}
                  <h1 className="font-display text-[24px] font-bold leading-tight text-tinta">{title}</h1>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </div>
        <SiteFooter pekat />
      </main>

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
