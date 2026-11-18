import { useState } from 'react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { fieldError, useApiError } from '../../lib/crudApi'
import { useApiObject } from '../../lib/useApiObject'
import { FieldError } from '../CrudScreen'
import { Ikon } from '../Ikon'
import { DialogKaca } from '../kaca/DialogKaca'
import { tanggalIso, tglPendek } from '../../lib/format'
import { perkiraanSelesai } from '../../lib/kebun'

/** GET /tanam/pilihan — bisa dibaca semua role; durasi tiap tahap dari tabel sikluses (null = belum diisi admin). */
type Pilihan = {
  tanaman: Array<{
    id: number | string
    nama: string
    id_meja: number | string | null
    semai: number | string | null
    /** Kurva naik harian tanaman (disalin ke batch saat mulai; boleh diubah di sini). */
    ppm_awal?: number | string | null
    ppm_target?: number | string | null
    hari_capai?: number | string | null
  }>
  meja: Array<{ id: number | string; nama: string }>
}

const LANGKAH = 10

/**
 * Form "Mulai Semai Baru" — body POST /tanam/mulai: id_tanaman · id_meja · jumlah_benih · tgl_awal_semai · keterangan
 * · ppm_awal · ppm_target · hari_capai (kurva nutrisi batch). Siklus Semai diisi otomatis server.
 * Server menyalin kurva ke batch lalu mengirim SEMAI ke alat; jawaban `alat.ket` ditampilkan ke petani.
 */
