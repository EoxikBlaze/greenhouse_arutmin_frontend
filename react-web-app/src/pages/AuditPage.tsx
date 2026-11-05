import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import {
  hitungPerAksi,
  namaAktor,
  namaTabel,
  NAMA_TABEL,
  nomorHalaman,
  ringkasSingkat,
  saringAudit,
  waktuLengkap,
  waktuRelatif,
  type AuditRow,
} from '../lib/audit'
import { Ikon } from '../components/Ikon'
import { MasterFrame, TabelMaster, type KolomMaster } from '../components/master/MasterKit'
import { DialogDetailAudit } from '../components/audit/DialogDetailAudit'
import { LencanaAksi } from '../components/audit/Penanda'
import { RingkasanAudit } from '../components/audit/RingkasanAudit'
import { Avatar } from '../components/pengguna/Penanda'

/**
 * 17 · RIWAYAT AUDIT (/audit) — GET /audit-logs (admin + demo).
 *
 * Sumber: tabel `audit_logs` yang diisi middleware src/audit.js (backend).
 * Balasan kontrak { data, total, page, per_page } — filter tabel & aksi serta
 * pagination dikirim sebagai query (?page, ?per_page, ?tabel, ?aksi).
 * Pencarian teks hanya menyaring baris halaman yang sedang dimuat (di sisi web).
 */
type Kueri = { page: number; perPage: number; tabel: string; aksi: string }

