import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import {
  BtnDetail,
  BtnEdit,
  BtnHapus,
  CrudScreen,
  Field,
  FieldError,
  type Column,
  type HapusTarget,
} from '../components/CrudScreen'
import { useDialog } from '../lib/useDialog'
import { ModalBackdrop } from '../components/ModalBackdrop'

/** Form terkontrol: kunci = nama kolom backend. */
type FormState = Record<string, string>

function cell(v: unknown): string {
  return v === undefined || v === null || String(v).trim() === '' ? '—' : String(v)
}

/** Tanggal ISO backend → "19 Mei 2026" (dibaca di zona lokal, sesuai penyimpanan). */
function tgl(v: unknown): string {
  if (v === undefined || v === null || String(v).trim() === '') return '—'
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Potongan /tanaman yang dipakai untuk menampilkan nama dari FK id_tanaman. */
type TanamanMini = Record<string, unknown> & { id_tanaman: string | number; nama_tanaman: string }

/** Nama tanaman dari id (— bila kosong, `#id` bila tak ada di daftar /tanaman). */
function namaTanaman(rows: TanamanMini[], id: unknown): string {
  if (id === undefined || id === null || String(id).trim() === '') return '—'
  const m = rows.find((r) => String(r.id_tanaman) === String(id))
  return m ? cell(m.nama_tanaman) : `#${id}`
}

/* ── Ikon SVG inline (R3): pengganti emoji silang — aria-hidden, 16px ── */
function IkonSalah({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.1 6.1l3.8 3.8M9.9 6.1L6.1 9.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Pill status baris — tone mengikuti data (bukan hiasan tetap): `selesai` → hijau,
 * sedang berjalan → netral, gagal/batal → merah. (temuan S6 — indikator dari data)
 */
function PillStatus({ nilai }: { nilai: string }) {
  const v = (nilai ?? '').trim().toLowerCase()
  if (!v || v === '—') return <span className="text-slate-500">—</span>
  const tone = v.includes('selesai') || v.includes('panen')
    ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest'
    : v.includes('gagal') || v.includes('batal')
      ? 'border-red-600/40 bg-red-50 text-red-700'
      : 'border-navy/25 bg-navy/[.05] text-navy'
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold', tone)}>
      {nilai}
    </span>
  )
}

/* ── S3 — modal DETAIL baris untuk 3 halaman mock (Peremajaan/Pendewasaan/Panen):
     barisnya statis & kontrak tak punya aksi ubah/hapus per baris, jadi tombol
     "Edit" mati diganti "Detail" yang membuka isi baris (baca, tanpa API). ── */
type DetailBaris = { judul: string; isi: Array<[string, string]> }

function ModalDetailBaris({ data, onClose }: { data: DetailBaris | null; onClose: () => void }) {
  if (!data) return null
  return (
    <ModalBackdrop
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vsf-baris-detail-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        className="w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto"
      >
        <div
          id="vsf-baris-detail-title"
          data-dialog-title
          tabIndex={-1}
          className="text-[11px] uppercase tracking-[.14em] font-bold text-slate-500 outline-none"
        >
          {data.judul}
        </div>
        <dl className="mt-3 grid gap-2">
          {data.isi.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 text-[13px]">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex justify-end">
          <button type="button" className="vsf-input rounded-full font-semibold" onClick={onClose} autoFocus>
            Tutup
          </button>
        </div>
      </div>
    </ModalBackdrop>
  )
}

/* ================= 06 · SEMAI — API NYATA (baca) ================= */
type SemaiRow = Record<string, unknown> & {
  id_semai: string | number
  id_tanaman: string | number | null
  id_siklus: string | number | null
  jumlah_benih: number | string | null
  tgl_awal_semai: string | null
  tgl_akhir_semai: string | null
  status: string | null
  benih_berhasil: number | string | null
  benih_gagal: number | string | null
}

/** Respons GET /semai/batch/:id — baris semai + turunannya di 3 tahap berikut. */
type BatchDetail = {
  semai?: Record<string, unknown> | null
  peremajaan?: Record<string, unknown>[]
  pendewasaan?: Record<string, unknown>[]
  panen?: Record<string, unknown>[]
}

/** Satu baris ringkasan riwayat di modal detail (label: jumlah baris + tanggalnya). */
function daftarTahap(
  label: string,
  items: Record<string, unknown>[] | undefined,
  dateKey: string,
): ReactNode {
  if (!items || items.length === 0) {
    return <div className="text-[13px] text-slate-600"><b>{label}</b>: belum ada</div>
  }
  return (
    <div className="text-[13px] text-slate-700">
      <b>{label}</b>: {items.length} baris
      <ul className="mt-1 list-disc pl-5 text-slate-600">
        {items.map((r) => (
          <li key={`${dateKey}-${cell(r[dateKey])}-${cell(r.id_peremajaan ?? r.id_pendewasaan ?? r.id_panen)}`}>
            {tgl(r[dateKey])}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SemaiPage() {
  const handleApiError = useApiError()
  // Dua endpoint baca yang didukung kontrak: daftar & daftar yang statusnya selesai.
  const [tab, setTab] = useState<'semua' | 'selesai'>('semua')
  const path = tab === 'selesai' ? '/semai/selesai' : '/semai'
  const { rows, loading, error, reload } = useApiList<SemaiRow>(path)
  const { rows: tanamanRows } = useApiList<TanamanMini>('/tanaman')

  // Detail per baris → GET /semai/batch/:id (aksi baca kedua yang disediakan kontrak).
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<BatchDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  async function openDetail(id: string) {
    setDetailId(id)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const res = await api.get(`/semai/batch/${id}`)
      setDetail(res.data as BatchDetail)
    } catch (err) {
      setDetailError(handleApiError(err).message)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailId(null)
    setDetail(null)
    setDetailError(null)
  }

  // QW3 — modal detail aksesibel: fokus judul saat buka, kembali ke tombol
  // "Detail" saat tutup, Escape (diblokir saat memuat), backdrop, Tab trap.
  const {
    dialogRef: detailRef,
    onKeyDown: detailKeyDown,
    backdropProps: detailBackdrop,
  } = useDialog({
    open: detailId !== null,
    onClose: closeDetail,
    closeDisabled: detailLoading,
  })

  const columns: Column<SemaiRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_semai)}</span> },
    { key: 'tanaman', header: 'Tanaman', render: (r) => <b className="text-slate-900">{namaTanaman(tanamanRows, r.id_tanaman)}</b> },
    { key: 'siklus', header: 'Siklus', render: (r) => cell(r.id_siklus) },
    { key: 'benih', header: 'Jumlah Benih', render: (r) => cell(r.jumlah_benih) },
    { key: 'mulai', header: 'Mulai Semai', render: (r) => tgl(r.tgl_awal_semai) },
    { key: 'akhir', header: 'Akhir Semai', render: (r) => tgl(r.tgl_akhir_semai) },
    { key: 'hasil', header: 'Berhasil / Gagal', render: (r) => `${cell(r.benih_berhasil)} / ${cell(r.benih_gagal)}` },
    { key: 'status', header: 'Status', render: (r) => <PillStatus nilai={cell(r.status)} /> },
  ]

  const d = detail?.semai

  return (
    <>
      {/* Tab baca: /semai (semua) · /semai/selesai (hanya yang status selesai). */}
      <div className="mx-auto max-w-[1180px] vsf-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Tampilan</span>
        <button
          type="button"
          className={tab === 'semua' ? 'vsf-btn-primary' : 'vsf-input rounded-full'}
          onClick={() => setTab('semua')}
        >
          Semua
        </button>
        <button
          type="button"
          className={tab === 'selesai' ? 'vsf-btn-primary' : 'vsf-input rounded-full'}
          onClick={() => setTab('selesai')}
        >
          Selesai
        </button>
        <span className="text-[12px] text-slate-500">
          Sumber: <code>{path}</code> — layar ini baca saja (lihat catatan di bawah).
        </span>
      </div>

      <CrudScreen<SemaiRow>
        title="Semai"
        moduleName="Semai"
        addButton="+ Tambah Semai"
        hideAdd
        columns={columns}
        rows={rows}
        rowKey={(r) => String(r.id_semai)}
        loading={loading}
        listError={error}
        onRetry={reload}
        notes={[
          'Live: GET /semai (daftar) · GET /semai/selesai (tab) · GET /semai/batch/:id (detail) — Bearer JWT.',
          'Kolom backend: id_tanaman, id_siklus, id_meja, jumlah_benih, tgl_awal_semai, tgl_akhir_semai, status, keterangan, benih_berhasil, benih_gagal.',
          'Tulis (POST/PUT/DELETE /semai) sengaja tidak dipasang di layar ini: tiap baris dirujuk peremajaan/pendewasaan/panen (FK ON DELETE RESTRICT → 409) — uji tulis semai berisiko.',
          'Error kontrak tetap aktif: 401 → redirect login · 404 detail → "Data tidak ditemukan." · 403 → mode demo.',
        ]}
        actions={(r) => (
          <BtnDetail
            name={`${namaTanaman(tanamanRows, r.id_tanaman)} (semai #${String(r.id_semai)})`}
            onClick={() => void openDetail(String(r.id_semai))}
          />
        )}
      />

      {/* Modal detail — host di luar CrudScreen karena bukan form maupun dialog hapus. */}
      {detailId && (
        <ModalBackdrop onMouseDown={detailBackdrop.onMouseDown}>
          <div
            ref={detailRef}
            onKeyDown={detailKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-detail-title"
            className="w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto"
          >
            <div
              id="vsf-detail-title"
              data-dialog-title
              tabIndex={-1}
              className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold outline-none"
            >
              Detail semai #{detailId}
            </div>

            {detailLoading && (
              <div className="mt-3 grid justify-items-center gap-2 py-6">
                <span className="vsf-spinner vsf-spinner-dark" aria-hidden />
                <span className="text-[13px]">Memuat detail…</span>
              </div>
            )}

            {!detailLoading && detailError && (
              <div
                role="alert"
                className="vsf-banner mt-3 rounded-input border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700 flex items-start gap-2"
              >
                <IkonSalah className="mt-[2px] shrink-0" />
                <span>{detailError}</span>
              </div>
            )}

            {!detailLoading && !detailError && detail && (
              <div className="mt-3 grid gap-2">
                <div className="text-[13px] text-slate-700">
                  <b>Tanaman</b>: {namaTanaman(tanamanRows, d?.id_tanaman)} ·{' '}
                  <b>Siklus</b>: {cell(d?.id_siklus)} · <b>Meja</b>: {cell(d?.id_meja)}
                </div>
                <div className="text-[13px] text-slate-700">
                  <b>Benih</b>: {cell(d?.jumlah_benih)} · <b>Berhasil</b>: {cell(d?.benih_berhasil)} ·{' '}
                  <b>Gagal</b>: {cell(d?.benih_gagal)}
                </div>
                <div className="text-[13px] text-slate-700">
                  <b>Mulai</b>: {tgl(d?.tgl_awal_semai)} · <b>Akhir</b>: {tgl(d?.tgl_akhir_semai)} ·{' '}
                  <b>Status</b>: {cell(d?.status)}
                </div>
                <div className="text-[13px] text-slate-700">
                  <b>Keterangan</b>: {cell(d?.keterangan)}
                </div>

                <div className="mt-2 border-t border-arutmin-border pt-2 text-[11px] uppercase tracking-[.14em] font-bold text-slate-500">
                  Riwayat tahap berikutnya
                </div>
                {daftarTahap('Peremajaan', detail.peremajaan, 'tgl_awal_peremajaan')}
                {daftarTahap('Pendewasaan', detail.pendewasaan, 'tgl_awal_pendewasaan')}
                {daftarTahap('Panen', detail.panen, 'tgl_panen')}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button className="vsf-input rounded-full" disabled={detailLoading} onClick={closeDetail}>
                Tutup
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </>
  )
}

/* ============== 07 · PEREMAJAAN ============== */
type Peremajaan = { batch: string; varietas: string; umur: string; tanggal: string }

export function PeremajaanPage() {
  const rows: Peremajaan[] = [
    { batch: 'B-2312', varietas: 'Kangkung', umur: '21', tanggal: '20 Sep' },
  ]
  // S3 — baris masih mock (tanpa API tulis/ubah per baris): "Edit" mati diganti
  // "Detail" yang membuka isi baris (baca saja, keputusan rombak-B dicatat di audit).
  const [lihat, setLihat] = useState<DetailBaris | null>(null)
  return (
    <>
      <CrudScreen<Peremajaan>
        title="Peremajaan"
        moduleName="Peremajaan"
        addButton="+ Tambah Peremajaan"
        columns={[
          { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
          { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
          { key: 'umur', header: 'Umur (hari)', render: (r) => r.umur },
          { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggal },
        ]}
        rows={rows}
        rowKey={(r) => r.batch}
        form={
          <>
            <Field label="Umur (hari)"><input className="vsf-input w-full" placeholder="21" /></Field>
            <Field label="Jumlah pindah"><input className="vsf-input w-full" placeholder="80" /></Field>
            <Field label="Kondisi"><input className="vsf-input w-full" placeholder="Baik" /></Field>
          </>
        }
        notes={[
          'Field khas modul ini: Umur (hari) • Jumlah pindah • Kondisi.',
          'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
          'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
        ]}
        actions={(r, ask) => (
          <>
            <BtnDetail
              name={`batch ${r.batch}`}
              onClick={() =>
                setLihat({
                  judul: `Detail batch ${r.batch}`,
                  isi: [
                    ['Batch', r.batch],
                    ['Varietas', r.varietas],
                    ['Umur (hari)', r.umur],
                    ['Tanggal', r.tanggal],
                  ],
                })
              }
            />
            <BtnHapus label={`batch ${r.batch}`} onPick={ask} />
          </>
        )}
      />
      <ModalDetailBaris data={lihat} onClose={() => setLihat(null)} />
    </>
  )
}

/* ============= 08 · PENDEWASAAN ============= */
type Pendewasaan = { batch: string; varietas: string; meja: string; tanggal: string }

export function PendewasaanPage() {
  const rows: Pendewasaan[] = [{ batch: 'B-2310', varietas: 'Selada', meja: 'Meja 2', tanggal: '18 Sep' }]
  // S3 — lihat catatan keputusan di PeremajaanPage (Edit mati → Detail berfungsi).
  const [lihat, setLihat] = useState<DetailBaris | null>(null)
  return (
    <>
      <CrudScreen<Pendewasaan>
        title="Pendewasaan"
        moduleName="Pendewasaan"
        addButton="+ Tambah Pendewasaan"
        columns={[
          { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
          { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
          { key: 'meja', header: 'Meja', render: (r) => r.meja },
          { key: 'tanggal', header: 'Tanggal', render: (r) => r.tanggal },
        ]}
        rows={rows}
        rowKey={(r) => r.batch}
        form={
          <>
            <Field label="Meja tanam"><input className="vsf-input w-full" placeholder="Meja 2" /></Field>
            <Field label="Tanggal"><input className="vsf-input w-full" placeholder="18 Sep" /></Field>
          </>
        }
        notes={[
          'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
          'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
        ]}
        actions={(r, ask) => (
          <>
            <BtnDetail
              name={`batch ${r.batch}`}
              onClick={() =>
                setLihat({
                  judul: `Detail batch ${r.batch}`,
                  isi: [
                    ['Batch', r.batch],
                    ['Varietas', r.varietas],
                    ['Meja', r.meja],
                    ['Tanggal', r.tanggal],
                  ],
                })
              }
            />
            <BtnHapus label={`batch ${r.batch}`} onPick={ask} />
          </>
        )}
      />
      <ModalDetailBaris data={lihat} onClose={() => setLihat(null)} />
    </>
  )
}

/* ================= 09 · PANEN ================= */
type Panen = { batch: string; varietas: string; tglPanen: string; hasil: string }

export function PanenPage() {
  const rows: Panen[] = [{ batch: 'B-2304', varietas: 'Bayam', tglPanen: '10 Sep', hasil: '12.4 kg' }]
  // S3 — lihat catatan keputusan di PeremajaanPage (Edit mati → Detail berfungsi).
  const [lihat, setLihat] = useState<DetailBaris | null>(null)
  return (
    <>
      <CrudScreen<Panen>
        title="Panen"
        moduleName="Panen"
        addButton="+ Tambah Panen"
        columns={[
          { key: 'batch', header: 'Batch', render: (r) => <b className="text-slate-900">{r.batch}</b> },
          { key: 'varietas', header: 'Varietas', render: (r) => r.varietas },
          { key: 'tglPanen', header: 'Tanggal panen', render: (r) => r.tglPanen },
          { key: 'hasil', header: 'Hasil', render: (r) => r.hasil },
        ]}
        rows={rows}
        rowKey={(r) => r.batch}
        form={
          <>
            <Field label="Tanggal panen"><input className="vsf-input w-full" placeholder="14 Okt" /></Field>
            <Field label="Hasil (kg)"><input className="vsf-input w-full" placeholder="12.4" /></Field>
            <Field label="Kualitas (A/B/C)"><input className="vsf-input w-full" placeholder="A" /></Field>
          </>
        }
        notes={[
          'Field khas modul ini: Tanggal panen • Hasil (kg) • Kualitas (A/B/C).',
          'Pola identik dengan halaman 06 — konsistensi komponen (tabel + form + modal hapus).',
          'Navigasi tahap: Penyemaian → Peremajaan → Pendewasaan → Panen (alur satu arah).',
        ]}
        actions={(r, ask) => (
          <>
            <BtnDetail
              name={`batch ${r.batch}`}
              onClick={() =>
                setLihat({
                  judul: `Detail batch ${r.batch}`,
                  isi: [
                    ['Batch', r.batch],
                    ['Varietas', r.varietas],
                    ['Tanggal panen', r.tglPanen],
                    ['Hasil', r.hasil],
                  ],
                })
              }
            />
            <BtnHapus label={`batch ${r.batch}`} onPick={ask} />
          </>
        )}
      />
      <ModalDetailBaris data={lihat} onClose={() => setLihat(null)} />
    </>
  )
}

/* ============= 10 · DURASI SIKLUS — API NYATA ============= */
type SiklusRow = Record<string, unknown> & {
  id_siklus: string | number
  id_tanaman: string | number | null
  nama_siklus: string
  waktu_siklus: number | string | null
}

/**
 * Validasi klien hanya untuk wajib-isi & tipe angka bulat (input teks apa pun yang
 * masuk ke kolom integer) — panjang teks & FK tetap urusan Zod backend → 422 per-field.
 */
function validateSiklus(form: FormState): Record<string, string[]> {
  const errs: Record<string, string[]> = {}
  if (!(form.nama_siklus ?? '').trim()) errs.nama_siklus = ['Kolom nama_siklus wajib diisi.']
  const w = (form.waktu_siklus ?? '').trim()
  if (!w) errs.waktu_siklus = ['Kolom waktu_siklus wajib diisi.']
  else if (!Number.isInteger(Number(w))) errs.waktu_siklus = ['Kolom waktu_siklus harus berupa bilangan bulat.']
  return errs
}

/** Body PUT/POST: hanya field terisi — `id_tanaman` kosong tidak dikirim (kolom nullable). */
function payloadSiklus(form: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  const nama = (form.nama_siklus ?? '').trim()
  if (nama) payload.nama_siklus = nama
  const w = (form.waktu_siklus ?? '').trim()
  if (w) payload.waktu_siklus = Number(w)
  const t = (form.id_tanaman ?? '').trim()
  if (t) payload.id_tanaman = Number(t)
  return payload
}

export function DurasiSiklusPage() {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<SiklusRow>('/siklus')
  const { rows: tanamanRows } = useApiList<TanamanMini>('/tanaman')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [hapus, setHapus] = useState<HapusTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(id)
  }, [flash])

  function resetForm() {
    setForm({})
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
  }

  function openAdd() {
    setForm({ id_tanaman: '', nama_siklus: '', waktu_siklus: '' })
    setEditingId(null)
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: SiklusRow) {
    setForm({
      id_tanaman: row.id_tanaman == null ? '' : String(row.id_tanaman),
      nama_siklus: row.nama_siklus == null ? '' : String(row.nama_siklus),
      waktu_siklus: row.waktu_siklus == null ? '' : String(row.waktu_siklus),
    })
    setEditingId(String(row.id_siklus))
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  /** Tombol "+ Tambah" / "Batal" dari CrudScreen → siapkan atau bersihkan form. */
  function handleOpenChange(v: boolean) {
    if (v) {
      if (editingId) setOpen(true)
      else openAdd()
    } else {
      setOpen(false)
      resetForm()
    }
  }

  async function save() {
    if (submitting) return
    setFormError(null)
    const errs = validateSiklus(form)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const payload = payloadSiklus(form)
      if (editingId) await api.put(`/siklus/${editingId}`, payload)
      else await api.post('/siklus', payload)
      setOpen(false)
      resetForm()
      setFlash('Data siklus tersimpan.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
      // 404 → data sudah hilang di server: segarkan daftar di belakang modal.
      if (f.status === 404) reload()
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/siklus/${id}`)
      setHapus(null)
      setFlash('Data siklus dihapus.')
      reload()
    } catch (err) {
      const f = handleApiError(err)
      // 409 (FK): baris masih dipakai semai → pesan ramah dari backend tetap tampil.
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<SiklusRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_siklus)}</span> },
    { key: 'tanaman', header: 'Tanaman', render: (r) => <b className="text-slate-900">{namaTanaman(tanamanRows, r.id_tanaman)}</b> },
    { key: 'nama', header: 'Nama Siklus', render: (r) => cell(r.nama_siklus) },
    { key: 'waktu', header: 'Waktu (hari)', render: (r) => cell(r.waktu_siklus) },
  ]

  const currentTanaman = (form.id_tanaman ?? '').trim()
  const tanamanOptions = tanamanRows.map((t) => ({ id: String(t.id_tanaman), label: cell(t.nama_tanaman) }))
  if (currentTanaman && !tanamanOptions.some((o) => o.id === currentTanaman)) {
    tanamanOptions.push({ id: currentTanaman, label: `#${currentTanaman}` })
  }

  return (
    <CrudScreen<SiklusRow>
      title="Durasi Siklus"
      moduleName="Durasi Siklus"
      addButton="+ Tambah Siklus"
      columns={columns}
      rows={rows}
      rowKey={(r) => String(r.id_siklus)}
      loading={loading}
      listError={error}
      onRetry={reload}
      flash={flash}
      open={open}
      onOpenChange={handleOpenChange}
      formError={formError}
      submitting={submitting}
      onSubmit={() => void save()}
      form={
        <>
          {'id_tanaman' in form && (
            <Field label="Tanaman">
              <select
                className="vsf-input w-full"
                value={currentTanaman}
                onChange={(e) => setForm((s) => ({ ...s, id_tanaman: e.target.value }))}
              >
                <option value="">— pilih tanaman —</option>
                {tanamanOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldError(fieldErrors, 'id_tanaman')} />
            </Field>
          )}
          {'nama_siklus' in form && (
            <Field label="Nama siklus">
              <input
                className="vsf-input w-full"
                placeholder="Semai"
                value={form.nama_siklus}
                onChange={(e) => setForm((s) => ({ ...s, nama_siklus: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'nama_siklus')} />
            </Field>
          )}
          {'waktu_siklus' in form && (
            <Field label="Waktu siklus (hari)">
              <input
                className="vsf-input w-full"
                type="number"
                inputMode="numeric"
                step={1}
                placeholder="7"
                value={form.waktu_siklus}
                onChange={(e) => setForm((s) => ({ ...s, waktu_siklus: e.target.value }))}
              />
              <FieldError message={fieldError(fieldErrors, 'waktu_siklus')} />
            </Field>
          )}
        </>
      }
      hapus={hapus}
      onHapusChange={setHapus}
      deleting={deleting}
      deleteError={deleteError}
      onDelete={(id) => void remove(id)}
      notes={[
        'Live: GET/POST/PUT/DELETE /siklus (Bearer JWT) — kolom whitelist backend: id_tanaman, nama_siklus, waktu_siklus.',
        'Pilihan tanaman diambil dari GET /tanaman; nama FK ditampilkan sebagai nama, bukan angka.',
        'Hapus baris yang masih dirujuk semai dijawab 409 "Tidak bisa menghapus siklus: masih ada data terkait…" (bukan 500).',
        'Error kontrak: 401 → redirect login · 422 per-field (mis. nama_siklus terlalu panjang) → inline di bawah input · 404 → "Data tidak ditemukan." · 403 → mode demo.',
        'Dipakai perhitungan estimasi panen di dashboard & laporan; export CSV: GET /siklus/csv.',
      ]}
      actions={(r, ask) => (
        <>
          <BtnEdit name={cell(r.nama_siklus)} onClick={() => openEdit(r)} />
          <BtnHapus label={`siklus ${cell(r.nama_siklus)}`} id={String(r.id_siklus)} onPick={ask} />
        </>
      )}
    />
  )
}
