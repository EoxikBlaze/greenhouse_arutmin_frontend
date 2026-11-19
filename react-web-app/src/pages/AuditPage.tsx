import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import {
  gagalAktivitas, JENIS_AKTIVITAS, labelAktivitas, labelStatus, NAMA_JENIS, ringkasAktivitas, unduhBerkas,
  type Aktivitas, type HasilAktivitas,
} from '../lib/aktivitas'
import { nomorHalaman, waktuLengkap, waktuRelatif } from '../lib/audit'
import { Ikon } from '../components/Ikon'
import { MasterFrame, TabelMaster, type KolomMaster } from '../components/master/MasterKit'
import { DialogKaca, Pesan } from '../components/kaca/DialogKaca'

/**
 * Catatan Aktivitas (/audit) — GET /audit-logs/aktivitas: satu linimasa dari perubahan data, pengaturan, login,
 * perintah ke alat (+ jawaban alat), peringatan, dosing/isi air oleh alat, dan kalibrasi. Filter dan pencarian di server.
 */
type Kueri = { jenis: string; dari: string; sampai: string; kata: string; page: number; perPage: number }

const AWAL: Kueri = { jenis: '', dari: '', sampai: '', kata: '', page: 1, perPage: 20 }

export function AuditPage() {
  const handleApiError = useApiError()
  const [kueri, setKueri] = useState<Kueri>(AWAL)
  const [kataIsi, setKataIsi] = useState('')
  const [hasil, setHasil] = useState<HasilAktivitas | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)
  const [pilih, setPilih] = useState<Aktivitas | null>(null)
  const [mengunduh, setMengunduh] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    const id = ++seq.current
    void (async () => {
      try {
        const res = await api.get('/audit-logs/aktivitas', {
          params: {
            jenis: kueri.jenis || undefined, dari: kueri.dari || undefined, sampai: kueri.sampai || undefined,
            kata: kueri.kata || undefined, page: kueri.page, per_page: kueri.perPage,
          },
        })
        if (id !== seq.current) return
        setHasil(res.data as HasilAktivitas)
        setFailure(null)
      } catch (err) {
        if (id === seq.current) setFailure(handleApiError(err).message)
      } finally {
        if (id === seq.current) setLoading(false)
      }
    })()
    return () => { seq.current += 1 }
  }, [kueri, handleApiError])

  const rows = hasil?.data ?? []
  const total = hasil?.total ?? 0
  const totalHal = Math.max(1, Math.ceil(total / kueri.perPage))
  const semuaJenis = Object.values(hasil?.per_jenis ?? {}).reduce((a, b) => a + b, 0)

  function ubah(p: Partial<Kueri>) {
    setLoading(true)
    setKueri((q) => ({ ...q, page: 1, ...p }))
  }
  const muatUlang = () => { setLoading(true); setKueri((q) => ({ ...q })) }

  async function unduh() {
    setMengunduh(true)
    try {
      await unduhBerkas('/audit-logs/aktivitas/csv', { jenis: kueri.jenis || undefined, dari: kueri.dari || undefined, sampai: kueri.sampai || undefined, kata: kueri.kata || undefined }, 'catatan-aktivitas.csv')
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Gagal mengunduh CSV.')
    } finally {
      setMengunduh(false)
    }
  }

  const kolom: KolomMaster<Aktivitas>[] = [
    {
      key: 'waktu', header: 'Waktu',
      render: (r) => (
        <span title={waktuLengkap(r.waktu)} className="whitespace-nowrap">
          <b className="block text-tinta">{waktuRelatif(r.waktu)}</b>
          <small className="vsf-master-id">{waktuLengkap(r.waktu)}</small>
        </span>
      ),
    },
    { key: 'jenis', header: 'Jenis', render: (r) => <span className="vsf-chip-ringkas">{NAMA_JENIS[r.jenis]}</span> },
    { key: 'pelaku', header: 'Pelaku', render: (r) => <b className="text-tinta">{r.pelaku}</b> },
    { key: 'ringkas', header: 'Kegiatan', render: (r) => <span className="vsf-ringkas">{ringkasAktivitas(r)}</span> },
    {
      key: 'status', header: 'Status',
      render: (r) => (r.status ? <span className={clsx('vsf-chip-nilai', gagalAktivitas(r.status) ? 'is-kosong' : 'is-normal')}>{labelStatus(r.status)}</span> : <span className="text-abu">—</span>),
    },
  ]

  return (
    <>
      <MasterFrame
        judul="Catatan Aktivitas"
        deskripsi="Semua yang terjadi: perubahan data dan pengaturan, login, perintah ke alat beserta jawabannya, peringatan, dosing, dan kalibrasi. Klik baris untuk detail."
        jumlah={`${total} aktivitas`}
      >
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Jenis aktivitas">
          <button type="button" className="vsf-chip-ringkas" aria-pressed={kueri.jenis === ''} onClick={() => ubah({ jenis: '' })}>
            Semua <b className="ml-1 tabular-nums">{semuaJenis}</b>
          </button>
          {JENIS_AKTIVITAS.map((j) => (
            <button key={j} type="button" className="vsf-chip-ringkas" aria-pressed={kueri.jenis === j} onClick={() => ubah({ jenis: j })}>
              {NAMA_JENIS[j]} <b className="ml-1 tabular-nums">{hasil?.per_jenis[j] ?? 0}</b>
            </button>
          ))}
        </div>

        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); ubah({ kata: kataIsi.trim() }) }}>
          <label className="vsf-cari">
            <Ikon nama="cari" className="h-4 w-4" />
            <input type="search" className="vsf-input" placeholder="Cari pelaku, kegiatan, atau data…" aria-label="Cari aktivitas" value={kataIsi} onChange={(e) => setKataIsi(e.target.value)} />
          </label>
          <input type="date" className="vsf-input w-[165px]" aria-label="Dari tanggal" value={kueri.dari} onChange={(e) => ubah({ dari: e.target.value })} />
          <span className="text-abu">s/d</span>
          <input type="date" className="vsf-input w-[165px]" aria-label="Sampai tanggal" value={kueri.sampai} onChange={(e) => ubah({ sampai: e.target.value })} />
          <button type="submit" className="vsf-btn-secondary">Cari</button>
          <span className="flex-1" />
          <button type="button" className="vsf-btn-secondary" onClick={muatUlang} disabled={loading}>
            <Ikon nama="siklus" className="h-4 w-4" /> Muat ulang
          </button>
          <button type="button" className="vsf-btn-primary" onClick={() => void unduh()} disabled={mengunduh || total === 0}>
            <Ikon nama="unduh" className="h-4 w-4" /> {mengunduh ? 'Menyiapkan…' : 'Unduh CSV'}
          </button>
        </form>
        <p className="mt-2 text-[12px] text-abu">Tanpa tanggal, yang ditampilkan 30 hari terakhir.</p>
        {failure && !loading && <Pesan jenis="galat" onTutup={() => setFailure(null)}>{failure}</Pesan>}

        <TabelMaster
          label="Catatan aktivitas"
          kolom={kolom}
          rows={rows}
          rowKey={(r) => r.kunci}
          onBaris={(r) => setPilih(r)}
          memuat={loading}
          galat={failure}
          onUlang={muatUlang}
          kosong="Tidak ada aktivitas yang cocok dengan filter ini. Coba ganti jenis, tanggal, atau kata kunci."
        />

        <nav className="vsf-paginasi" aria-label="Halaman aktivitas">
          <span className="tabular-nums">{rows.length} dari {total} aktivitas</span>
          <span className="vsf-paginasi-nomor">
            <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={loading || kueri.page <= 1} onClick={() => ubah({ page: kueri.page - 1 })} aria-label="Halaman sebelumnya">
              <Ikon nama="kiri" className="h-4 w-4" />
            </button>
            {nomorHalaman(kueri.page, totalHal).map((n, i) =>
              n === '…' ? (
                <span key={`e${i}`} aria-hidden className="px-1 text-abu">…</span>
              ) : (
                <button key={n} type="button" className="vsf-chip-ringkas vsf-chip-nomor" aria-pressed={n === kueri.page} aria-label={`Halaman ${n}`} disabled={loading} onClick={() => ubah({ page: n })}>
                  {n}
                </button>
              ),
            )}
            <button type="button" className="vsf-btn-secondary vsf-btn-kecil" disabled={loading || kueri.page >= totalHal} onClick={() => ubah({ page: kueri.page + 1 })} aria-label="Halaman berikutnya">
              <Ikon nama="kanan" className="h-4 w-4" />
            </button>
          </span>
          <label className="flex items-center gap-2">
            Per halaman
            <select className="vsf-input vsf-pilih-pendek" value={String(kueri.perPage)} onChange={(e) => ubah({ perPage: Number(e.target.value) })}>
              {[20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </nav>
      </MasterFrame>

      {pilih && <DetailAktivitas a={pilih} onTutup={() => setPilih(null)} />}
    </>
  )
}

