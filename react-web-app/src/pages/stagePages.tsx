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
      ? 'vsf-tone-error'
      : 'border-navy/25 bg-navy/[.05] text-navy'
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold', tone)}>
      {nilai}
    </span>
  )
}

/* ── S3 — modal DETAIL baris untuk 3 halaman (Peremajaan/Pendewasaan/Panen):
     isi baris + aksi "Tandai Selesai" (konfirmasi 1 langkah di dialog yang sama →
     POST /tanam/:tipe/:id/selesai) hanya bila tahap belum selesai. ── */
type DetailBaris = { judul: string; isi: Array<[string, string]> }

/** Identitas tahap untuk tombol "Tandai Selesai" — host yang memanggil endpoint tulis. */
type AksiSelesai = { tipe: string; id: string; label: string; sudahSelesai: boolean; jumlah: number | null }

/** Tahap berikutnya yang dibuat server setelah tahap ini ditutup (POST /tanam/:tipe/:id/selesai). */
const LANJUT: Record<string, string> = { semai: 'peremajaan', peremajaan: 'pendewasaan', pendewasaan: 'panen' }

/** Angka bulat ≥ 0 dari isian; null bila kosong/bukan angka. */
const angkaBulat = (v: unknown): number | null => {
  const t = String(v ?? '').trim()
  return /^\d+$/.test(t) ? Number(t) : null
}

/**
 * Isian penutupan tahap: cukup JUMLAH BERHASIL (bawaan = semua). Server menghitung gagal,
 * menutup tahap hari ini, lalu membuat tahap berikutnya (pendewasaan → catatan panen).
 * Dulu tombol hanya menandai selesai → berhasil/gagal 0 dan tahap berikutnya tidak pernah dibuat.
 */
