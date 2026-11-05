import { infoLevel, inisial } from '../../lib/pengguna'

export function Avatar({ nama, besar = false }: { nama?: string | null; besar?: boolean }) {
  return (
    <span className={besar ? 'vsf-avatar is-besar' : 'vsf-avatar'} aria-hidden>
      {inisial(nama)}
    </span>
  )
}

export function LencanaLevel({ level }: { level?: string | null }) {
  const l = String(level ?? '').toLowerCase()
  const info = infoLevel(l)
  return <span className={`vsf-lencana-level is-${info ? l : 'lain'}`}>{info?.label ?? (level || '—')}</span>
}

export function LencanaDemo() {
  return (
    <span className="vsf-master-chip" title="Akun demo — data otomatis dihapus">
      Demo
    </span>
  )
}
