import { useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { DialogKonfirmasi, Pesan } from './kaca/DialogKaca'

/** STOP semua pompa: POST /iot-v41/stop. Balasan = perintah diantre, belum tentu pompa sudah mati. */
export function TombolStopPompa() {
  const handleApiError = useApiError()
  const [tanya, setTanya] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const kirim = async () => {
    setSibuk(true)
    setGalat(null)
    try {
      const r = await api.post('/iot-v41/stop', {})
      setPesan(String(r.data?.message ?? 'Perintah STOP masuk antrean.'))
      setTanya(false)
    } catch (e) {
      setGalat(`${handleApiError(e).message} Gunakan tombol darurat fisik bila perlu.`)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card flex w-full min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-tinta">Hentikan semua pompa</h2>
        <p className="mt-0.5 text-[13px] text-abu">Mengirim perintah STOP ke alat. Untuk keadaan darurat, tekan tombol E-STOP fisik.</p>
        {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      </div>
      <button type="button" className="vsf-btn-danger" onClick={() => setTanya(true)}>
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
          Perintah STOP dikirim ke alat. Pompa baru dipastikan mati setelah alat mengonfirmasi.
        </DialogKonfirmasi>
      )}
    </section>
  )
}