function IsianBerhasil({
  label,
  tipe,
  jumlah,
  busy,
  error,
  onBatal,
  onSimpan,
}: {
  label: string
  tipe: string
  jumlah: number | null
  busy?: boolean
  error?: string | null
  onBatal: () => void
  onSimpan: (berhasil: number) => void
}) {
  const [isi, setIsi] = useState(jumlah != null ? String(jumlah) : '')
  const [salah, setSalah] = useState<string | null>(null)
  const berhasil = angkaBulat(isi)
  const gagal = jumlah != null && berhasil != null && berhasil <= jumlah ? jumlah - berhasil : null
  const lanjut = LANJUT[tipe]
  const simpan = () => {
    if (berhasil == null) return setSalah('Isi jumlah yang berhasil (bilangan bulat ≥ 0).')
    if (jumlah != null && berhasil > jumlah) return setSalah(`Tidak boleh lebih dari ${jumlah}.`)
    setSalah(null)
    onSimpan(berhasil)
  }
  return (
    <form
      className="mt-4 border-t border-garis pt-3"
      onSubmit={(e) => {
        e.preventDefault()
        simpan()
      }}
    >
      <label className="block text-[13px] text-slate-700" htmlFor="vsf-isian-berhasil">
        Selesaikan <b>{label}</b>.{' '}
        {jumlah != null ? <>Dari <b>{jumlah}</b> tanaman, berapa yang berhasil?</> : 'Berapa tanaman yang berhasil?'}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="vsf-isian-berhasil"
          className="vsf-input w-32"
          type="number"
          inputMode="numeric"
          min={0}
          max={jumlah ?? undefined}
          step={1}
          value={isi}
          disabled={busy}
          autoFocus
          onChange={(e) => {
            setIsi(e.target.value)
            setSalah(null)
          }}
        />
        {jumlah != null && (
          <button type="button" className="vsf-btn-secondary" disabled={busy} onClick={() => setIsi(String(jumlah))}>
            Semua berhasil
          </button>
        )}
      </div>
      <div className="mt-2 text-[12.5px] text-slate-600">
        {gagal != null && <>Gagal: <b>{gagal}</b> (dihitung otomatis). </>}
        {berhasil === 0
          ? 'Semua gagal — batch ditutup tanpa tahap berikutnya.'
          : lanjut === 'panen'
            ? 'Hasil dicatat sebagai panen.'
            : lanjut
              ? `Yang berhasil otomatis pindah ke ${lanjut}.`
              : null}
      </div>
      {(salah || error) && (
        <div role="alert" className="vsf-banner mt-2 rounded-std vsf-tone-error px-3 py-2 text-[13px]">
          {salah || error}
        </div>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="vsf-btn-secondary" disabled={busy} onClick={onBatal}>
          Batal
        </button>
        <button type="submit" className="vsf-btn-primary" disabled={busy}>
          {busy && <span className="vsf-spinner" aria-hidden />}
          {busy ? 'Menyimpan…' : lanjut === 'panen' ? 'Simpan & catat panen' : 'Simpan & pindah tahap'}
        </button>
      </div>
    </form>
  )
}

function ModalDetailBaris({
  data,
  aksi,
  onSelesai,
  selesaiBusy,
  selesaiError,
  onClose,
}: {
  data: DetailBaris | null
  aksi?: AksiSelesai | null
  onSelesai?: (berhasil: number) => void
  selesaiBusy?: boolean
  selesaiError?: string | null
  onClose: () => void
}) {
  // P3 — animasi keluar 180ms sebelum host melepas modal (hook sebelum early return).
  const [closing, setClosing] = useState(false)
  // Konfirmasi Tandai Selesai — satu langkah, di dialog yang sama (tanpa jendela baru).
  const [tanya, setTanya] = useState(false)
  const close = () => {
    if (closing || selesaiBusy) return
    setTanya(false)
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 180)
  }
  if (!data) return null
  const bisaSelesai = !!aksi && !aksi.sudahSelesai && !!onSelesai
  return (
    <ModalBackdrop
      closing={closing}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vsf-baris-detail-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close()
        }}
        className={`w-full max-w-[420px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto${closing ? ' is-closing' : ''}`}
      >
        <div
          id="vsf-baris-detail-title"
          data-dialog-title
          tabIndex={-1}
          className="text-[12px] uppercase tracking-[.14em] font-bold text-slate-500 outline-none"
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

        {tanya && bisaSelesai && aksi ? (
          <IsianBerhasil
            label={aksi.label}
            tipe={aksi.tipe}
            jumlah={aksi.jumlah}
            busy={selesaiBusy}
            error={selesaiError}
            onBatal={() => setTanya(false)}
            onSimpan={(b) => onSelesai?.(b)}
          />
        ) : (
          <div className="mt-4 flex justify-end gap-2">
            {bisaSelesai && (
              <button type="button" className="vsf-btn-primary" onClick={() => setTanya(true)}>
                Tandai Selesai
              </button>
            )}
            <button
              type="button"
              className="vsf-input rounded-full font-semibold"
              onClick={close}
              autoFocus={!bisaSelesai}
            >
              Tutup
            </button>
          </div>
        )}
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

  // "Tandai Selesai" (POST /tanam/semai/:id/selesai) + banner sukses.
  const [tanyaSelesai, setTanyaSelesai] = useState(false)
  const [selesaiBusy, setSelesaiBusy] = useState(false)
  const [selesaiError, setSelesaiError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(id)
  }, [flash])

  async function openDetail(id: string) {
    setDetailId(id)
    setDetail(null)
    setDetailError(null)
    setTanyaSelesai(false)
    setSelesaiError(null)
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
    setTanyaSelesai(false)
    setSelesaiError(null)
  }

  /** Isi jumlah berhasil → POST /tanam/semai/:id/selesai {berhasil} → server membuat peremajaan. */
  async function tandaiSelesai(berhasil: number) {
    if (!detailId || selesaiBusy) return
    setSelesaiBusy(true)
    setSelesaiError(null)
    try {
      const res = await api.post(`/tanam/semai/${detailId}/selesai`, { berhasil })
      const pesan = (res.data as { message?: string } | null)?.message
      setFlash(pesan ?? 'Tahap semai diselesaikan.')
      setTanyaSelesai(false)
      reload()
      await openDetail(detailId)
    } catch (err) {
      setSelesaiError(handleApiError(err).message)
    } finally {
      setSelesaiBusy(false)
    }
  }

  // QW3 — modal detail aksesibel: fokus judul saat buka, kembali ke tombol
  // "Detail" saat tutup, Escape (diblokir saat memuat), backdrop, Tab trap.
  const {
    dialogRef: detailRef,
    onKeyDown: detailKeyDown,
    backdropProps: detailBackdrop,
    closing: detailClosing,
    handleClose: detailClose,
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
        <span className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold">Tampilan</span>
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

      {/* Catatan jujur yang tampil: kenapa tab ini tanpa tombol Tambah. */}
      <div className="mx-auto max-w-[1180px] vsf-card p-4 text-[13px] leading-relaxed text-slate-600">
        <span className="font-bold text-slate-700">Catatan:</span> tab ini menampilkan daftar, detail, dan
        penutupan tahap (Tandai Selesai). Batch semai BARU dibuat lewat tombol{' '}
        <b>Mulai Semai Baru</b> di Dashboard atau halaman Tanam Saya.
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
        flash={flash}
        notes={[
          'Live: GET /semai (daftar) · GET /semai/selesai (tab) · GET /semai/batch/:id (detail) — Bearer JWT.',
          'Kolom backend: id_tanaman, id_siklus, id_meja, jumlah_benih, tgl_awal_semai, tgl_akhir_semai, status, keterangan, benih_berhasil, benih_gagal.',
          'Batch semai BARU dibuat lewat tombol Mulai Semai Baru (POST /tanam/mulai) di Dashboard atau halaman Tanam Saya.',
          'Tutup tahap lewat tombol Tandai Selesai di modal detail → POST /tanam/semai/:id/selesai.',
          'Ubah/hapus baris lewat layar ini sengaja tidak dipasang: tiap baris dapat dirujuk peremajaan (FK ON DELETE RESTRICT → 409).',
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
        <ModalBackdrop onMouseDown={detailBackdrop.onMouseDown} closing={detailClosing}>
          <div
            ref={detailRef}
            onKeyDown={detailKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vsf-detail-title"
            className={`w-full max-w-[520px] rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto${detailClosing ? ' is-closing' : ''}`}
          >
            <div
              id="vsf-detail-title"
              data-dialog-title
              tabIndex={-1}
              className="text-[12px] uppercase tracking-[.14em] text-slate-500 font-bold outline-none"
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
                className="vsf-banner mt-3 rounded-input vsf-tone-error px-3 py-2 text-[13px] flex items-start gap-2"
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

                <div className="mt-2 border-t border-arutmin-border pt-2 text-[12px] uppercase tracking-[.14em] font-bold text-slate-500">
                  Riwayat tahap berikutnya
                </div>
                {daftarTahap('Peremajaan', detail.peremajaan, 'tgl_awal_peremajaan')}
                {daftarTahap('Pendewasaan', detail.pendewasaan, 'tgl_awal_pendewasaan')}
                {daftarTahap('Panen', detail.panen, 'tgl_panen')}
              </div>
            )}

            {detail && !detailLoading && !detailError && tanyaSelesai && (
              <IsianBerhasil
                label={`semai #${detailId}`}
                tipe="semai"
                jumlah={angkaBulat(d?.jumlah_benih)}
                busy={selesaiBusy}
                error={selesaiError}
                onBatal={() => setTanyaSelesai(false)}
                onSimpan={(b) => void tandaiSelesai(b)}
              />
            )}

            <div className="mt-4 flex justify-end gap-2">
              {detail && !detailLoading && !detailError && !tanyaSelesai && d?.status === 'proses' && (
                <button
                  type="button"
                  className="vsf-btn-primary"
                  onClick={() => setTanyaSelesai(true)}
                >
                  Tandai Selesai
                </button>
              )}
              <button className="vsf-input rounded-full" disabled={detailLoading} onClick={detailClose}>
                Tutup
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </>
  )
}

