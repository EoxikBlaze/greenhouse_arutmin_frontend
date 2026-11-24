import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Ikon, type NamaIkon } from '../components/Ikon'
import './hp.css'

export const Layar = ({ children }: { children: ReactNode }) => <div className="hp"><div className="hp-isi hp-tengah">{children}</div></div>

export function Kartu({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`hp-kartu ${className}`}>{children}</section>
}

export function Header({ inisial, judul, sub }: { inisial: string; judul: string; sub: string }) {
  return (
    <header className="hp-header">
      <div className="hp-avatar" aria-hidden>{inisial}</div>
      <div><h1>{judul}</h1><p>{sub}</p></div>
    </header>
  )
}

export function KartuMetrik(p: { ikon: NamaIkon; label: string; nilai: string; status: string; tone?: 'ok' | 'bahaya' | '' }) {
  return (
    <Kartu className="hp-metrik">
      <div className="hp-label"><Ikon nama={p.ikon} className="h-4 w-4" />{p.label}</div>
      <div className="hp-nilai">{p.nilai}</div>
      <div className={`hp-status ${p.tone ?? ''}`}>{p.status}</div>
    </Kartu>
  )
}

export function JudulBagian({ judul, aksi, to }: { judul: string; aksi?: string; to?: string }) {
  return (
    <div className="hp-bagian">
      <h2>{judul}</h2>
      {aksi && to && <Link to={to}>{aksi}</Link>}
    </div>
  )
}

export function Kosong({ ikon = 'info', judul, isi }: { ikon?: NamaIkon; judul: string; isi: string }) {
  return (
    <Kartu className="hp-kosong">
      <Ikon nama={ikon} className="h-6 w-6" />
      <strong>{judul}</strong>
      <span>{isi}</span>
    </Kartu>
  )
}

export function Banner({ judul, isi, tone = 'info' }: { judul: string; isi: string; tone?: 'info' | 'bahaya' | 'peringatan' }) {
  return (
    <div className={`hp-banner ${tone === 'info' ? '' : tone}`} role={tone === 'bahaya' ? 'alert' : 'status'}>
      <div><b>{judul}</b><span>{isi}</span></div>
    </div>
  )
}

export const Chip = ({ tone = 'info', children }: { tone?: 'info' | 'kritis' | 'peringatan'; children: ReactNode }) => (
  <span className={`hp-chip ${tone === 'info' ? '' : tone}`}>{children}</span>
)

export const BarisData = ({ label, nilai }: { label: string; nilai: ReactNode }) => (
  <div className="hp-baris"><span className="hp-label">{label}</span><b>{nilai}</b></div>
)

export function BarisMenu({ ikon, label, to, onClick }: { ikon: NamaIkon; label: string; to?: string; onClick?: () => void }) {
  const isi = (<><Ikon nama={ikon} /><span style={{ flex: 1 }}>{label}</span><Ikon nama="kanan" className="h-4 w-4" /></>)
  return to ? <Link className="hp-baris hp-menu" to={to}>{isi}</Link> : <button type="button" className="hp-baris hp-menu" onClick={onClick}>{isi}</button>
}

export function Tombol({ sek, bahaya, ...r }: ButtonHTMLAttributes<HTMLButtonElement> & { sek?: boolean; bahaya?: boolean }) {
  return <button type="button" {...r} className={`hp-btn ${sek ? 'sek' : ''} ${bahaya ? 'bahaya' : ''}`} />
}

export const Skeleton = () => (
  <Kartu><div className="hp-skeleton" style={{ width: '40%' }} /><div className="hp-skeleton" /><div className="hp-skeleton" style={{ width: '70%' }} /></Kartu>
)
