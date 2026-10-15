import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DemoBanner } from '../components/DemoBanner'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../lib/authContext'

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

function SideItem({ to, children, indent }: { to: string; children: ReactNode; indent?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'block rounded-[12px] px-3 py-2 text-[14px] text-white/85 transition-all duration-200',
          indent ? 'pl-6 text-[13px]' : '',
          isActive
            ? 'bg-activePill text-white font-semibold shadow-[0_4px_12px_-6px_rgba(107,157,74,.9)]'
            : 'hover:bg-white/10 hover:translate-x-1',
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

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000)
    return () => clearInterval(id)
  }, [])

  const title =
    TITLES[location.pathname] ??
    (TITLES[location.pathname.replace(/\/$/, '')] ?? 'Vertonik Smart Farm')

  function doLogout() {
    setConfirmKeluar(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-arutmin-page">
      <DemoBanner demo={demo} />
      <div className="flex min-h-dvh">
        <aside className="w-[260px] shrink-0 bg-sidebar text-white px-4 py-4 vsf-stagger overflow-y-auto max-h-dvh">
          <div className="rounded-card border border-white/10 bg-white/5 p-3">
            <div className="text-[11px] tracking-[.14em] uppercase text-white/70">PT ARUTMIN INDONESIA</div>
            <div className="mt-1 text-[14px] font-extrabold">VERTONIK SMART FARM</div>
          </div>

          <GroupLabel>Ikhtisar</GroupLabel>
          <div className="mt-2 grid gap-1">
            <SideItem to="/dashboard">Dashboard</SideItem>
            <SideItem to="/asisten-ai">Asisten AI</SideItem>
          </div>

          <GroupLabel>Kebun & Sensor</GroupLabel>
          <div className="mt-2 grid gap-1">
            <SideItem to="/sensor-realtime">Sensor Real-Time</SideItem>
            <SideItem to="/watercontrol">Water Control</SideItem>
            <SideItem to="/dosing">Dosing Otomatis</SideItem>
            <SideItem to="/tanam">Tanam Saya</SideItem>
            <SideItem to="/cctv">CCTV</SideItem>
          </div>

          <GroupLabel>Siklus Tanam</GroupLabel>
          <div className="mt-2 grid gap-1">
            <div className="px-3 pt-1 text-[12px] font-bold text-white/70">Data Tahap</div>
            <SideItem to="/semai" indent>› Semai</SideItem>
            <SideItem to="/peremajaan" indent>› Peremajaan</SideItem>
            <SideItem to="/pendewasaan" indent>› Pendewasaan</SideItem>
            <SideItem to="/panen" indent>› Panen</SideItem>
            <SideItem to="/siklus">Durasi Siklus</SideItem>
          </div>

          <GroupLabel>Master Data</GroupLabel>
          <div className="mt-2 grid gap-1">
            <SideItem to="/tanaman">Jenis Tanaman</SideItem>
            <SideItem to="/meja">Meja Tanaman</SideItem>
            <SideItem to="/ambang">Ambang Sensor</SideItem>
          </div>

          <GroupLabel>Laporan &amp; Notifikasi</GroupLabel>
          <div className="mt-2 grid gap-1">
            <SideItem to="/laporan">Laporan</SideItem>
            <SideItem to="/notifikasi-wa">Notifikasi WhatsApp</SideItem>
          </div>

          <GroupLabel>Sistem</GroupLabel>
          <div className="mt-2 grid gap-1">
            <SideItem to="/profil">Profil</SideItem>
            <SideItem to="/user">Manajemen User</SideItem>
            <button
              type="button"
              onClick={() => setConfirmKeluar(true)}
              className="block w-full rounded-[12px] px-3 py-2 text-left text-[14px] text-white/85 transition-all duration-200 hover:bg-white/10 hover:translate-x-1"
            >
              Keluar
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="h-[64px] bg-white/90 backdrop-blur border-b border-arutmin-border px-6 flex items-center gap-3">
            <div>
              <div className="text-[18px] font-bold leading-tight">{title}</div>
              <div className="text-[10px] uppercase tracking-[.14em] text-slate-500">
                Vertonik Smart Farm · greenhouse hidroponik
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <StatusBadge tone="online" label="Alat Terhubung" />
              <div className="text-[13px] text-slate-600 tabular-nums font-mono">{clock}</div>
              <div className="rounded-full border border-arutmin-border px-3 py-1 text-[12px] font-semibold text-slate-700">
                ▾ {username || role}
              </div>
            </div>
          </header>

          <div className="p-6 overflow-x-hidden">
            <div key={location.pathname} className="vsf-page">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Confirm sheet: Keluar */}
      {confirmKeluar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 vsf-modal-backdrop">
          <div className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card" role="alertdialog" aria-modal="true">
            <div className="text-[16px] font-bold">Keluar dari akun?</div>
            <div className="mt-2 text-[13px] text-slate-700">
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
        </div>
      )}
    </div>
  )
}