/* ══ 07–09 · PEREMAJAAN · PENDEWASAAN · PANEN — API NYATA ══════════════
   Endpoint tulis ADA (routes/tahap.js → crudRouter): GET/POST/PUT/DELETE
   /peremajaan · /pendewasaan · /panen. Tombol Simpan kini benar-benar
   menyimpan (POST), baris tabel = GET riil, Hapus = DELETE riil.
   Penutupan tahap (semai · peremajaan · pendewasaan) = POST /tanam/:tipe/:id/selesai
   {berhasil}: server mengisi berhasil/gagal + status, lalu membuat tahap berikutnya
   (pendewasaan → baris panens). Status baris dibaca dari kolom `status` server.
   Panen tanpa tombol tutup (tgl_panen = data hasil, bukan status). */
type PeremajaanRow = Record<string, unknown> & {
  id_peremajaan: string | number
  id_semai: string | number | null
  id_meja: string | number | null
  jumlah_masuk: number | string | null
  benih_berhasil: number | string | null
  benih_gagal: number | string | null
  tgl_awal_peremajaan: string | null
  tgl_akhir_peremajaan: string | null
  keterangan: string | null
  status?: string | null
}
type PendewasaanRow = Record<string, unknown> & {
  id_pendewasaan: string | number
  id_peremajaan: string | number | null
  id_meja: string | number | null
  jumlah_masuk: number | string | null
  tanaman_berhasil: number | string | null
  tanaman_gagal: number | string | null
  tgl_awal_pendewasaan: string | null
  tgl_akhir_pendewasaan: string | null
  keterangan: string | null
  status?: string | null
}
type PanenRow = Record<string, unknown> & {
  id_panen: string | number
  id_pendewasaan: string | number | null
  panen_berhasil: number | string | null
  panen_gagal: number | string | null
  tgl_panen: string | null
  keterangan: string | null
}
type MejaMini = Record<string, unknown> & { id_meja: string | number; meja: unknown }

/** Baris dari peta id → baris; undefined bila id kosong/tak dikenal. */
function ambil<T>(map: Map<string, T>, id: unknown): T | undefined {
  if (id === undefined || id === null || String(id).trim() === '') return undefined
  return map.get(String(id))
}