export function DialogMulaiSemai({ onClose, onSukses }: { onClose: () => void; onSukses: (pesan: string) => void }) {
  const handleApiError = useApiError()
  const { data, loading, error } = useApiObject<Pilihan>('/tanam/pilihan')
  const tanamanList = data?.tanaman ?? []
  const mejaList = data?.meja ?? []

  const [idTanaman, setIdTanaman] = useState('')
  const [idMeja, setIdMeja] = useState('')
  const [mejaManual, setMejaManual] = useState(false)
  const [jumlah, setJumlah] = useState('100')
  const [tgl, setTgl] = useState(() => tanggalIso(Date.now()))
  const [ket, setKet] = useState('')
  const [kurva, setKurva] = useState({ ppm_awal: '', ppm_target: '', hari_capai: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const terpilih = tanamanList.find((t) => String(t.id) === idTanaman) ?? null
  const mejaTerpilih = mejaList.find((m) => String(m.id) === idMeja) ?? null
  const durasi = terpilih?.semai == null ? null : Number(terpilih.semai)
  const selesai = perkiraanSelesai(tgl, durasi)
  const n = /^\d+$/.test(jumlah.trim()) ? Number(jumlah.trim()) : null

  function pilihTanaman(t: Pilihan['tanaman'][number]) {
    setIdTanaman(String(t.id))
    // Meja bawaan tanaman mengisi otomatis, kecuali pengguna sudah memilih meja sendiri.
    if (!mejaManual) setIdMeja(t.id_meja == null ? '' : String(t.id_meja))
    const teks = (v: unknown) => (v == null ? '' : String(v))
    setKurva({ ppm_awal: teks(t.ppm_awal), ppm_target: teks(t.ppm_target), hari_capai: teks(t.hari_capai) })
    setFieldErrors((e) => ({ ...e, id_tanaman: [] }))
  }

  function ubahJumlah(selisih: number) {
    setJumlah(String(Math.max(1, (n ?? 0) + selisih)))
  }

  function validate(): Record<string, string[]> {
    const errs: Record<string, string[]> = {}
    if (!idTanaman) errs.id_tanaman = ['Pilih tanaman dulu.']
    if (n === null) errs.jumlah_benih = ['Isi jumlah benih dengan bilangan bulat.']
    else if (n < 1) errs.jumlah_benih = ['Jumlah benih minimal 1.']
    return errs
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { id_tanaman: Number(idTanaman), jumlah_benih: n }
      if (idMeja) payload.id_meja = Number(idMeja)
      if (tgl) payload.tgl_awal_semai = tgl
      if (ket.trim()) payload.keterangan = ket.trim()
      for (const [k, v] of Object.entries(kurva)) if (v.trim()) payload[k] = Number(v.trim())
      const res = await api.post('/tanam/mulai', payload)
      const body = res.data as { message?: string; data?: { id_semai?: string | number }; alat?: { ket?: string } } | null
      const id = body?.data?.id_semai
      const alat = body?.alat?.ket ? ` Alat: ${body.alat.ket}.` : ''
      onSukses(`${body?.message ?? 'Tanam baru dimulai.'}${id ? ` (semai #${id})` : ''}${alat}`)
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
    } finally {
      setSubmitting(false)
    }
  }

  const ringkasan = [
    terpilih?.nama,
    n !== null && n > 0 ? `${n} benih` : null,
    mejaTerpilih?.nama,
    durasi !== null ? `Semai ${durasi} hari${selesai !== null ? `, selesai ±${tglPendek(selesai)}` : ''}` : null,
  ].filter(Boolean)

  return (
    <DialogKaca judul="Mulai semai baru" sub="Pilih tanaman, isi jumlah benih, lalu mulai." onTutup={onClose} sibuk={submitting} lebar={560} onSubmit={() => void save()}>
        {(formError || error) && (
          <div role="alert" className="vsf-banner vsf-tone-error mt-4 rounded-std px-3 py-2 text-[13px]">
            {formError ?? error}
          </div>
        )}

        <fieldset className="mt-5 min-w-0">
          <legend className="vsf-label vsf-label-tinta">Tanaman *</legend>
          {loading && tanamanList.length === 0 ? (
            <div className="vsf-skeleton mt-2 h-[72px] rounded-card" />
          ) : (
            <div role="radiogroup" aria-label="Tanaman" className="vsf-pilih-grid mt-2">
              {tanamanList.map((t) => {
                const d = t.semai == null ? null : Number(t.semai)
                return (
                  <button
                    key={String(t.id)}
                    type="button"
                    role="radio"
                    aria-checked={String(t.id) === idTanaman}
                    className="vsf-pilih"
                    onClick={() => pilihTanaman(t)}
                  >
                    <b>{t.nama}</b>
                    <small>{d === null ? 'durasi belum diatur' : `Semai ${d} hari`}</small>
                  </button>
                )
              })}
            </div>
          )}
          <FieldError message={fieldError(fieldErrors, 'id_tanaman')} />
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="vsf-label vsf-label-tinta">Meja tanam</span>
            <select
              className="vsf-input mt-1 w-full"
              value={idMeja}
              onChange={(e) => {
                setIdMeja(e.target.value)
                setMejaManual(true)
              }}
            >
              <option value="">— belum dipilih —</option>
              {mejaList.map((m) => (
                <option key={String(m.id)} value={String(m.id)}>
                  {m.nama}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="vsf-label vsf-label-tinta">Tanggal mulai semai</span>
            <input className="vsf-input mt-1 w-full" type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} />
            <FieldError message={fieldError(fieldErrors, 'tgl_awal_semai')} />
          </label>
        </div>

        <div className="mt-4">
          <span className="vsf-label block vsf-label-tinta" id="vsf-jumlah-label">
            Jumlah benih *
          </span>
          <div className="vsf-stepper mt-1">
            <button type="button" aria-label={`Kurangi ${LANGKAH}`} onClick={() => ubahJumlah(-LANGKAH)} disabled={(n ?? 0) <= 1}>
              −
            </button>
            <input
              aria-labelledby="vsf-jumlah-label"
              inputMode="numeric"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
            />
            <button type="button" aria-label={`Tambah ${LANGKAH}`} onClick={() => ubahJumlah(LANGKAH)}>
              +
            </button>
          </div>
          <FieldError message={fieldError(fieldErrors, 'jumlah_benih')} />
        </div>

        {terpilih && (
          <fieldset className="mt-4 min-w-0">
            <legend className="vsf-label vsf-label-tinta">Target nutrisi batch ini</legend>
            <p className="mt-1 text-[12px] text-abu">
              Dari kurva {terpilih.nama}. ppm naik rata sejak pindah netpot sampai hari capai, lalu ditahan sampai panen. Boleh diubah untuk batch ini saja.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ['ppm_awal', 'ppm awal'],
                  ['ppm_target', 'ppm target'],
                  ['hari_capai', 'hari capai'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-[12px] text-abu">{label}</span>
                  <input
                    className="vsf-input mt-1 w-full"
                    inputMode="numeric"
                    value={kurva[k]}
                    placeholder="—"
                    onChange={(e) => setKurva((v) => ({ ...v, [k]: e.target.value }))}
                  />
                  <FieldError message={fieldError(fieldErrors, k)} />
                </label>
              ))}
            </div>
            <FieldError message={fieldError(fieldErrors, 'kurva')} />
          </fieldset>
        )}

        <label className="mt-4 block">
          <span className="vsf-label vsf-label-tinta">Keterangan (opsional)</span>
          <input className="vsf-input mt-1 w-full" placeholder="Catatan singkat" value={ket} onChange={(e) => setKet(e.target.value)} />
        </label>

        <div className={clsx('vsf-ringkasan-form mt-5', ringkasan.length === 0 && 'is-kosong')} aria-live="polite">
          <Ikon nama="tanam" className="h-4 w-4" />
          <span>{ringkasan.length ? ringkasan.join(' · ') : 'Ringkasan muncul setelah kamu memilih tanaman.'}</span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="vsf-btn-secondary" disabled={submitting} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="vsf-btn-primary" disabled={submitting}>
            {submitting && <span className="vsf-spinner" aria-hidden />}
            {submitting ? 'Menyimpan…' : 'Mulai Tanam'}
          </button>
        </div>
    </DialogKaca>
  )
}
