import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Ikon, type NamaIkon } from '../components/Ikon'
import { useAuth } from '../lib/authContext'
import { useKeselamatan, peringatanKeselamatan } from '../lib/keselamatan'
import { Banner } from './Komponen'
import './hp.css'

type Tab = { to: string; label: string; ikon: NamaIkon }
const tabsUntuk = (admin: boolean): Tab[] => [
  { to: '/dashboard', label: 'Beranda', ikon: 'dashboard' },
  { to: '/tanam', label: 'Tanam', ikon: 'tanam' },
  ...(admin ? [{ to: '/saklar', label: 'Alat', ikon: 'ambang' as NamaIkon }] : []),
  { to: '/peringatan', label: 'Peringatan', ikon: 'peringatan' },
  { to: '/profil', label: 'Akun', ikon: 'profil' },
]

function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false)
    window.addEventListener('online', a); window.addEventListener('offline', b)
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b) }
  }, [])
  return on
}

const PEN = ['/dashboard', '/sensor-realtime', '/tanam', '/saklar', '/peringatan', '/profil']
type Lain = { to: string; label: string; ikon: NamaIkon; admin?: boolean; petani?: boolean }
/** Halaman web lengkap (belum ada layar pen) — tampil di rail desktop, bukan di dock HP. */
const LAIN: Lain[] = [
  { to: '/analisis', label: 'Analisis', ikon: 'ai', petani: true },
  { to: '/cctv', label: 'CCTV', ikon: 'cctv', petani: true },
  { to: '/asisten-ai', label: 'Asisten', ikon: 'ai', petani: true },
  { to: '/kalibrasi', label: 'Kalibrasi', ikon: 'kalibrasi' },
  { to: '/laporan', label: 'Laporan', ikon: 'laporan' },
  { to: '/audit', label: 'Aktivitas', ikon: 'audit' },
  { to: '/meja', label: 'Meja', ikon: 'meja' },
  { to: '/tanaman', label: 'Tanaman', ikon: 'daun' },
  { to: '/ambang', label: 'Ambang', ikon: 'ambang' },
  { to: '/data', label: 'Uji Lab', ikon: 'laporan' },
  { to: '/user', label: 'User', ikon: 'user', admin: true },
]

/** Banner global: E-STOP > HP Offline > Mode Demo (Peta Alur pen). */
function BannerGlobal() {
  const { demo } = useAuth()
  const online = useOnline()
  const estop = peringatanKeselamatan(useKeselamatan().data).find((p) => p.kode === 'estop' || p.kode === 'estop_fisik')
  if (estop) return <Banner tone="bahaya" judul="E-STOP aktif" isi={estop.teks} />
  if (!online) return <Banner tone="peringatan" judul="HP offline" isi="Tidak ada koneksi. Data yang tampil bisa sudah lama." />
  if (demo) return <Banner judul="Mode Demo" isi="Data contoh, semua aksi baca saja." />
  return null
}

/** Rangka layar HP: latar biru, banner global, dock 5 tab (admin) / 4 tab (petani, demo). */
export function HpShell() {
  const { role } = useAuth()
  const { pathname } = useLocation()
  const lama = !PEN.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const lain = LAIN.filter((l) => (l.admin ? role === 'admin' : l.petani || role !== 'petani'))
  return (
    <div className="hp">
      <main className="hp-isi">
        <BannerGlobal />
        <div className={lama ? 'hp-lama' : 'hp-pen'}><Outlet /></div>
      </main>
      <nav className="hp-rail-lain" aria-label="Menu lengkap">
        {lain.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'aktif' : '')}><Ikon nama={l.ikon} className="h-4 w-4" />{l.label}</NavLink>
        ))}
      </nav>
      <div className="hp-dock-wrap">
        <nav className="hp-dock" aria-label="Menu utama">
          {tabsUntuk(role === 'admin').map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'aktif' : '')}>
              <Ikon nama={t.ikon} className="h-[22px] w-[22px]" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