/** Tanggal lokal +N hari → YYYY-MM-DD. */
function tanggalOffset(hari: number): string {
  const d = new Date()
  d.setDate(d.getDate() + hari)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Status tahap dari kolom `status` di server ('proses' | 'selesai' | 'gagal'). Dulu ditebak dari
 * tanggal akhir → bertentangan dengan Tanam Saya (batch 'proses' tampil 'selesai'). */
const statusTahap = (status: unknown): string => {
  const v = String(status ?? '').trim()
  return v === 'proses' ? 'berjalan' : v || '—'
}

/** Tanggal akhir hanya bermakna setelah tahap ditutup (saat berjalan server menyimpan penanda = tanggal mulai). */
const tglAkhir = (status: unknown, akhir: unknown): string => (status === 'proses' ? '—' : tgl(akhir))

type Opsi = { id: string; label: string }
type FieldTahap = {
  key: string
  label: string
  kind: 'select' | 'number' | 'date' | 'text'
  /** Wajib diisi di klien (validasi minim) — mengikuti kolom NOT NULL backend. */
  wajib?: boolean
  placeholder?: string
  opsi?: Opsi[]
  /** Default tanggal form: 0 = hari ini, 1 = besok (rencana akhir tahap). */
  offsetHari?: number
}

type PropsTahap<T> = {
  title: string
  moduleName: string
  addButton: string
  formTitle: string
  path: string
  tipe: 'peremajaan' | 'pendewasaan' | 'panen'
  /** Jumlah tanaman yang masuk tahap ini — bawaan isian "berhasil" saat menutup tahap. */
  jumlah?: (r: T) => number | null
  columns: Column<T>[]
  rowKey: (r: T) => string
  fields: FieldTahap[]
  notes: string[]
  /** Satu baris catatan jujur yang DITAMPILKAN di layar (di atas tabel). */
  catatan?: string
  detail: (r: T) => DetailBaris
  sudahSelesai: (r: T) => boolean
  labelBaris: (r: T) => string
}

/** Layar satu tahap: daftar riil + form SIMPAN nyata (POST) + hapus (DELETE) + detail/Tandai Selesai. */
function TahapCrudPage<T>({
  title,
  moduleName,
  addButton,
  formTitle,
  path,
  tipe,
  jumlah,
  columns,
  rowKey,
  fields,
  notes,
  catatan,
  detail,
  sudahSelesai,
  labelBaris,
}: PropsTahap<T>) {
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<T>(path)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [hapus, setHapus] = useState<HapusTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [lihat, setLihat] = useState<T | null>(null)
  const [selesaiBusy, setSelesaiBusy] = useState(false)
  const [selesaiError, setSelesaiError] = useState<string | null>(null)

  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 4000)
    return () => window.clearTimeout(id)
  }, [flash])

  function resetForm() {
    setForm({})
    setFieldErrors({})
    setFormError(null)
  }

  /** Buka form tambah — tanggal default sesuai config, sisanya kosong. */
  function handleOpenChange(v: boolean) {
    if (v) {
      const awal: FormState = {}
      for (const f of fields) awal[f.key] = f.kind === 'date' ? tanggalOffset(f.offsetHari ?? 0) : ''
      setForm(awal)
      setFieldErrors({})
      setFormError(null)
      setOpen(true)
    } else {
      setOpen(false)
      resetForm()
    }
  }

  /** Validasi minim di klien: wajib-isi + integer. FK/tipe/batas tetap 422 backend. */
  function validate(): Record<string, string[]> {
    const errs: Record<string, string[]> = {}
    for (const f of fields) {
      const v = (form[f.key] ?? '').trim()
      if (f.wajib && !v) errs[f.key] = ['Wajib diisi.']
      else if (f.kind === 'number' && v && !/^-?\d+$/.test(v)) errs[f.key] = ['Harus berupa bilangan bulat.']
    }
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
      for (const f of fields) {
        const v = (form[f.key] ?? '').trim()
        if (!v) continue // kolom kosong tidak dikirim (nullable / default backend)
        if (f.kind === 'select') payload[f.key] = Number(v) // FK harus integer
        else if (f.kind === 'number') payload[f.key] = Number(v)
        else payload[f.key] = v
      }
      await api.post(path, payload)
      setOpen(false)
      resetForm()
      setFlash(`${title} tersimpan.`)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFieldErrors(f.fieldErrors)
      setFormError(f.message)
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
      await api.delete(`${path}/${id}`)
      setHapus(null)
      setFlash(`${title} dihapus.`)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setDeleteError(f.message)
      if (f.status === 404) reload()
    } finally {
      setDeleting(false)
    }
  }

  /** Isi jumlah berhasil → POST /tanam/:tipe/:id/selesai {berhasil}: server menghitung gagal,
   *  menutup tahap, dan membuat tahap berikutnya (dulu PUT tanggal akhir saja → tahap putus). */
  async function tandaiSelesai(r: T, berhasil: number) {
    if (selesaiBusy) return
    setSelesaiBusy(true)
    setSelesaiError(null)
    try {
      const res = await api.post(`/tanam/${tipe}/${rowKey(r)}/selesai`, { berhasil })
      const pesan = (res.data as { message?: string } | null)?.message
      setFlash(pesan ?? `Tahap ${tipe} diselesaikan.`)
      setLihat(null)
      reload()
    } catch (err) {
      setSelesaiError(handleApiError(err).message)
    } finally {
      setSelesaiBusy(false)
    }
  }

  return (
    <>
      {catatan && (
        <div className="mx-auto max-w-[1180px] vsf-card p-4 text-[13px] leading-relaxed text-slate-600">
          <span className="font-bold text-slate-700">Catatan:</span> {catatan}
        </div>
      )}
      <CrudScreen<T>
        title={title}
        moduleName={moduleName}
        addButton={addButton}
        formTitle={formTitle}
        columns={columns}
        rows={rows}
        rowKey={rowKey}
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
            {fields.map((f) => {
              const nilai = form[f.key] ?? ''
              if (f.kind === 'select') {
                const opsi = f.opsi ?? []
                const daftar = nilai && !opsi.some((o) => o.id === nilai)
                  ? [...opsi, { id: nilai, label: `#${nilai}` }]
                  : opsi
                return (
                  <Field key={f.key} label={f.label}>
                    <select
                      className="vsf-input w-full"
                      value={nilai}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    >
                      <option value="">{f.wajib ? '— pilih —' : '— tidak dipilih —'}</option>
                      {daftar.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <FieldError message={fieldError(fieldErrors, f.key)} />
                  </Field>
                )
              }
              if (f.kind === 'date') {
                return (
                  <Field key={f.key} label={f.label}>
                    <input
                      type="date"
                      className="vsf-input w-full"
                      value={nilai}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    />
                    <FieldError message={fieldError(fieldErrors, f.key)} />
                  </Field>
                )
              }
              return (
                <Field key={f.key} label={f.label}>
                  <input
                    className="vsf-input w-full"
                    type={f.kind === 'number' ? 'number' : 'text'}
                    inputMode={f.kind === 'number' ? 'numeric' : undefined}
                    step={f.kind === 'number' ? 1 : undefined}
                    placeholder={f.placeholder}
                    value={nilai}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                  <FieldError message={fieldError(fieldErrors, f.key)} />
                </Field>
              )
            })}
          </>
        }
        hapus={hapus}
        onHapusChange={setHapus}
        deleting={deleting}
        deleteError={deleteError}
        onDelete={(id) => void remove(id)}
        notes={notes}
        actions={(r, ask) => (
          <>
            <BtnDetail name={labelBaris(r)} onClick={() => setLihat(r)} />
            <BtnHapus label={labelBaris(r)} id={rowKey(r)} onPick={ask} />
          </>
        )}
      />
      <ModalDetailBaris
        data={lihat ? detail(lihat) : null}
        aksi={
          lihat
            ? { tipe, id: rowKey(lihat), label: labelBaris(lihat), sudahSelesai: sudahSelesai(lihat), jumlah: jumlah ? jumlah(lihat) : null }
            : null
        }
        onSelesai={lihat ? (b) => void tandaiSelesai(lihat, b) : undefined}
        selesaiBusy={selesaiBusy}
        selesaiError={selesaiError}
        onClose={() => setLihat(null)}
      />
    </>
  )
}