export function AuditPage() {
  const handleApiError = useApiError()
  const [kueri, setKueri] = useState<Kueri>({ page: 1, perPage: 20, tabel: '', aksi: '' })
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  // true hanya untuk muat pertama (isi awal state — bukan setState sinkron di effect).
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)
  const [kata, setKata] = useState('')
  const [pilih, setPilih] = useState<number | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    const id = ++seq.current
    let batal = false
    void (async () => {
      try {
        const res = await api.get('/audit-logs', {
          params: {
            page: kueri.page,
            per_page: kueri.perPage,
            tabel: kueri.tabel || undefined,
            aksi: kueri.aksi || undefined,
          },
        })
        if (batal || id !== seq.current) return
        const d = (res.data ?? {}) as { data?: AuditRow[]; total?: number }
        setRows(Array.isArray(d.data) ? d.data : [])
        setTotal(typeof d.total === 'number' ? d.total : 0)
        setFailure(null)
      } catch (err) {
        if (batal || id !== seq.current) return
        setFailure(handleApiError(err).message)
      } finally {
        if (!batal && id === seq.current) setLoading(false)
      }
    })()
    return () => {
      batal = true
      seq.current += 1 // batalkan hasil yang masih mendarat setelah unmount
    }
  }, [kueri, handleApiError])

  function ubah(p: Partial<Kueri>) {
    setLoading(true)
    setPilih(null)
    setKueri((q) => ({ ...q, page: 1, ...p }))
  }
  function keHalaman(p: number) {
    setLoading(true)
    setPilih(null)
    setKueri((q) => ({ ...q, page: p }))
  }
  function muatUlang() {
    setLoading(true)
    setKueri((q) => ({ ...q })) // objek baru → effect jalan ulang
  }

  const tampil = useMemo(() => saringAudit(rows, kata), [rows, kata])
  const perAksi = useMemo(() => hitungPerAksi(rows), [rows])
  const totalHal = Math.max(1, Math.ceil(total / kueri.perPage))
  const adaFilter = kueri.tabel !== '' || kueri.aksi !== ''
  const idx = pilih === null ? -1 : tampil.findIndex((r) => r.id === pilih)
  const terpilih = idx >= 0 ? tampil[idx] : null

  const kolom: KolomMaster<AuditRow>[] = [
    {
      key: 'waktu',
      header: 'Waktu',
      render: (r) => (
        <span title={waktuLengkap(r.terjadi_pada)} className="whitespace-nowrap">
          <b className="block text-tinta">{waktuRelatif(r.terjadi_pada)}</b>
          <small className="vsf-master-id">{waktuLengkap(r.terjadi_pada)}</small>
        </span>
      ),
    },
    {
      key: 'aktor',
      header: 'Aktor',
      render: (r) => (
        <span className="vsf-pengguna">
          <Avatar nama={namaAktor(r)} />
          <span className="min-w-0">
            <b className="block truncate text-tinta">{namaAktor(r)}</b>
            {r.meta?.level && <small className="vsf-master-id">{r.meta.level}</small>}
          </span>
        </span>
      ),
    },
    { key: 'aksi', header: 'Aksi', render: (r) => <LencanaAksi aksi={r.aksi} /> },
    {
      key: 'tabel',
      header: 'Data',
      render: (r) => (
        <span>
          <b className="block text-tinta">{namaTabel(r.tabel)}</b>
          {r.row_id && <small className="vsf-master-id">#{r.row_id}</small>}
        </span>
      ),
    },
    { key: 'ringkasan', header: 'Ringkasan', render: (r) => <span className="vsf-ringkas">{ringkasSingkat(r)}</span> },
  ]

  return (
    <>
      <MasterFrame
        judul="Riwayat Audit"
        deskripsi="Catatan otomatis setiap tambah, ubah, hapus, dan masuk. Klik baris untuk melihat detailnya."
        jumlah={`${total} aktivitas`}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="vsf-cari">
            <Ikon nama="cari" className="h-4 w-4" />
            <input
              type="search"
              className="vsf-input"
              placeholder="Cari aktor atau data di halaman ini…"
              aria-label="Cari riwayat"
              value={kata}
              onChange={(e) => setKata(e.target.value)}
            />
          </label>
          <select
            className="vsf-input vsf-pilih-pendek"
            aria-label="Filter data"
            value={kueri.tabel}
            onChange={(e) => ubah({ tabel: e.target.value })}
          >
            <option value="">Semua data</option>
            {Object.entries(NAMA_TABEL).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <button type="button" className="vsf-btn-secondary ml-auto" onClick={muatUlang} disabled={loading}>
            <Ikon nama="siklus" className="h-4 w-4" />
            Muat ulang
          </button>
        </div>
        <RingkasanAudit aksi={kueri.aksi} onAksi={(a) => ubah({ aksi: a })} perAksi={perAksi} total={total} />

        <TabelMaster
          label="Riwayat audit"
          kolom={kolom}
          rows={tampil}
          rowKey={(r) => String(r.id)}
          onBaris={(r) => setPilih(r.id)}
          memuat={loading}
          galat={failure}
          onUlang={muatUlang}
          kosong={
            kata
              ? 'Tidak ada aktivitas di halaman ini yang cocok dengan pencarian.'
              : adaFilter
                ? 'Tidak ada aktivitas yang cocok dengan filter ini — coba ganti data atau aksi.'
                : 'Belum ada aktivitas tercatat. Setiap aksi tulis dan login yang berhasil akan muncul di sini.'
          }
        />

        <nav className="vsf-paginasi" aria-label="Halaman riwayat">
          <span className="tabular-nums">
            {tampil.length === rows.length ? `${rows.length} dari ${total}` : `${tampil.length} cocok dari ${rows.length}`} aktivitas
          </span>
          <span className="vsf-paginasi-nomor">
            <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={loading || kueri.page <= 1} onClick={() => keHalaman(kueri.page - 1)} aria-label="Halaman sebelumnya">
              <Ikon nama="kiri" className="h-4 w-4" />
            </button>
            {nomorHalaman(kueri.page, totalHal).map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} aria-hidden className="px-1 text-abu">…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className="vsf-chip-ringkas vsf-chip-nomor"
                  aria-pressed={n === kueri.page}
                  aria-label={`Halaman ${n}`}
                  aria-current={n === kueri.page ? 'page' : undefined}
                  disabled={loading}
                  onClick={() => keHalaman(n)}
                >
                  {n}
                </button>
              ),
            )}
            <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={loading || kueri.page >= totalHal} onClick={() => keHalaman(kueri.page + 1)} aria-label="Halaman berikutnya">
              <Ikon nama="kanan" className="h-4 w-4" />
            </button>
          </span>
          <label className="flex items-center gap-2">
            Per halaman
            <select
              className="vsf-input vsf-pilih-pendek"
              value={String(kueri.perPage)}
              onChange={(e) => ubah({ perPage: Number(e.target.value) })}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </nav>
      </MasterFrame>

      {terpilih && (
        <DialogDetailAudit
          row={terpilih}
          adaSebelumnya={idx > 0}
          adaBerikutnya={idx < tampil.length - 1}
          onSebelumnya={() => setPilih(tampil[idx - 1].id)}
          onBerikutnya={() => setPilih(tampil[idx + 1].id)}
          onTutup={() => setPilih(null)}
        />
      )}
    </>
  )
}

export default AuditPage
