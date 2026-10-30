import { infoLevel, type UserRow } from '../../lib/pengguna'
import { Ikon } from '../Ikon'
import { DialogKaca } from '../kaca/DialogKaca'
import { Avatar, LencanaDemo, LencanaLevel } from './Penanda'

/** Popup detail: identitas + akses level. `terkunci` = akun demo (backend menolak tulis). */
export function DialogDetailUser({
  user,
  sendiri,
  terkunci,
  onTutup,
  onUbah,
  onHapus,
}: {
  user: UserRow
  sendiri: boolean
  terkunci: boolean
  onTutup: () => void
  onUbah: () => void
  onHapus?: () => void
}) {
  const info = infoLevel(user.level)
  const alasan = terkunci ? 'Akun demo tidak boleh mengelola user' : undefined
  return (
    <DialogKaca judul="Detail User" lebar={440} onTutup={onTutup}>
      <div className="mt-4 flex items-center gap-3">
        <Avatar nama={user.username} besar />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-bold text-tinta">
            {user.username}
            {sendiri && <span className="ml-2 text-[12px] font-normal text-abu">(Anda)</span>}
          </div>
          <div className="truncate text-[13px] text-abu">{user.email || 'Email belum diisi'}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <LencanaLevel level={user.level} />
            {user.is_demo && <LencanaDemo />}
          </div>
        </div>
      </div>

      <section className="vsf-detail-blok">
        <h3 className="vsf-label-form">Akses {info?.label ?? 'akun ini'}</h3>
        {info ? (
          <ul>
            {info.akses.map((a) => (
              <li key={a}>
                <Ikon nama="centang" className="h-4 w-4" />
                {a}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-abu">Level tidak dikenal.</p>
        )}
      </section>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-garis pt-4">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup}>
          Tutup
        </button>
        {onHapus && (
          <button
            type="button"
            className="vsf-btn-secondary vsf-teks-bahaya"
            disabled={terkunci}
            title={alasan}
            onClick={onHapus}
          >
            <Ikon nama="hapus" className="h-4 w-4" />
            Hapus
          </button>
        )}
        <button type="button" className="vsf-btn-primary" disabled={terkunci} title={alasan} onClick={onUbah}>
          <Ikon nama="ubah" className="h-4 w-4" />
          Ubah
        </button>
      </div>
    </DialogKaca>
  )
}