/* ── 07 · PEREMAJAAN — GET/POST/PUT/DELETE /peremajaan ─────────────── */
export function PeremajaanPage() {
  const { rows: semaiRows } = useApiList<SemaiRow>('/semai')
  const { rows: tanamanRows } = useApiList<TanamanMini>('/tanaman')
  const { rows: mejaRows } = useApiList<MejaMini>('/meja')

  const semaiById = new Map(semaiRows.map((r) => [String(r.id_semai), r]))
  const tanamanById = new Map(tanamanRows.map((r) => [String(r.id_tanaman), r]))
  const mejaById = new Map(mejaRows.map((r) => [String(r.id_meja), r]))

  const varietasDariSiklus = (idSiklus: unknown) => {
    const s = ambil(semaiById, idSiklus)
    const t = s ? ambil(tanamanById, s.id_tanaman) : undefined
    return t ? cell(t.nama_tanaman) : '—'
  }
  const namaMeja = (id: unknown) => {
    const m = ambil(mejaById, id)
    return m ? cell(m.meja) : id ? `#${id}` : '—'
  }

  return (
    <TahapCrudPage<PeremajaanRow>
      title="Peremajaan"
      moduleName="Peremajaan"
      addButton="+ Tambah Peremajaan"
      formTitle="Tambah Peremajaan"
      path="/peremajaan"
      tipe="peremajaan"
      jumlah={(r) => angkaBulat(r.jumlah_masuk)}
      columns={[
        { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_peremajaan)}</span> },
        { key: 'varietas', header: 'Varietas', render: (r) => <b className="text-slate-900">{varietasDariSiklus(r.id_semai)}</b> },
        { key: 'meja', header: 'Meja', render: (r) => namaMeja(r.id_meja) },
        { key: 'masuk', header: 'Jumlah pindah', render: (r) => cell(r.jumlah_masuk) },
        { key: 'hasil', header: 'Berhasil / Gagal', render: (r) => `${cell(r.benih_berhasil)} / ${cell(r.benih_gagal)}` },
        { key: 'mulai', header: 'Mulai', render: (r) => tgl(r.tgl_awal_peremajaan) },
        { key: 'akhir', header: 'Selesai', render: (r) => tglAkhir(r.status, r.tgl_akhir_peremajaan) },
        { key: 'status', header: 'Status', render: (r) => <PillStatus nilai={statusTahap(r.status)} /> },
      ]}
      rowKey={(r) => String(r.id_peremajaan)}
      fields={[
        { key: 'id_semai', label: 'Batch semai', kind: 'select', wajib: true, opsi: semaiRows.map((r) => ({ id: String(r.id_semai), label: `Semai #${r.id_semai} — ${varietasDariSiklus(r.id_tanaman)}` })) },
        { key: 'id_meja', label: 'Meja tanam', kind: 'select', opsi: mejaRows.map((r) => ({ id: String(r.id_meja), label: cell(r.meja) })) },
        { key: 'jumlah_masuk', label: 'Jumlah pindah (bibit)', kind: 'number', wajib: true, placeholder: '80' },
        { key: 'benih_berhasil', label: 'Benih berhasil', kind: 'number', wajib: true, placeholder: '70' },
        { key: 'benih_gagal', label: 'Benih gagal', kind: 'number', wajib: true, placeholder: '10' },
        { key: 'tgl_awal_peremajaan', label: 'Tanggal mulai', kind: 'date', wajib: true },
        { key: 'tgl_akhir_peremajaan', label: 'Tanggal akhir (rencana)', kind: 'date', wajib: true, offsetHari: 1 },
        { key: 'keterangan', label: 'Keterangan', kind: 'text', placeholder: 'Opsional' },
      ]}
      notes={[
        'Live: GET/POST/DELETE /peremajaan — tombol Simpan benar-benar menyimpan (POST), Hapus benar-benar menghapus.',
        'Pilihan Batch semai & Meja diambil dari server (tak perlu hafal ID); kolom wajib mengikuti kolom NOT NULL backend.',
        'Baris yang masih dirujuk pendewasaan tidak bisa dihapus (409 "Tidak bisa menghapus…" dari backend).',
        'Status dari server: berjalan / selesai / gagal. Tandai Selesai di detail baris meminta jumlah berhasil, lalu server membuat tahap berikutnya otomatis.',
      ]}
      detail={(r) => ({
        judul: `Detail peremajaan #${r.id_peremajaan}`,
        isi: [
          ['Batch semai', r.id_semai ? `#${r.id_semai} (${varietasDariSiklus(r.id_semai)})` : '—'],
          ['Meja', namaMeja(r.id_meja)],
          ['Jumlah pindah', cell(r.jumlah_masuk)],
          ['Berhasil / gagal', `${cell(r.benih_berhasil)} / ${cell(r.benih_gagal)}`],
          ['Mulai', tgl(r.tgl_awal_peremajaan)],
          ['Selesai', tglAkhir(r.status, r.tgl_akhir_peremajaan)],
          ['Status', statusTahap(r.status)],
          ['Keterangan', cell(r.keterangan)],
        ],
      })}
      sudahSelesai={(r) => r.status !== 'proses'}
      labelBaris={(r) => `peremajaan #${r.id_peremajaan}`}
    />
  )
}

