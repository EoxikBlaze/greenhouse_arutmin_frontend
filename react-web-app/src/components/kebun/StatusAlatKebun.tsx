import { useState } from 'react'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import { useApiObject } from '../../lib/useApiObject'
import { Ikon } from '../Ikon'

type Keadaan = {
  mode?: string | null
  siap?: boolean | null
  kurang?: string | null
  kunci?: string | null
  estop?: boolean | null
  target_ppm?: number | null
  ph_min?: number | null
  ph_max?: number | null
}
type Dash = { iotStatus?: { online?: boolean } | null; keadaan_alat?: Keadaan | null }

const koma = (v: number) => String(v).replace('.', ',')

/** Kenapa batch belum dijaga alat (mode bukan SEMAI), dalam bahasa petani. */
function alasan(online: boolean, a: Keadaan | null): string {
  if (!online) return 'alat tidak terhubung ke server'
  if (a?.estop) return 'E-STOP aktif'
  if (a?.siap === false) return `alat belum siap, kurang ${a.kurang || 'konfigurasi'} (isi di Pengaturan Alat)`
  if (a?.mode === 'PANEN') return 'alat dalam mode PANEN'
  return 'alat belum menerima perintah SEMAI'
}

/**
 * Apakah batch di Kebun Saya sedang DIJAGA alat (firmware v6 mode SEMAI) — Perancangan v5.0 §2.2.
 * Bila belum, pengelola bisa meminta server mengirim SEMAI / TARGET lagi (POST /tanam/kirim-alat).
 */
export function StatusAlatKebun({ kelola }: { kelola: boolean }) {
  const handleApiError = useApiError()
  const { data, reload } = useApiObject<Dash>('/dashboard', { pollMs: 30_000 })
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  if (!data) return null
  const online = !!data.iotStatus?.online
  const a = data.keadaan_alat ?? null
  const dijaga = online && a?.mode === 'SEMAI'

  async function kirim() {
    setSibuk(true)
    try {
      const res = await api.post('/tanam/kirim-alat')
      setPesan(String(res.data?.message ?? 'Perintah dikirim ke alat.'))
      reload()
    } catch (err) {
      setPesan(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section
      role="status"
      aria-label="Status penjagaan alat"
      className={`vsf-banner flex flex-wrap items-center gap-x-4 gap-y-2 rounded-input px-4 py-3 text-[13px] ${dijaga ? 'border border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' : 'vsf-tone-warn'}`}
    >
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <Ikon nama={dijaga ? 'centang' : 'peringatan'} className="mt-[1px] h-4 w-4 shrink-0" />
        <span>
          {dijaga ? (
            <>
              <b>Alat sedang menjaga tandon</b>
              {a?.target_ppm != null && ` · target ${a.target_ppm} ppm`}
              {a?.ph_min != null && a?.ph_max != null && ` · pH ${koma(a.ph_min)}–${koma(a.ph_max)}`}
              {a?.kunci && ` · terkunci ${a.kunci}`}
            </>
          ) : (
            <>
              <b>Batch belum dijaga alat:</b> {alasan(online, a)}. Target nutrisi baru tersimpan di web.
            </>
          )}
          {pesan && <span className="block text-[12px] opacity-80">{pesan}</span>}
        </span>
      </span>
      {!dijaga && kelola && online && (
        <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={sibuk} onClick={() => void kirim()}>
          {sibuk ? 'Mengirim…' : 'Kirim ke alat'}
        </button>
      )}
    </section>
  )
}
