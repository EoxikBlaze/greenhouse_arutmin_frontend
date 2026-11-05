import { infoLevel, type UserRow } from '../../lib/pengguna'
import { Ikon } from '../Ikon'
import { Avatar, LencanaDemo, LencanaLevel } from '../pengguna/Penanda'

/** Kartu profil: identitas, akses level, dan aksi akun. `terkunci` = akun demo (backend menolak ubah). */
export function KartuProfil({
  user,
  memuat,
  terkunci,
  onUbah,
  onSandi,
  onKeluar,
}: {
  user: UserRow | null
  memuat: boolean
  terkunci: boolean
  onUbah: () => void
  onSandi: () => void
  onKeluar: () => void
}) {
  const info = infoLevel(user?.level)
  const alasan = terkunci ? 'Akun demo tidak boleh mengubah profil' : undefined
  return (
    <section className="vsf-card vsf-kartu-profil p-4 sm:p-6" aria-label="Kartu profil">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar nama={user?.username} besar />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-bold text-tinta">
            {memuat && !user ? 'Memuat…' : (user?.username ?? '—')}
          </h2>
          <div className="truncate text-[13px] text-abu">{user?.email || 'Email belum diisi'}</div>
          {user && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <LencanaLevel level={user.level} />
              {user.is_demo ? <LencanaDemo /> : <span className="vsf-master-chip">Akun aktif</span>}
            </div>
          )}
        </div>
      </div>

      {info && (
        <div className="vsf-detail-blok">
          <h3 className="vsf-label-form">Akses {info.label}</h3>
          <ul>
            {info.akses.map((a) => (
              <li key={a}>
                <Ikon nama="centang" className="h-4 w-4" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-garis pt-4">
        <button type="button" className="vsf-btn-primary" disabled={!user || terkunci} title={alasan} onClick={onUbah}>
          <Ikon nama="ubah" className="h-4 w-4" />
          Ubah profil
        </button>
        <button type="button" className="vsf-btn-secondary" disabled={!user || terkunci} title={alasan} onClick={onSandi}>
          <Ikon nama="kunci" className="h-4 w-4" />
          Ganti password
        </button>
        <button type="button" className="vsf-btn-secondary vsf-teks-bahaya ml-auto" onClick={onKeluar}>
          <Ikon nama="keluar" className="h-4 w-4" />
          Keluar
        </button>
      </div>
      {terkunci && <p className="mt-2 text-[12px] text-abu">{alasan}.</p>}
    </section>
  )
}