/* ── 08 · PENDEWASAAN — GET/POST/PUT/DELETE /pendewasaan ───────────── */
export function PendewasaanPage() {
  const { rows: peremajaanRows } = useApiList<PeremajaanRow>('/peremajaan')
  const { rows: semaiRows } = useApiList<SemaiRow>('/semai')
  const { rows: tanamanRows } = useApiList<TanamanMini>('/tanaman')
  const { rows: mejaRows } = useApiList<MejaMini>('/meja')

  const peremajaanById = new Map(peremajaanRows.map((r) => [String(r.id_peremajaan), r]))
  const semaiById = new Map(semaiRows.map((r) => [String(r.id_semai), r]))
  const tanamanById = new Map(tanamanRows.map((r) => [String(r.id_tanaman), r]))
  const mejaById = new Map(mejaRows.map((r) => [String(r.id_meja), r]))

  const varietasDariPeremajaan = (idPeremajaan: unknown) => {
    const p = ambil(peremajaanById, idPeremajaan)
    const s = p ? ambil(semaiById, p.id_semai) : undefined
    const t = s ? ambil(tanamanById, s.id_tanaman) : undefined
    return t ? cell(t.nama_tanaman) : '—'
  }
  const namaMeja = (id: unknown) => {
    const m = ambil(mejaById, id)
    return m ? cell(m.meja) : id ? `#${id}` : '—'
  }

  return (
    <TahapCrudPage<PendewasaanRow>
      title="Pendewasaan"
      moduleName="Pendewasaan"
      addButton="+ Tambah Pendewasaan"
      formTitle="Tambah Pendewasaan"
      path="/pendewasaan"
      tipe="pendewasaan"
      jumlah={(r) => angkaBulat(r.jumlah_masuk)}
      columns={[
        { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_pendewasaan)}</span> },
        { key: 'varietas', header: 'Varietas', render: (r) => <b className="text-slate-900">{varietasDariPeremajaan(r.id_peremajaan)}</b> },
        { key: 'meja', header: 'Meja', render: (r) => namaMeja(r.id_meja) },
        { key: 'masuk', header: 'Jumlah masuk', render: (r) => cell(r.jumlah_masuk) },
        { key: 'hasil', header: 'Berhasil / Gagal', render: (r) => `${cell(r.tanaman_berhasil)} / ${cell(r.tanaman_gagal)}` },
        { key: 'mulai', header: 'Mulai', render: (r) => tgl(r.tgl_awal_pendewasaan) },
        { key: 'akhir', header: 'Selesai', render: (r) => tglAkhir(r.status, r.tgl_akhir_pendewasaan) },
        { key: 'status', header: 'Status', render: (r) => <PillStatus nilai={statusTahap(r.status)} /> },
      ]}
      rowKey={(r) => String(r.id_pendewasaan)}
      fields={[
        { key: 'id_peremajaan', label: 'Batch peremajaan', kind: 'select', wajib: true, opsi: peremajaanRows.map((r) => ({ id: String(r.id_peremajaan), label: `Peremajaan #${r.id_peremajaan} — ${varietasDariPeremajaan(r.id_peremajaan)}` })) },
        { key: 'id_meja', label: 'Meja tanam', kind: 'select', opsi: mejaRows.map((r) => ({ id: String(r.id_meja), label: cell(r.meja) })) },
        { key: 'jumlah_masuk', label: 'Jumlah masuk (tanaman)', kind: 'number', wajib: true, placeholder: '80' },
        { key: 'tanaman_berhasil', label: 'Tanaman berhasil', kind: 'number', wajib: true, placeholder: '75' },
        { key: 'tanaman_gagal', label: 'Tanaman gagal', kind: 'number', wajib: true, placeholder: '5' },
        { key: 'tgl_awal_pendewasaan', label: 'Tanggal mulai', kind: 'date', wajib: true },
        { key: 'tgl_akhir_pendewasaan', label: 'Tanggal akhir (rencana)', kind: 'date', wajib: true, offsetHari: 1 },
        { key: 'keterangan', label: 'Keterangan', kind: 'text', placeholder: 'Opsional' },
      ]}
      notes={[
        'Live: GET/POST/DELETE /pendewasaan — tombol Simpan benar-benar menyimpan (POST), Hapus benar-benar menghapus.',
        'Pilihan Batch peremajaan & Meja diambil dari server (tak perlu hafal ID); kolom wajib mengikuti kolom NOT NULL backend.',
        'Baris yang masih dirujuk panen tidak bisa dihapus (409 dari backend).',
        'Status dari server: berjalan / selesai / gagal. Tandai Selesai di detail baris meminta jumlah berhasil, lalu server membuat tahap berikutnya otomatis.',
      ]}
      detail={(r) => ({
        judul: `Detail pendewasaan #${r.id_pendewasaan}`,
        isi: [
          ['Batch peremajaan', r.id_peremajaan ? `#${r.id_peremajaan} (${varietasDariPeremajaan(r.id_peremajaan)})` : '—'],
          ['Meja', namaMeja(r.id_meja)],
          ['Jumlah masuk', cell(r.jumlah_masuk)],
          ['Berhasil / gagal', `${cell(r.tanaman_berhasil)} / ${cell(r.tanaman_gagal)}`],
          ['Mulai', tgl(r.tgl_awal_pendewasaan)],
          ['Selesai', tglAkhir(r.status, r.tgl_akhir_pendewasaan)],
          ['Status', statusTahap(r.status)],
          ['Keterangan', cell(r.keterangan)],
        ],
      })}
      sudahSelesai={(r) => r.status !== 'proses'}
      labelBaris={(r) => `pendewasaan #${r.id_pendewasaan}`}
    />
  )
}

