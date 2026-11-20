import { useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { useKeselamatan } from '../lib/keselamatan'
import { DialogKonfirmasi, Pesan } from './kaca/DialogKaca'

/**
 * E-STOP dari web (admin): POST /api/aktuator/estop mengunci semua pompa di server dan alat; detak server tiap 5 dtk
 * membawa status E-STOP ke alat. Reset: POST /api/aktuator/estop/reset. Tombol E-STOP fisik di box panel tetap yang utama:
 * bila ia masih ditekan, reset dari web tidak melepaskannya.
 */
export function TombolEstop() {
  const handleApiError = useApiError()
  const k = useKeselamatan()
  const aktifServer = Boolean(k.data?.estop_server)
  const fisik = Boolean(k.data?.estop_fisik)
  const [tanya, setTanya] = useState<'estop' | 'reset' | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const kirim = async (aksi: 'estop' | 'reset') => {
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      await api.post(aksi === 'estop' ? '/api/aktuator/estop' : '/api/aktuator/estop/reset', {})
      setPesan(aksi === 'estop'
        ? 'E-STOP dikirim. Alat menerimanya dalam beberapa detik (lewat detak server). Pastikan semua pompa benar-benar mati.'
        : 'E-STOP server dilepas. Alat melepasnya dalam beberapa detik, dan otomasi berjalan lagi sesuai saklar.')
      setTanya(null)
      k.reload()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card flex w-full min-w-0 flex-wrap items-center justify-between gap-3 p-4 sm:p-5" aria-label="E-STOP">
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h2 className="text-[15px] font-semibold text-tinta">E-STOP {aktifServer ? '(AKTIF)' : ''}</h2>
          <p className="mt-0.5 text-[13px] text-abu">
            Mematikan dan mengunci semua pompa, dan menolak perintah berisiko sampai di-reset. Bedanya dengan STOP: E-STOP <b>menahan</b> sampai Anda reset.
            Tombol E-STOP fisik di box panel tetap yang utama untuk keadaan darurat.
          </p>
          {fisik && <p className="mt-1 text-[12.5px] font-semibold text-red-700">Tombol E-STOP fisik sedang ditekan. Reset dari web tidak melepasnya; lepas tombolnya di box panel.</p>}
        </div>
        {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
        {galat && !tanya && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
      </div>
      {aktifServer ? (
        <button type="button" className="vsf-btn-secondary shrink-0" onClick={() => { setGalat(null); setTanya('reset') }}>Reset E-STOP</button>
      ) : (
        <button type="button" className="vsf-btn-danger shrink-0" onClick={() => { setGalat(null); setTanya('estop') }}>E-STOP</button>
      )}
      {tanya && (
        <DialogKonfirmasi
          judul={tanya === 'estop' ? 'Aktifkan E-STOP?' : 'Reset E-STOP?'}
          ya={tanya === 'estop' ? 'Ya, E-STOP' : 'Ya, reset'}
          bahaya={tanya === 'estop'}
          sibuk={sibuk}
          galat={galat ?? undefined}
          onYa={() => void kirim(tanya)}
          onBatal={() => setTanya(null)}
        >
          {tanya === 'estop'
            ? 'Semua pompa dimatikan dan dikunci sampai Anda mereset E-STOP. Alat menerima perintah dalam beberapa detik. Untuk darurat segera, tekan tombol E-STOP fisik di box panel.'
            : 'Pastikan penyebab E-STOP sudah diperiksa dan area aman. Setelah reset, otomasi alat berjalan lagi sesuai saklar.'}
        </DialogKonfirmasi>
      )}
    </section>
  )
}
