import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { fieldError, useApiError } from '../../lib/crudApi'
import {
  belumDiatur,
  cocok,
  judulParam,
  kelompokkan,
  kelompokParam,
  tampilNilai,
  type Daftar,
  type ParameterRow,
} from '../../lib/dosing'
import { Ikon } from '../Ikon'
import { Segmen } from '../sensor/FilterBar'
import { DialogKaca, Kosong, Pesan, Rangka } from './DialogKaca'

type Sumber = 'Dosing' | 'Timing'
const SUMBER: readonly Sumber[] = ['Dosing', 'Timing']
const PATH: Record<Sumber, string> = { Dosing: '/konfigurasi-dosis', Timing: '/timing-operasi' }
const URUT: Record<Sumber, string[]> = {
  Dosing: ['Batas dosis', 'Batas harian', 'Percobaan ulang', 'Pita mati & kestabilan', 'Kalibrasi & konversi', 'Sistem'],
  Timing: ['Pembacaan sensor', 'Ronde & jeda dosing', 'Pengisian air', 'Konfirmasi', 'Sistem'],
}
const KETERANGAN: Record<Sumber, string> = {
  Dosing: 'Batas dan angka racikan yang dipakai pompa dosing.',
  Timing: 'Durasi dan jeda operasi pompa, sensor, dan pengisian.',
}

