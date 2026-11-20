import { useState } from 'react'
import { api } from '../../lib/api'
import type { RentangMs } from '../../lib/riwayatSensor'
import { unduhPaketRiset, type PaketRiset } from '../../lib/paketRiset'

/** Paket data riset: satu berkas .xlsx berisi data sensor, dosing, kalibrasi, batch, ambang, dan versi firmware, dengan petunjuk membaca. */
export function PanelDataRiset({ r, bolehUnduh }: { r: RentangMs | null; bolehUnduh: boolean }) {
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function unduh() {
    if (!r || sibuk) return
    setSibuk(true)
    setGalat(null)
    setInfo(null)
    try {
      const akhir = r.live ? Date.now() : r.sampai
      const res = await api.get('/api/analisis/paket-riset', { params: { dari: new Date(r.dari).toISOString(), sampai: new Date(akhir).toISOString() }, timeout: 60_000 })
      const paket = res.data as PaketRiset
      if (!paket.sensor.length && !paket.dosing.length) {
        setGalat('Tidak ada data pada rentang ini, jadi belum ada yang bisa diunduh.')
        return
      }
      await unduhPaketRiset(paket, r.dari, akhir)
      setInfo(`Berkas dibuat: ${paket.sensor.length.toLocaleString('id-ID')} baris sensor, ${paket.dosing.length} kejadian dosing, ${paket.kalibrasi.length} catatan kalibrasi, ${paket.batch.length} batch.${paket.metadata.terpotong ? ' Data sensor dipotong di batas baris; persempit rentang untuk yang lebih lama.' : ''}`)
    } catch (err) {
      setGalat((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Paket gagal dibuat. Coba lagi atau persempit rentang.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card p-4 sm:p-5" aria-label="Paket data riset">
      <div className="vsf-judul-bagian">Paket data riset</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-abu">
        Satu berkas Excel yang bisa dianalisis ulang oleh orang lain: data sensor (rata-rata 5 menit), kejadian dosing, <b>riwayat kalibrasi</b>, batch beserta
        hasil panen, batas aman, dan versi firmware, lengkap dengan lembar petunjuk cara membacanya. Menyertakan kalibrasi dan firmware membuat data bisa
        dipertanggungjawabkan.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[12.5px] text-tinta">
        <li>Rentang mengikuti pengatur waktu di atas halaman.</li>
        <li>Maksimal 30.000 baris sensor (sekitar 100 hari pada interval 5 menit).</li>
        <li>Takaran dosing (mL) tidak ada karena tidak dilaporkan alat; yang ada waktu kejadiannya.</li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="vsf-btn-primary" disabled={!r || sibuk || !bolehUnduh} onClick={() => void unduh()}>
          {sibuk && <span className="vsf-spinner" aria-hidden />}
          {sibuk ? 'Menyiapkan paket…' : 'Unduh paket data (.xlsx)'}
        </button>
        {!bolehUnduh && <span className="text-[12px] text-abu">Hanya untuk pengelola.</span>}
      </div>
      {galat && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      {info && <div role="status" className="mt-3 text-[12.5px] text-tinta">{info}</div>}
    </section>
  )
}
