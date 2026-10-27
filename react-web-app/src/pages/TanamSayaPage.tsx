import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { useAuth } from '../lib/authContext'
import { Field, FieldError } from '../components/CrudScreen'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'
import { NaikHarian } from '../components/NaikHarian'

/** Satu baris `list` dari GET /tanam (routes/tanam.js — UNION semai/peremajaan/pendewasaan). */
type TanamRow = {
  id: string | number
  tipe: string
  status?: string | null
  mulai?: string | null
  varietas?: string | null
  meja?: string | null
  jumlah_benih?: number | null
  jumlah_masuk?: number | null
}

const TIPE_LABEL: Record<string, string> = {
  semai: 'Penyemaian',
  peremajaan: 'Peremajaan',
  pendewasaan: 'Pendewasaan',
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function tgl(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

function statusTone(status?: string | null): string {
  const s = String(status ?? '').toLowerCase()
  if (s === 'aktif') return 'border-arutmin-moss/50 bg-arutmin-mint/25 text-arutmin-forest'
  if (s === 'proses') return 'border-amber-500/60 bg-amber-50 text-amber-800'
  return 'border-arutmin-border2 bg-slate-50 text-slate-600'
}

function statusLabel(status?: string | null): string {
  const s = String(status ?? '').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Tanpa status'
}

/** Ilustrasi empty-state: tunas dalam pot (SVG murni, bukan emoji). */
function IlustrasiTanam() {
  return (
    <svg viewBox="0 0 160 110" className="mx-auto h-[104px] w-[152px]" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="98" rx="52" ry="8" fill="#E2E8DD" />
      <path d="M56 70h48l-6 26a8 8 0 0 1-8 6H70a8 8 0 0 1-8-6z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M52 64h56v8H52z" fill="#fff" stroke="#6B9D4A" strokeWidth="2" />
      <path d="M80 64V38" stroke="#4C6A4B" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 46c-12 0-20-7-21-19 12-1 21 6 21 19z" fill="#CFE2CE" stroke="#6B9D4A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 52c11 0 19-6 20-17-11-1-20 5-20 17z" fill="#fff" stroke="#6B9D4A" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="122" cy="26" r="10" fill="#F59E0B" opacity=".55" />
      <path d="M122 8v6M106 26h6M134 26h4M110 14l4 4M134 14l-4 4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}


/* ── Form "Mulai Semai Baru" — field = body POST /tanam/mulai (routes/tanam.js):
   id_tanaman · id_siklus · id_meja · jumlah_benih · tgl_awal_semai · keterangan.
   Hanya halaman ini yang membukanya (tombol hero Dashboard & tombol di /tanam). ── */
type TanamanOpt = Record<string, unknown> & { id_tanaman: string | number; nama_tanaman: unknown }
type MejaOpt = Record<string, unknown> & { id_meja: string | number; meja: unknown }
type SiklusOpt = Record<string, unknown> & {
  id_siklus: string | number
  id_tanaman: string | number | null
  nama_siklus: unknown
  waktu_siklus: number | string | null
}

/** Tanggal lokal hari ini → YYYY-MM-DD (default kolom tgl_awal_semai). */
function hariIni(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function DialogMulaiSemai({
  onClose,
  onSukses,
}: {
  onClose: () => void
  onSukses: (pesan: string) => void
}) {
  const handleApiError = useApiError()
  const { rows: tanamanRows, error: tanamanErr } = useApiList<TanamanOpt>('/tanaman')
  const { rows: mejaRows, error: mejaErr } = useApiList<MejaOpt>('/meja')
  const { rows: siklusRows, error: siklusErr } = useApiList<SiklusOpt>('/siklus')

  const [form, setForm] = useState<Record<string, string>>({
    id_tanaman: '',
    id_siklus: '',
    id_meja: '',
    jumlah_benih: '',
    tgl_awal_semai: hariIni(),
    keterangan: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { dialogRef, onKeyDown, backdropProps, closing, handleClose } = useDialog({
    open: true,
    onClose,
    closeDisabled: submitting,
  })

  function set(key: string, v: string) {
    setForm((s) => ({ ...s, [key]: v }))
  }

  /** Validasi minim: wajib-isi + integer. FK/tanggal/tipe → 422 backend. */
  function validate(): Record<string, string[]> {
    const errs: Record<string, string[]> = {}
    if (!(form.id_tanaman ?? '').trim()) errs.id_tanaman = ['Wajib diisi.']
    const jb = (form.jumlah_benih ?? '').trim()
    if (!jb) errs.jumlah_benih = ['Wajib diisi.']
    else if (!/^\d+$/.test(jb)) errs.jumlah_benih = ['Harus berupa bilangan bulat.']
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
      const payload: Record<string, unknown> = {}
      for (const key of ['id_tanaman', 'id_siklus', 'id_meja', 'tgl_awal_semai', 'keterangan']) {
        const v = (form[key] ?? '').trim()
        if (!v) continue // kolom nullable → tidak dikirim
        payload[key] = key.startsWith('id_') ? Number(v) : v
      }
      payload.jumlah_benih = Number((form.jumlah_benih ?? '').trim())
      const res = await api.post('/tanam/mulai', payload)
      const body = res.data as { message?: string; data?: { id_semai?: string | number } } | null
      const id = body?.data?.id_semai
      onSukses(`${body?.message ?? 'Tanam baru dimulai.'}${id ? ` (semai #${id})` : ''}`)
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
    } finally {
      setSubmitting(false)
    }
  }

  const idTanaman = (form.id_tanaman ?? '').trim()
  const pilihanSiklus = idTanaman
    ? siklusRows.filter((s) => String(s.id_tanaman ?? '') === idTanaman)
    : siklusRows

  return (
    <ModalBackdrop onMouseDown={backdropProps.onMouseDown} closing={closing}>
      <div
        ref={dialogRef}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vsf-mulai-title"
        className={`vsf-modal-card max-h-[90vh] w-full max-w-[520px] overflow-auto rounded-lg border border-garis bg-white p-5${closing ? ' is-closing' : ''}`}
      >
        <div id="vsf-mulai-title" data-dialog-title tabIndex={-1} className="vsf-eyebrow outline-none">
          Mulai Semai Baru
        </div>
        {formError && (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-std border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
            {formError}
          </div>
        )}
        <div className="mt-4 grid gap-1">
          <Field label="Tanaman *">
            <select
              className="vsf-input w-full"
              value={form.id_tanaman}
              onChange={(e) => set('id_tanaman', e.target.value)}
            >
              <option value="">— pilih tanaman —</option>
              {tanamanRows.map((t) => (
                <option key={String(t.id_tanaman)} value={String(t.id_tanaman)}>
                  {String(t.nama_tanaman)}
                </option>
              ))}
            </select>
            <FieldError message={fieldError(fieldErrors, 'id_tanaman') ?? tanamanErr ?? undefined} />
          </Field>

          <Field label="Siklus tanam">
            <select className="vsf-input w-full" value={form.id_siklus} onChange={(e) => set('id_siklus', e.target.value)}>
              <option value="">— tidak dipilih —</option>
              {pilihanSiklus.map((s) => (
                <option key={String(s.id_siklus)} value={String(s.id_siklus)}>
                  {String(s.nama_siklus)}
                  {s.waktu_siklus == null ? '' : ` (${String(s.waktu_siklus)} hari)`}
                </option>
              ))}
            </select>
            <FieldError message={siklusErr ?? undefined} />
          </Field>

          <Field label="Meja tanam">
            <select className="vsf-input w-full" value={form.id_meja} onChange={(e) => set('id_meja', e.target.value)}>
              <option value="">— tidak dipilih —</option>
              {mejaRows.map((m) => (
                <option key={String(m.id_meja)} value={String(m.id_meja)}>
                  {String(m.meja)}
                </option>
              ))}
            </select>
            <FieldError message={mejaErr ?? undefined} />
          </Field>

          <Field label="Jumlah benih *">
            <input
              className="vsf-input w-full"
              type="number"
              inputMode="numeric"
              step={1}
              placeholder="100"
              value={form.jumlah_benih}
              onChange={(e) => set('jumlah_benih', e.target.value)}
            />
            <FieldError message={fieldError(fieldErrors, 'jumlah_benih')} />
          </Field>

          <Field label="Tanggal mulai semai">
            <input
              className="vsf-input w-full"
              type="date"
              value={form.tgl_awal_semai}
              onChange={(e) => set('tgl_awal_semai', e.target.value)}
            />
            <FieldError message={fieldError(fieldErrors, 'tgl_awal_semai')} />
          </Field>

          <Field label="Keterangan">
            <input
              className="vsf-input w-full"
              placeholder="Opsional"
              value={form.keterangan}
              onChange={(e) => set('keterangan', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-garis pt-4">
          <button type="button" className="vsf-btn-secondary" disabled={submitting} onClick={handleClose}>
            Batal
          </button>
          <button type="button" className="vsf-btn-primary" disabled={submitting} onClick={() => void save()}>
            {submitting && <span className="vsf-spinner" aria-hidden />}
            {submitting ? 'Menyimpan…' : 'Mulai Tanam'}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

export default function TanamSayaPage() {
  const { rows, loading, error, reload } = useApiList<TanamRow>('/tanam')
  const [filter, setFilter] = useState('')

  const { role } = useAuth()
  const kelola = role !== 'petani' // membuat semai = pengelola (sama dgn tombol hero Dashboard)
  const location = useLocation()
  const navigate = useNavigate()

  // Pesan sukses & pemicu form dari navigasi (redirect /tanam dgn flash).
  const stateAwal = (location.state ?? null) as { flash?: string; mulaiBaru?: boolean } | null
  const [flash, setFlash] = useState<string | null>(stateAwal?.flash ?? null)
  const [mulaiOpen, setMulaiOpen] = useState<boolean>(!!stateAwal?.mulaiBaru)

  // Bersihkan state navigasi SETELAH dibaca (refresh tidak membuka form lagi).
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(id)
  }, [flash])

  const terfilter = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      `${r.varietas ?? ''} ${r.meja ?? ''} ${TIPE_LABEL[r.tipe] ?? r.tipe} ${r.status ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [rows, filter])

  // GET /tanam dilayani semua role (index.js: semuaRole) — 403 tidak mungkin di sini,
  // sehingga error apa pun cukup ditampilkan apa adanya + Muat ulang.
  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {flash && (
        <div
          role="status"
          aria-live="polite"
          className="vsf-banner flex items-center gap-2 rounded-std border border-arutmin-moss bg-arutmin-mint/50 px-3 py-2 text-[13px] text-arutmin-forest"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
          {flash}
        </div>
      )}
      {/* Ringkasan + pencarian */}
      <section className="vsf-card p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tanam aktif</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Gabungan batch semai, peremajaan, dan pendewasaan yang sedang berjalan — segar dari server.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss bg-white text-arutmin-forest">
            {loading ? 'Memuat…' : `${rows.length} batch aktif`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="vsf-input w-full sm:w-[260px]"
            placeholder="Cari varietas / meja / tahap"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Cari tanam aktif"
          />
          <span className="flex-1" />
          {kelola && (
            <button type="button" className="vsf-btn-primary" onClick={() => setMulaiOpen(true)}>
              + Mulai Semai Baru
            </button>
          )}
          <button type="button" className="vsf-btn-secondary" onClick={reload}>
            Muat ulang
          </button>
        </div>
      </section>

      {/* Satu state per layar: loading → error → kosong → daftar */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Daftar tanam</div>

        {loading ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="status" aria-label="Memuat daftar tanam">
            {[0, 1, 2].map((i) => (
              <div key={i} className="vsf-skeleton h-[132px] rounded-card" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-3 text-[13px] text-red-700 flex flex-wrap items-center gap-3"
          >
            <span className="inline-flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.8 14.8 13.8H1.2L8 1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 6.4v3.1M8 11.5v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> {error}</span>
            <button type="button" className="vsf-input rounded-full font-semibold" onClick={reload}>
              Muat ulang
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <IlustrasiTanam />
            <div className="mt-3 font-bold text-slate-700">Belum ada tanam aktif</div>
            <div className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-slate-500">
              Begitu ada batch semai, peremajaan, atau pendewasaan yang berjalan, daftarnya tampil di sini
              lengkap dengan tahap dan tanggal mulainya.
            </div>
          </div>
        ) : terfilter.length === 0 ? (
          <div className="mt-3 rounded-card border border-dashed border-arutmin-border p-8 text-center">
            <div className="font-bold text-slate-700">Tidak ada hasil untuk pencarian ini</div>
            <div className="mt-1 text-[13px] text-slate-500">
              Coba kata kunci lain, atau bersihkan pencarian untuk melihat semua {rows.length} batch.
            </div>
            <button
              type="button"
              className="vsf-btn-secondary mt-3"
              onClick={() => setFilter('')}
            >
              Bersihkan pencarian
            </button>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 vsf-stagger">
            {terfilter.map((t) => {
              const jumlah = t.tipe === 'semai' ? t.jumlah_benih : t.jumlah_masuk
              return (
                <article
                  key={`${t.tipe}-${t.id}`}
                  className="rounded-card border border-arutmin-border bg-white p-4 transition-all duration-200 hover:border-arutmin-moss/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-slate-900">{t.varietas || 'Tanaman'}</div>
                      <div className="mt-0.5 text-[12px] text-slate-500">
                        {TIPE_LABEL[t.tipe] ?? t.tipe} · #{t.id}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        statusTone(t.status),
                      )}
                    >
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Meja</dt>
                      <dd className="font-semibold text-slate-800">{t.meja || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">Mulai</dt>
                      <dd className="font-semibold text-slate-800">{tgl(t.mulai)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500">{t.tipe === 'semai' ? 'Jumlah benih' : 'Jumlah masuk'}</dt>
                      <dd className="font-semibold text-slate-800">
                        {typeof jumlah === 'number' ? jumlah : '—'}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Form mulai tanam (POST /tanam/mulai) — terbuka dari hero Dashboard juga. */}
      {kelola && mulaiOpen && (
        <DialogMulaiSemai
          onClose={() => setMulaiOpen(false)}
          onSukses={(pesan) => {
            setFlash(pesan)
            setMulaiOpen(false)
            reload()
          }}
        />
      )}

      {/* target ppm naik harian per tanaman — petani cukup isi target akhir */}
      <NaikHarian />
    </div>
  )
}