/* ── 09 · PANEN — GET/POST/DELETE /panen ───────────────────────────── */
export function PanenPage() {
  const { rows: pendewasaanRows } = useApiList<PendewasaanRow>('/pendewasaan')
  const { rows: peremajaanRows } = useApiList<PeremajaanRow>('/peremajaan')
  const { rows: semaiRows } = useApiList<SemaiRow>('/semai')
  const { rows: tanamanRows } = useApiList<TanamanMini>('/tanaman')
  const { rows: mejaRows } = useApiList<MejaMini>('/meja')

  const pendewasaanById = new Map(pendewasaanRows.map((r) => [String(r.id_pendewasaan), r]))
  const peremajaanById = new Map(peremajaanRows.map((r) => [String(r.id_peremajaan), r]))
  const semaiById = new Map(semaiRows.map((r) => [String(r.id_semai), r]))
  const tanamanById = new Map(tanamanRows.map((r) => [String(r.id_tanaman), r]))
  const mejaById = new Map(mejaRows.map((r) => [String(r.id_meja), r]))

  const varietasDariPendewasaan = (idPendewasaan: unknown) => {
    const pd = ambil(pendewasaanById, idPendewasaan)
    const p = pd ? ambil(peremajaanById, pd.id_peremajaan) : undefined
    const s = p ? ambil(semaiById, p.id_semai) : undefined
    const t = s ? ambil(tanamanById, s.id_tanaman) : undefined
    return t ? cell(t.nama_tanaman) : '—'
  }
  const namaMeja = (id: unknown) => {
    const m = ambil(mejaById, id)
    return m ? cell(m.meja) : id ? `#${id}` : '—'
  }

  return (
    <TahapCrudPage<PanenRow>
      title="Panen"
      moduleName="Panen"
      addButton="+ Tambah Panen"
      formTitle="Tambah Panen"
      path="/panen"
      tipe="panen"
      catatan="Panen tercatat otomatis saat pendewasaan ditandai selesai (jumlah tanaman berhasil & gagal). Tahap panen sendiri tidak perlu ditutup."

      columns={[
        { key: 'id', header: 'ID', render: (r) => <span className="text-slate-500">{String(r.id_panen)}</span> },
        { key: 'varietas', header: 'Varietas', render: (r) => <b className="text-slate-900">{varietasDariPendewasaan(r.id_pendewasaan)}</b> },
        { key: 'meja', header: 'Meja', render: (r) => namaMeja(ambil(pendewasaanById, r.id_pendewasaan)?.id_meja) },
        { key: 'hasil', header: 'Berhasil', render: (r) => `${cell(r.panen_berhasil)} tanaman` },
        { key: 'gagal', header: 'Gagal', render: (r) => `${cell(r.panen_gagal)} tanaman` },
        { key: 'tgl', header: 'Tanggal panen', render: (r) => tgl(r.tgl_panen) },
      ]}
      rowKey={(r) => String(r.id_panen)}
      fields={[
        { key: 'id_pendewasaan', label: 'Batch pendewasaan', kind: 'select', wajib: true, opsi: pendewasaanRows.map((r) => ({ id: String(r.id_pendewasaan), label: `Pendewasaan #${r.id_pendewasaan} — ${varietasDariPendewasaan(r.id_pendewasaan)}` })) },
        { key: 'panen_berhasil', label: 'Panen berhasil (tanaman)', kind: 'number', wajib: true, placeholder: '12' },
        { key: 'panen_gagal', label: 'Panen gagal (tanaman)', kind: 'number', wajib: true, placeholder: '0' },
        { key: 'tgl_panen', label: 'Tanggal panen', kind: 'date', wajib: true },
        { key: 'keterangan', label: 'Keterangan', kind: 'text', placeholder: 'Opsional' },
      ]}
      notes={[
        'Live: GET/POST/DELETE /panen — tombol Simpan benar-benar menyimpan (POST), Hapus benar-benar menghapus.',
        'Pilihan Batch pendewasaan diambil dari GET /pendewasaan (tak perlu hafal ID).',
        'Baris panen dibuat otomatis saat pendewasaan diselesaikan; tombol Tambah Panen untuk catatan manual.',
        'Baris yang masih dirujuk tidak bisa dihapus (409 dari backend).',
      ]}
      detail={(r) => ({
        judul: `Detail panen #${r.id_panen}`,
        isi: [
          ['Batch pendewasaan', r.id_pendewasaan ? `#${r.id_pendewasaan} (${varietasDariPendewasaan(r.id_pendewasaan)})` : '—'],
          ['Panen berhasil', `${cell(r.panen_berhasil)} tanaman`],
          ['Panen gagal', `${cell(r.panen_gagal)} tanaman`],
          ['Tanggal panen', tgl(r.tgl_panen)],
          ['Keterangan', cell(r.keterangan)],
        ],
      })}
      // Tabel panens tanpa kolom status & tanpa tanggal akhir → tidak ada
      // penutupan tahap yang bisa dilakukan tanpa merusak data tanggal panen.
      sudahSelesai={() => true}
      labelBaris={(r) => `panen #${r.id_panen}`}
    />
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
      formTitle="Tambah Durasi Siklus"
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
