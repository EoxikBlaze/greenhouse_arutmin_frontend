import { useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { angkaIsian, LANGKAH, n, potongan, urutKonstanta, type Alat, type Log, type Terkini } from '../../lib/kalibrasi'
import { DialogKaca, Pesan } from '../kaca/DialogKaca'
import { Ikon } from '../Ikon'
import { Isian } from './Isian'

/** Popup Catat kalibrasi: langkah kerja (bisa dilipat) di atas, form di bawah; pH/EC menampilkan konstanta baru setelah simpan. */
export function DialogCatat({ alat, terkini, onSelesai, onTutup }: { alat: Alat; terkini: Terkini | null; onSelesai: () => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const nilaiRef = alat.nilai_ref != null ? String(Number(alat.nilai_ref)) : ''
  const [f, setF] = useState<Record<string, string>>({ buffer1: '6.86', buffer2: '4.00', ref_us_cm: nilaiRef || '1413', nilai_ref: nilaiRef, lulus: '' })
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const [hasil, setHasil] = useState<Log | null>(null)
  const [disalin, setDisalin] = useState(false)
  const [langkahBuka, setLangkahBuka] = useState(true)
  const ubah = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const live = terkini?.sensor ?? null
  const nama = alat.label ?? alat.sensor
  const ambilLive = (k: string, v: number | null | undefined) => (
    <button
      type="button"
      className="vsf-btn-secondary min-h-[44px] sm:min-h-[40px] shrink-0 px-3 text-[12.5px]"
      disabled={v == null}
      onClick={() => setF((s) => ({ ...s, [k]: v == null ? '' : String(v) }))}
      title="Isi dengan bacaan sistem saat ini"
    >
      Ambil bacaan
    </button>
  )

  async function simpan() {
    setSibuk(true)
    setErrs({})
    const body: Record<string, unknown> = { catatan: f.catatan?.trim() || null }
    if (alat.sensor === 'ph') Object.assign(body, { buffer1: angkaIsian(f.buffer1), baca1: angkaIsian(f.baca1 ?? ''), buffer2: angkaIsian(f.buffer2), baca2: angkaIsian(f.baca2 ?? ''), bacaan_sesudah: angkaIsian(f.bacaan_sesudah ?? ''), nilai_ref: angkaIsian(f.buffer1) })
    else if (alat.sensor === 'ec') Object.assign(body, { ref_us_cm: angkaIsian(f.ref_us_cm), baca_ppm: angkaIsian(f.baca_ppm ?? '') })
    else Object.assign(body, { nilai_ref: angkaIsian(f.nilai_ref), bacaan_sebelum: angkaIsian(f.bacaan_sebelum ?? ''), bacaan_sesudah: angkaIsian(f.bacaan_sesudah ?? ''), lulus: f.lulus === '' ? undefined : f.lulus === 'ya' })
    try {
      const r = await api.post(`/kalibrasi/${alat.sensor}`, body)
      const log = (r.data as { data: Log }).data
      if (log.konstanta_baru) setHasil(log)
      else onSelesai()
    } catch (e) {
      const g = handleApiError(e)
      setErrs(Object.keys(g.fieldErrors).length ? g.fieldErrors : { umum: [g.message] })
    } finally {
      setSibuk(false)
    }
  }

  if (hasil?.konstanta_baru) {
    const kode = potongan(hasil.konstanta_baru)
    return (
      <DialogKaca judul="Kalibrasi tersimpan" sub={nama} onTutup={onSelesai} lebar={520}>
        <p className="mt-3 text-[13.5px] text-slate-700">
          Ganti baris berikut di <code className="rounded bg-arutmin-mint/60 px-1">deploy-pi/firmware/sensor/sensor.ino</code>, lalu unggah ulang firmware ke ESP32 sensor.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="vsf-kal-blok p-3">
            <div className="vsf-label">Sebelumnya</div>
            <div className="mt-1 font-mono text-[12.5px] text-tinta">
              {hasil.konstanta_lama ? urutKonstanta(hasil.konstanta_lama).map(([k, v]) => <div key={k}>{k} = {v}</div>) : '—'}
            </div>
          </div>
          <div className="vsf-kal-blok p-3">
            <div className="vsf-label">Baru</div>
            <div className="mt-1 font-mono text-[12.5px] font-semibold text-tinta">
              {urutKonstanta(hasil.konstanta_baru).map(([k, v]) => <div key={k}>{k} = {v}</div>)}
            </div>
          </div>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-std bg-navy p-3 text-[13px] text-emas">{kode}</pre>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="vsf-btn-secondary" onClick={() => { void navigator.clipboard?.writeText(kode).then(() => setDisalin(true)) }}>
            {disalin ? 'Tersalin' : 'Salin kode'}
          </button>
          <button type="button" className="vsf-btn-primary" onClick={onSelesai}>Selesai</button>
        </div>
      </DialogKaca>
    )
  }

  const langkah = LANGKAH[alat.sensor] ?? [alat.metode]
  const e = (k: string) => fieldError(errs, k)
  const adaLive = live && (alat.sensor === 'ph' ? live.ph : alat.sensor === 'ec' ? live.tds : alat.sensor === 'suhu_air' ? live.waterTemp : alat.sensor === 'suhu_udara' ? live.airTemp : null) != null
  return (
    <DialogKaca judul="Catat kalibrasi" sub={nama} onTutup={onTutup} sibuk={sibuk} lebar={560} onSubmit={() => { void simpan() }}>
      <div className="vsf-kal-blok mt-3 p-3">
        <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-[13px] font-bold text-tinta" aria-expanded={langkahBuka} onClick={() => setLangkahBuka((b) => !b)}>
          Langkah kerja
          <Ikon nama="bawah" className={clsx('h-4 w-4 transition-transform', langkahBuka && 'rotate-180')} />
        </button>
        {langkahBuka && (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate-700">
            {langkah.map((l) => <li key={l}>{l}</li>)}
          </ol>
        )}
      </div>
      {adaLive && (
        <div className="mt-3 text-[12.5px] text-abu">
          Bacaan sistem sekarang:{' '}
          <b className="text-tinta">
            {alat.sensor === 'ph' ? `pH ${n(live?.ph)}` : alat.sensor === 'ec' ? `${n(live?.tds, 0)} ppm` : `${n(alat.sensor === 'suhu_air' ? live?.waterTemp : live?.airTemp, 1)} °C`}
          </b>
        </div>
      )}
      <div className="mt-3 grid gap-3">
        {alat.sensor === 'ph' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Isian label="Buffer 1 (pH)" value={f.buffer1} onChange={ubah('buffer1')} galat={e('buffer1')} />
              <Isian label="Bacaan di buffer 1" value={f.baca1 ?? ''} onChange={ubah('baca1')} galat={e('baca1')} contoh="7,06" aksi={ambilLive('baca1', live?.ph)} />
              <Isian label="Buffer 2 (pH)" value={f.buffer2} onChange={ubah('buffer2')} galat={e('buffer2')} />
              <Isian label="Bacaan di buffer 2" value={f.baca2 ?? ''} onChange={ubah('baca2')} galat={e('baca2')} contoh="4,30" aksi={ambilLive('baca2', live?.ph)} />
            </div>
            {e('konstanta') && <div className="text-[12px] text-red-700">{e('konstanta')}</div>}
          </>
        )}
        {alat.sensor === 'ec' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Isian label="Larutan standar (µS/cm)" value={f.ref_us_cm} onChange={ubah('ref_us_cm')} galat={e('ref_us_cm')} />
            <Isian label="Bacaan TDS sistem (ppm)" value={f.baca_ppm ?? ''} onChange={ubah('baca_ppm')} galat={e('baca_ppm') ?? e('konstanta')} contoh="650" aksi={ambilLive('baca_ppm', live?.tds)} />
          </div>
        )}
        {alat.sensor !== 'ph' && alat.sensor !== 'ec' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Isian label={`Nilai referensi${alat.satuan ? ` (${alat.satuan})` : ''}`} value={f.nilai_ref} onChange={ubah('nilai_ref')} galat={e('nilai_ref')} />
              <Isian label="Hasil ukur / bacaan sistem" value={f.bacaan_sesudah ?? ''} onChange={ubah('bacaan_sesudah')} galat={e('bacaan_sesudah')}
                aksi={alat.sensor === 'suhu_air' ? ambilLive('bacaan_sesudah', live?.waterTemp) : alat.sensor === 'suhu_udara' ? ambilLive('bacaan_sesudah', live?.airTemp) : undefined} />
            </div>
            <label className="block text-[13px] font-semibold text-slate-700">
              Hasil
              <select className="vsf-input mt-1 w-full" value={f.lulus} onChange={(ev) => ubah('lulus')(ev.target.value)}>
                <option value="">{alat.toleransi != null ? `Otomatis (lulus bila selisih ≤ ${n(alat.toleransi)})` : 'Tidak dinilai'}</option>
                <option value="ya">Lulus</option>
                <option value="tidak">Tidak lulus — perlu tindakan</option>
              </select>
            </label>
          </>
        )}
        <label className="block text-[13px] font-semibold text-slate-700">
          Catatan (opsional)
          <input className="vsf-input mt-1 w-full" value={f.catatan ?? ''} onChange={(ev) => ubah('catatan')(ev.target.value)} placeholder="mis. buffer baru dibuka, suhu larutan 26 °C" />
        </label>
      </div>
      {errs.umum && <Pesan jenis="galat">{errs.umum[0]}</Pesan>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
        <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : alat.sensor === 'ph' || alat.sensor === 'ec' ? 'Hitung & simpan' : 'Simpan'}</button>
      </div>
    </DialogKaca>
  )
}