/** Panel Parameter: parameter dosing + timing operasi sebagai kartu, dikelompokkan dan bisa dicari. Ubah nilai = admin. */
export function PanelParameter({ dosis, timing }: { dosis: Daftar<ParameterRow>; timing: Daftar<ParameterRow> }) {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()
  const [sumber, setSumber] = useState<Sumber>('Dosing')
  const [cari, setCari] = useState('')
  const [edit, setEdit] = useState<ParameterRow | null>(null)
  const [nilai, setNilai] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [catatan, setCatatan] = useState<string | null>(null)

  const aktif = sumber === 'Dosing' ? dosis : timing

  useEffect(() => {
    if (!catatan) return
    const id = window.setTimeout(() => setCatatan(null), 4000)
    return () => window.clearTimeout(id)
  }, [catatan])

  const grup = useMemo(
    () =>
      kelompokkan(
        aktif.rows.filter((r) => cocok(cari, r.param, judulParam(r.param), r.keterangan, kelompokParam(r.param))),
        (r) => kelompokParam(r.param),
        URUT[sumber],
      ),
    [aktif.rows, cari, sumber],
  )
  const tampil = grup.reduce((a, [, r]) => a + r.length, 0)

  function buka(r: ParameterRow) {
    setEdit(r)
    setNilai(belumDiatur(r.nilai) ? '' : String(Number(r.nilai)))
    setGalat(null)
    setCatatan(null)
  }

  async function simpan() {
    if (!edit || sibuk) return
    const teks = nilai.trim().replace(',', '.')
    const n = Number(teks)
    if (!teks || !Number.isFinite(n)) return setGalat('Nilai harus berupa angka.')
    if (n < 0) return setGalat('Nilai tidak boleh negatif.')
    setSibuk(true)
    setGalat(null)
    try {
      await api.put(`${PATH[sumber]}/${encodeURIComponent(edit.param)}`, { nilai: n })
      setCatatan(`${judulParam(edit.param)} diperbarui menjadi ${tampilNilai(n)}${edit.satuan ? ` ${edit.satuan}` : ''}.`)
      setEdit(null)
      aktif.reload()
    } catch (err) {
      const f = handleApiError(err)
      setGalat(fieldError(f.fieldErrors, 'nilai') ?? f.message)
      if (f.status === 404) {
        setEdit(null)
        aktif.reload()
      }
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Parameter">
      <div className="flex flex-wrap items-center gap-3">
        <Segmen label="Jenis parameter" pilihan={SUMBER} nilai={sumber} onPilih={(s) => setSumber(s)} />
        <label className="vsf-cari">
          <Ikon nama="cari" className="h-4 w-4" />
          <input
            type="search"
            className="vsf-input"
            placeholder="Cari parameter…"
            aria-label="Cari parameter"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </label>
        <button type="button" className="vsf-btn-secondary ml-auto" onClick={aktif.reload} disabled={aktif.loading}>
          <Ikon nama="siklus" className="h-4 w-4" />
          Muat ulang
        </button>
      </div>
      <p className="mt-2 text-[13px] text-abu">
        {KETERANGAN[sumber]} {aktif.loading ? '' : `${tampil} dari ${aktif.rows.length} parameter.`}
        {!bolehUbah && ' Hanya admin yang dapat mengubah nilai.'}
      </p>

      {catatan && <Pesan jenis="ok">{catatan}</Pesan>}
      {aktif.error && !aktif.loading && <Pesan jenis="galat">{aktif.error}</Pesan>}

      {aktif.loading && aktif.rows.length === 0 ? (
        <Rangka />
      ) : tampil === 0 ? (
        <Kosong>{cari ? `Tidak ada parameter yang cocok dengan “${cari}”.` : 'Server belum mengirim parameter untuk modul ini.'}</Kosong>
      ) : (
        <div className="mt-4">
          {grup.map(([nama, rows]) => (
            <div key={nama}>
              <div className="vsf-grup">
                {nama} <span>{rows.length}</span>
              </div>
              <div className="vsf-daftar">
                {rows.map((r) => {
                  const kosong = belumDiatur(r.nilai)
                  return (
                    <div
                      key={r.param}
                      className={clsx('vsf-param', kosong && 'is-kosong')}
                      style={{ ['--kolom' as string]: 'minmax(0,1.5fr) minmax(110px,.7fr) minmax(0,2fr) 88px' }}
                    >
                      <div className="vsf-param-sel">
                        <b>{judulParam(r.param)}</b>
                        <code className="vsf-param-kode">{r.param}</code>
                      </div>
                      <div className="vsf-param-sel">
                        {kosong ? (
                          <span className="vsf-chip-nilai is-luar">Belum diatur</span>
                        ) : (
                          <span className="vsf-param-nilai">
                            {tampilNilai(r.nilai)}
                            {r.satuan && <small>{r.satuan}</small>}
                          </span>
                        )}
                      </div>
                      <div className="vsf-param-sel text-abu">{r.keterangan ?? '—'}</div>
                      <div className="vsf-param-sel md:text-right">
                        {bolehUbah && (
                          <button
                            type="button"
                            className="vsf-btn-secondary !min-h-[40px] !px-3 text-[13px]"
                            aria-label={`Ubah ${judulParam(r.param)}`}
                            onClick={() => buka(r)}
                          >
                            <Ikon nama="ubah" className="h-4 w-4" />
                            Ubah
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <DialogKaca
          judul={`Ubah ${judulParam(edit.param)}`}
          sub={<code className="text-[12px]">{edit.param}</code>}
          onTutup={() => setEdit(null)}
          sibuk={sibuk}
          onSubmit={() => void simpan()}
        >
          {edit.keterangan && <p className="mt-3 text-[13px] leading-relaxed text-abu">{edit.keterangan}</p>}
          <div className="vsf-ringkasan-form mt-3">
            <Ikon nama="info" className="h-4 w-4" />
            <span>
              Nilai sekarang: <b>{tampilNilai(edit.nilai)}</b>
              {edit.satuan ? ` ${edit.satuan}` : ''}
            </span>
          </div>
          {galat && (
            <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">
              {galat}
            </div>
          )}
          <label className="mt-3 block">
            <span className="vsf-label !text-tinta">Nilai baru</span>
            <span className="relative mt-1 block">
              <input
                className="vsf-input w-full pr-20"
                inputMode="decimal"
                autoFocus
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                aria-invalid={galat ? true : undefined}
              />
              {edit.satuan && <span className="vsf-suffix">{edit.satuan}</span>}
            </span>
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className="vsf-btn-secondary" onClick={() => setEdit(null)} disabled={sibuk}>
              Batal
            </button>
            <button type="submit" className="vsf-btn-primary" disabled={sibuk}>
              {sibuk && <span className="vsf-spinner" aria-hidden />}
              {sibuk ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </DialogKaca>
      )}
    </section>
  )
}
