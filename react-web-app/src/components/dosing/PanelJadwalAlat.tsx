import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import { tglJam } from '../../lib/format'
import { kalimatHasil, useHasilPerintah } from '../../lib/useHasilPerintah'
import type { JadwalAlat } from '../../lib/iotV41'
import { Pesan } from '../kaca/DialogKaca'

const LABEL_JADWAL: Record<string, string> = {
  interval_sensor_detik: 'Interval baca sensor',
  jeda_ab_detik: 'Jeda pompa A → B',
  isi_air_maks_detik: 'Batas waktu isi air',
}

/**
 * Jadwal operasi di ESP32 (NVS "garap_jdw"): sumbernya tab "Jadwal operasi" (timing_operasi), dikirim dengan perintah JADWAL.
 * Hanya waktu operasi — tidak menyalakan pompa dan tidak membuka gerbang dosing.
 */
export function PanelJadwalAlat({ jadwal, onReload }: { jadwal: JadwalAlat | null | undefined; onReload: () => void }) {
  const { role } = useAuth()
  const handleApiError = useApiError()
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [catatan, setCatatan] = useState<string | null>(null)
  const [idKirim, setIdKirim] = useState<number | string | null>(null)
  const hasil = useHasilPerintah(idKirim)

  async function kirim() {
    if (sibuk) return
    setSibuk(true)
    setGalat(null)
    setCatatan(null)
    try {
      const r = await api.post('/iot-v41/jadwal-alat')
      const d = r.data as { id_perintah: number | string; message: string; dijepit?: Array<{ param: string; diminta_detik: number; dikirim_detik: number }> }
      setIdKirim(d.id_perintah)
      const jepit = (d.dijepit ?? []).map((x) => `${x.param}: ${x.diminta_detik} → ${x.dikirim_detik} dtk (batas firmware)`).join('; ')
      setCatatan(jepit ? `${d.message} Dijepit: ${jepit}.` : d.message)
      onReload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  const tersimpan = jadwal?.status === 'selesai'
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Jadwal operasi di ESP32">
      <div className="vsf-judul-bagian">Jadwal operasi di ESP32</div>
      <p className="mt-0.5 text-[13px] text-abu">
        Disimpan permanen di memori NVS ESP32 sehingga tetap berlaku setelah restart atau listrik padam. Sumber nilainya tab Jadwal operasi di atas.
      </p>
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
      {catatan && <Pesan jenis="ok">{catatan}</Pesan>}
      {idKirim != null && <Pesan jenis={hasil?.status === 'gagal' || hasil?.status === 'kedaluwarsa' ? 'galat' : 'ok'}>Status di alat: {kalimatHasil(hasil)}</Pesan>}

      {!jadwal ? (
        <div className="vsf-blok mt-3 px-4 py-5 text-center text-[13px] text-abu">Belum pernah dikirim ke alat. ESP32 memakai jadwal bawaan firmware.</div>
      ) : (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-3">
          {Object.entries(jadwal.parameter ?? {}).map(([k, v]) => (
            <div key={k} className="vsf-stat">
              <dt className="vsf-label">{LABEL_JADWAL[k] ?? k}</dt>
              <dd className="mt-0.5 font-bold tabular-nums text-tinta">{v} detik</dd>
            </div>
          ))}
          <div className="vsf-stat sm:col-span-3">
            <dt className="vsf-label">Status pengiriman terakhir</dt>
            <dd className="mt-0.5 text-tinta">
              <span className={`vsf-chip-nilai ${tersimpan ? 'is-normal' : 'is-kosong'}`}>{tersimpan ? 'tersimpan di alat' : jadwal.status}</span>{' '}
              dikirim {tglJam(jadwal.dibuat_pada)}
              {jadwal.selesai_pada ? ` · dilaporkan alat ${tglJam(jadwal.selesai_pada)}` : ' · belum ada laporan alat'}
              {jadwal.hasil?.alasan ? ` · ${jadwal.hasil.alasan}` : ''}
            </dd>
          </div>
        </dl>
      )}

      {role === 'admin' && (
        <button type="button" className="vsf-btn-primary mt-3" disabled={sibuk} onClick={() => void kirim()}>
          {sibuk && <span className="vsf-spinner" aria-hidden />}
          Simpan jadwal ke ESP32
        </button>
      )}
    </section>
  )
}
