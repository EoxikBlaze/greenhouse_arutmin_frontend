import { infoLevel, inisial } from '../../lib/pengguna'

/** [fotoUrl] hanya untuk foto AKUN SENDIRI (blob dari /profil/foto); daftar pengguna lain tetap inisial. */
export function Avatar({ nama, besar = false, fotoUrl }: { nama?: string | null; besar?: boolean; fotoUrl?: string | null }) {
  return (
    <span className={besar ? 'vsf-avatar is-besar' : 'vsf-avatar'} aria-hidden>
      {fotoUrl ? <img src={fotoUrl} alt="" className="vsf-avatar-foto" /> : inisial(nama)}
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