function DetailAktivitas({ a, onTutup }: { a: Aktivitas; onTutup: () => void }) {
  return (
    <DialogKaca judul="Detail Aktivitas" lebar={600} onTutup={onTutup}>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="vsf-chip-ringkas">{NAMA_JENIS[a.jenis]}</span>
        <b className="text-[15px] text-tinta">{labelAktivitas(a.aksi)}</b>
        {a.status && <span className={clsx('vsf-chip-nilai', gagalAktivitas(a.status) ? 'is-kosong' : 'is-normal')}>{labelStatus(a.status)}</span>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div><dt className="vsf-label">Waktu</dt><dd className="text-tinta">{waktuLengkap(a.waktu)}</dd></div>
        <div><dt className="vsf-label">Pelaku</dt><dd className="text-tinta">{a.pelaku}</dd></div>
        {a.objek && <div><dt className="vsf-label">Data / perangkat</dt><dd className="text-tinta">{a.objek}{a.ref ? ` #${a.ref}` : ''}</dd></div>}
      </dl>
      <p className="mt-3 text-[13px] text-tinta">{ringkasAktivitas(a)}</p>
      {a.detail && (
        <details className="mt-3" open>
          <summary className="cursor-pointer text-[12.5px] font-semibold text-abu">Rincian teknis</summary>
          <pre className="mt-2 max-h-[300px] overflow-auto rounded-input bg-black/5 p-3 text-[11.5px] leading-relaxed">{JSON.stringify(a.detail, null, 2)}</pre>
        </details>
      )}
    </DialogKaca>
  )
}

export default AuditPage
