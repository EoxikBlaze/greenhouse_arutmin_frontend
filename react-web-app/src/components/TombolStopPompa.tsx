import { useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { kalimatHasil, useHasilPerintah } from '../lib/useHasilPerintah'
import { DialogKonfirmasi, Pesan } from './kaca/DialogKaca'

/**
 * STOP semua pompa: POST /iot-v41/stop.
 * Balasan 202 = perintah masuk antrean; status dipantau via useHasilPerintah sampai ESP32 mengonfirmasi.
 * Bukan pengganti tombol E-STOP fisik (GPIO 36).
 */
export function TombolStopPompa() {
  const handleApiError = useApiError()
  const [tanya, setTanya] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [idPerintah, setIdPerintah] = useState<number | string | null>(null)
  const hasil = useHasilPerintah(idPerintah)

  const kirim = async () => {
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const r = await api.post('/iot-v41/stop', {})
      const d = (r.data ?? {}) as { id_perintah?: number | string | null; message?: string }
      setIdPerintah(d.id_perintah ?? null)
      setPesan(String(d.message ?? 'Perintah STOP masuk antrean. Menunggu konfirmasi alat.'))
      setTanya(false)
    } catch (e) {
      setGalat(`${handleApiError(e).message} Gunakan tombol E-STOP fisik bila perlu.`)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card flex w-full min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-5" aria-label="Hentikan semua pompa">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h2 className="text-[15px] font-semibold text-tinta">Hentikan semua pompa (STOP)</h2>
          <p className="mt-0.5 text-[13px] text-abu">
            Mengirim perintah STOP ke ESP32 melalui antrean. Tombol ini <b>bukan pengganti E-STOP fisik</b> di box panel (GPIO 36) untuk keadaan darurat.
          </p>
        </div>
        {pesan && !idPerintah && <Pesan jenis="ok">{pesan}</Pesan>}
        {idPerintah && (
          <Pesan jenis={hasil?.status === 'gagal' || hasil?.status === 'kedaluwarsa' ? 'galat' : 'ok'}>
            STOP pompa (#{idPerintah}): {kalimatHasil(hasil)}
          </Pesan>
        )}
      </div>
      <button type="button" className="vsf-btn-danger shrink-0" onClick={() => { setGalat(null); setTanya(true) }}>
        STOP pompa
      </button>
      {tanya && (
        <DialogKonfirmasi
          judul="Hentikan semua pompa?"
          ya="Ya, kirim STOP"
          bahaya
          sibuk={sibuk}
          galat={galat ?? undefined}
          onYa={() => void kirim()}
          onBatal={() => setTanya(false)}
        >
          Perintah STOP akan dimasukkan ke antrean untuk ESP32. Pompa baru dipastikan mati setelah alat mengirim konfirmasi selesai. Untuk darurat segera, tekan tombol E-STOP fisik di box panel.
        </DialogKonfirmasi>
      )}
    </section>
  )
}

