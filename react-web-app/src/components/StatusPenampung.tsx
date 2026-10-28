import { useState } from 'react'
import { api } from '../lib/api'
import { useApiError, useApiList } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from './ModalBackdrop'
import { StatusBadge } from './StatusBadge'

/** Baris GET /penampung-states (bigint & numeric datang sebagai teks dari pg). */
type StateRow = {
  id_meja: string | number
  status_lock?: boolean | null
  lock_alasan?: string | null
  lock_sejak?: string | null
  kejadian_dosis_hari?: number | string | null
  volume_ab_hari_ml?: number | string | null
  volume_ph_hari_ml?: number | string | null
  mode_pemeliharaan?: boolean | null
}

type MejaRow = { id_meja: string | number; meja?: string | null }

type Penampung = {
  id: string
  nama: string
  terkunci: boolean
  alasan: string | null
  sejak: string | null
  kejadian: number
  ab: number
  ph: number
  pemeliharaan: boolean
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${jam}`
}

function angka(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Gabungkan status dengan nama meja (cadangan "Penampung #id"). */
function gabung(states: StateRow[], meja: MejaRow[]): Penampung[] {
  const nama = new Map(meja.map((m) => [String(m.id_meja), String(m.meja ?? '')]))
  return states.map((s) => {
    const id = String(s.id_meja)
    return {
      id,
      nama: nama.get(id) || `Penampung #${id}`,
      terkunci: s.status_lock === true,
      alasan: s.lock_alasan ?? null,
      sejak: s.lock_sejak ?? null,
      kejadian: angka(s.kejadian_dosis_hari),
      ab: angka(s.volume_ab_hari_ml),
      ph: angka(s.volume_ph_hari_ml),
      pemeliharaan: s.mode_pemeliharaan === true,
    }
  })
}

/**
 * Status LOCK tiap penampung — GET /penampung-states (polling 10 dtk) + nama dari GET /meja.
 * Tombol "Buka kunci" (POST /api/aktuator/penampung/:id/buka-kunci) hanya untuk admin
 * sungguhan; demo melihat saja (server juga menolak 403).
 */
export function StatusPenampung({ onPesan }: { onPesan: (teks: string, ok: boolean) => void }) {
  const { role, demo } = useAuth()
  const bolehBuka = role === 'admin' && !demo
  const handleApiError = useApiError()

  const { data: states, loading, error, reload } = useApiObject<StateRow[]>('/penampung-states', { pollMs: 10_000 })
  const { rows: meja } = useApiList<MejaRow>('/meja')
  const daftar = gabung(Array.isArray(states) ? states : [], meja)

  const [konfirmasi, setKonfirmasi] = useState<Penampung | null>(null)
  const [membuka, setMembuka] = useState(false)

  async function bukaKunci(p: Penampung) {
    setMembuka(true)
    try {
      await api.post(`/api/aktuator/penampung/${encodeURIComponent(p.id)}/buka-kunci`)
      onPesan(`LOCK ${p.nama} dibuka.`, true)
      setKonfirmasi(null)
    } catch (err) {
      onPesan(handleApiError(err).message, false)
      setKonfirmasi(null)
    } finally {
      setMembuka(false)
      reload()
    }
  }

  return (
    <section className="vsf-card p-4">
      <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Status penampung</div>
      {error && !states ? (
        <div role="alert" className="mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px]">
          {error}
        </div>
      ) : loading && !states ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <span className="vsf-skeleton block h-[112px]" />
          <span className="vsf-skeleton block h-[112px]" />
        </div>
      ) : daftar.length === 0 ? (
        <div className="mt-3 text-[13px] text-slate-500">Belum ada data penampung.</div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 vsf-stagger">
          {daftar.map((p) => (
            <div
              key={p.id}
              className={`rounded-card border bg-white p-4 transition hover:shadow-sm ${
                p.terkunci ? 'border-red-600/40' : 'border-arutmin-border hover:border-arutmin-moss/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold text-slate-900">{p.nama}</div>
                <StatusBadge tone={p.terkunci ? 'offline' : 'online'} label={p.terkunci ? 'LOCK' : 'Aman'} />
              </div>
              {p.terkunci && (
                <div className="mt-2 text-[12px] text-red-700">
                  {p.alasan || 'Tanpa alasan'} · sejak {tgl(p.sejak)}
                </div>
              )}
              <div className="mt-1 text-[12px] text-slate-600 tabular-nums">
                Hari ini: {p.kejadian} kejadian · AB {p.ab.toFixed(1)} mL · pH {p.ph.toFixed(1)} mL
                {p.pemeliharaan ? ' · pemeliharaan' : ''}
              </div>
              {p.terkunci && bolehBuka && (
                <button
                  type="button"
                  className="vsf-input mt-3 rounded-full font-semibold disabled:opacity-50"
                  disabled={membuka}
                  onClick={() => setKonfirmasi(p)}
                >
                  Buka kunci
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!bolehBuka && daftar.some((p) => p.terkunci) && (
        <div className="mt-2 text-[12px] text-slate-500">Hanya admin yang dapat membuka LOCK.</div>
      )}
      {konfirmasi && (
        <DialogBukaKunci
          p={konfirmasi}
          membuka={membuka}
          onBatal={() => setKonfirmasi(null)}
          onYa={() => void bukaKunci(konfirmasi)}
        />
      )}
    </section>
  )
}

function DialogBukaKunci({
  p,
  membuka,
  onBatal,
  onYa,
}: {
  p: Penampung
  membuka: boolean
  onBatal: () => void
  onYa: () => void
}) {
  const { dialogRef, onKeyDown, backdropProps, closing, handleClose } = useDialog({
    open: true,
    onClose: onBatal,
    closeDisabled: membuka,
  })

  return (
    <ModalBackdrop onMouseDown={backdropProps.onMouseDown} closing={closing}>
      <div
        ref={dialogRef}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vsf-buka-kunci-title"
        className={`vsf-modal-card w-full max-w-[440px] rounded-lg border border-garis bg-white p-5${closing ? ' is-closing' : ''}`}
      >
        <div id="vsf-buka-kunci-title" data-dialog-title tabIndex={-1} className="vsf-eyebrow outline-none">
          Buka kunci {p.nama}?
        </div>
        <p className="mt-3 text-[13px] text-slate-700 leading-relaxed">
          Periksa penyebab LOCK dulu (<b>{p.alasan || 'tanpa alasan'}</b>): selang, pompa, stok larutan, dan sensor.
          Hitungan dosis hari ini tidak direset.
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
          <button type="button" className="vsf-btn-secondary" disabled={membuka} onClick={handleClose}>
            Batal
          </button>
          <button type="button" className="vsf-btn-primary" disabled={membuka} onClick={onYa}>
            {membuka && <span className="vsf-spinner" aria-hidden />}
            {membuka ? 'Membuka…' : 'Buka kunci'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}
