import { useEffect, useRef, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'

/**
 * CCTV greenhouse — papan kamera nyata.
 *   GET /cctv (semua role) · POST/PUT/DELETE /cctv (admin; demo hanya baca)
 *   - 'mjpeg'    → <img> aliran MJPEG langsung dari kamera (ESP32-CAM: http://IP:81/stream)
 *   - 'snapshot' → <img> JPEG langsung dari kamera, dimuat ulang tiap N detik (http://IP/capture)
 *   - 'rtsp'     → kamera RTSP (EZVIZ H8C, kamera IP): server mengambil frame lewat ffmpeg,
 *                  browser memuat GET /cctv/:id/gambar (membawa login) tiap N detik. URL berisi
 *                  sandi kamera tidak pernah sampai ke browser; HP tak perlu satu jaringan dengan kamera.
 */

type Kamera = {
  id: number | string
  nama: string
  lokasi: string | null
  tipe: Tipe
  /** null untuk 'rtsp' bila bukan admin; admin menerima URL dengan sandi `***` */
  url: string | null
  interval_detik: number
  aktif: boolean
}

type Tipe = 'mjpeg' | 'snapshot' | 'rtsp'
type Form = { nama: string; lokasi: string; tipe: Tipe; url: string; interval_detik: string; aktif: boolean }

const CONTOH_URL: Record<Tipe, string> = {
  snapshot: 'http://192.168.1.50/capture',
  mjpeg: 'http://192.168.1.50:81/stream',
  rtsp: 'rtsp://admin:KODEVERIFIKASI@192.168.1.60:554/ch1/main',
}

const KOSONG: Form = { nama: '', lokasi: '', tipe: 'snapshot', url: '', interval_detik: '5', aktif: true }

function sambung(url: string, t: number) {
  return `${url}${url.includes('?') ? '&' : '?'}_t=${t}`
}

/**
 * Sumber gambar satu kamera. http(s): URL langsung (+ penanda waktu untuk snapshot).
 * rtsp: unduh JPEG dari server lewat `api` (token login ikut) → object URL, diperbarui tiap interval.
 */
function useSumber(k: Kamera, coba: number): { src: string | null; gagal: boolean } {
  const [tik, setTik] = useState(() => Date.now())
  const [blob, setBlob] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const blobRef = useRef<string | null>(null)

  useEffect(() => {
    if (!k.aktif || k.tipe === 'mjpeg') return
    const id = window.setInterval(() => setTik(Date.now()), Math.max(1, k.interval_detik) * 1000)
    return () => window.clearInterval(id)
  }, [k.aktif, k.tipe, k.interval_detik])

  useEffect(() => {
    if (!k.aktif || k.tipe !== 'rtsp') return
    let batal = false
    api
      .get<Blob>(`/cctv/${k.id}/gambar`, { responseType: 'blob' })
      .then((r) => {
        if (batal) return
        const u = URL.createObjectURL(r.data)
        if (blobRef.current) URL.revokeObjectURL(blobRef.current)
        blobRef.current = u
        setBlob(u)
        setGagal(false)
      })
      .catch(() => { if (!batal) setGagal(true) })
    return () => { batal = true }
  }, [k.id, k.aktif, k.tipe, tik, coba])

  // lepas object URL terakhir saat ubin hilang
  useEffect(() => () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current) }, [])

  if (k.tipe === 'rtsp') return { src: blob, gagal: gagal && !blob }
  return { src: sambung(k.url ?? '', k.tipe === 'snapshot' ? tik : coba), gagal: false }
}

/** Satu ubin kamera: status memuat / tayang / terputus. */
function Ubin({ k, onPerbesar }: { k: Kamera; onPerbesar: (k: Kamera) => void }) {
  const [galatImg, setGalat] = useState(false)
  const [muat, setMuat] = useState(true)
  const [coba, setCoba] = useState(0)
  // Snapshot/RTSP: muat ulang berkala. MJPEG: satu sambungan, coba lagi manual.
  const { src, gagal } = useSumber(k, coba)
  const galat = galatImg || gagal
  const status = !k.aktif ? 'nonaktif' : galat ? 'terputus' : muat ? 'memuat' : 'tayang'

  return (
    <article className="vsf-card overflow-hidden">
      <div className="relative aspect-video w-full bg-navy">
        {k.aktif && src ? (
          <img
            key={k.tipe === 'mjpeg' ? coba : 'snap'}
            src={src}
            alt={`Tayangan kamera ${k.nama}`}
            className={clsx('h-full w-full object-cover', (galat || muat) && 'opacity-0')}
            onLoad={() => {
              setGalat(false)
              setMuat(false)
            }}
            onError={() => {
              setGalat(true)
              setMuat(false)
            }}
          />
        ) : null}
        {status !== 'tayang' && (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-[12.5px] text-white/75">
            {status === 'memuat' && <span className="vsf-spinner" aria-label="Memuat tayangan" />}
            {status === 'terputus' && (
              <div>
                <div className="font-bold text-white">Feed terputus</div>
                <div className="mt-1">{k.tipe === 'rtsp' ? 'Kamera tidak merespons ke server. Periksa kamera menyala dan URL RTSP-nya.' : 'Periksa kamera dan URL-nya.'}</div>
                <button
                  type="button"
                  className="vsf-btn-secondary mt-3 !min-h-[34px] !text-[12px]"
                  onClick={() => {
                    setGalat(false)
                    setMuat(true)
                    setCoba((n) => n + 1)
                  }}
                >
                  Coba lagi
                </button>
              </div>
            )}
            {status === 'nonaktif' && <div className="font-semibold">Kamera dinonaktifkan</div>}
          </div>
        )}
        <span
          className={clsx(
            'absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold',
            status === 'tayang' ? 'bg-black/55 text-white' : 'bg-black/45 text-white/80',
          )}
        >
          <span
            className={clsx(
              'h-2 w-2 rounded-full',
              status === 'tayang' ? 'bg-red-500' : status === 'terputus' ? 'bg-amber-400' : 'bg-slate-400',
            )}
            aria-hidden
          />
          {status === 'tayang' ? 'LIVE' : status === 'terputus' ? 'TERPUTUS' : status === 'memuat' ? 'MEMUAT' : 'MATI'}
        </span>
      </div>
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-tinta">{k.nama}</div>
          <div className="truncate text-[12px] text-slate-500">
            {k.lokasi || 'Tanpa lokasi'} · {k.tipe === 'mjpeg' ? 'Aliran MJPEG' : k.tipe === 'rtsp' ? `RTSP lewat server · tiap ${k.interval_detik} dtk` : `Snapshot tiap ${k.interval_detik} dtk`}
          </div>
        </div>
        <button
          type="button"
          className="vsf-btn-secondary !min-h-[44px] sm:!min-h-[36px] !text-[12px]"
          disabled={!k.aktif}
          onClick={() => onPerbesar(k)}
        >
          Perbesar
        </button>
      </div>
    </article>
  )
}

export default function CctvPage() {
  const { role, demo } = useAuth()
  const admin = role === 'admin' && !demo
  const handleApiError = useApiError()
  const { rows, loading, error, reload } = useApiList<Kamera>('/cctv')

  const [besar, setBesar] = useState<Kamera | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [editId, setEditId] = useState<number | string | null>(null)
  const [fe, setFe] = useState<Record<string, string[]>>({})
  const [simpan, setSimpan] = useState(false)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)

  // Tutup tampilan besar dengan Esc.
  useEffect(() => {
    if (!besar) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setBesar(null)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [besar])

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 5000)
    return () => window.clearTimeout(id)
  }, [pesan])

  function buka(k?: Kamera) {
    setFe({})
    if (k) {
      setEditId(k.id)
      setForm({
        nama: k.nama,
        lokasi: k.lokasi ?? '',
        tipe: k.tipe,
        url: k.url ?? '',
        interval_detik: String(k.interval_detik),
        aktif: k.aktif,
      })
    } else {
      setEditId(null)
      setForm({ ...KOSONG })
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form || simpan) return
    setSimpan(true)
    setFe({})
    const body = {
      nama: form.nama,
      lokasi: form.lokasi,
      tipe: form.tipe,
      url: form.url,
      interval_detik: Number(form.interval_detik),
      aktif: form.aktif,
    }
    try {
      if (editId === null) await api.post('/cctv', body)
      else await api.put(`/cctv/${editId}`, body)
      setPesan({ ok: true, teks: editId === null ? 'Kamera ditambahkan.' : 'Kamera diperbarui.' })
      setForm(null)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setFe(f.fieldErrors)
      if (!Object.keys(f.fieldErrors).length) setPesan({ ok: false, teks: f.message })
    } finally {
      setSimpan(false)
    }
  }

  async function hapus(k: Kamera) {
    if (!window.confirm(`Hapus kamera “${k.nama}”?`)) return
    try {
      await api.delete(`/cctv/${k.id}`)
      setPesan({ ok: true, teks: 'Kamera dihapus.' })
      reload()
    } catch (err) {
      setPesan({ ok: false, teks: handleApiError(err).message })
    }
  }

  const aktifN = rows.filter((k) => k.aktif).length

  return (
    <div className="vsf-halaman vsf-stagger">
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[.14em] text-slate-500">CCTV greenhouse</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Pantau greenhouse, nursery, dan area tandon. Kamera RTSP (EZVIZ) diambil lewat server; snapshot dan MJPEG
              ditarik langsung dari kamera di jaringan Anda.
            </p>
          </div>
          <span className="flex-1" />
          <span className="vsf-pill border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest">
            {aktifN}/{rows.length} kamera aktif
          </span>
          {admin && (
            <button type="button" className="vsf-btn-primary" onClick={() => buka()}>
              Tambah kamera
            </button>
          )}
        </div>
        {pesan && (
          <div
            role={pesan.ok ? 'status' : 'alert'}
            className={clsx(
              'vsf-banner mt-3 rounded-input border px-3 py-2 text-[13px]',
              pesan.ok ? 'border-arutmin-moss/50 bg-arutmin-mint/40 text-arutmin-forest' : 'vsf-tone-error',
            )}
          >
            {pesan.teks}
          </div>
        )}
      </section>

      {form && admin && (
        <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-labelledby="vsf-cctv-form">
          <div id="vsf-cctv-form" className="text-[14px] font-bold text-tinta">
            {editId === null ? 'Tambah kamera' : 'Ubah kamera'}
          </div>
          <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[12.5px] font-semibold text-slate-700">
              Nama
              <input className="vsf-input" value={form.nama} maxLength={100} required
                aria-invalid={!!fieldError(fe, 'nama')}
                onChange={(e) => setForm({ ...form, nama: e.target.value })} />
              <span className="text-[12px] font-normal text-red-700">{fieldError(fe, 'nama')}</span>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-slate-700">
              Lokasi
              <input className="vsf-input" value={form.lokasi} maxLength={100} placeholder="mis. Greenhouse A"
                onChange={(e) => setForm({ ...form, lokasi: e.target.value })} />
              <span className="text-[12px] font-normal text-red-700">{fieldError(fe, 'lokasi')}</span>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-slate-700 sm:col-span-2">
              URL kamera
              <input className="vsf-input" value={form.url} required placeholder={CONTOH_URL[form.tipe]}
                autoComplete="off" spellCheck={false}
                aria-invalid={!!fieldError(fe, 'url')}
                onChange={(e) => setForm({ ...form, url: e.target.value })} />
              {form.tipe === 'rtsp' && (
                <span className="text-[12px] font-normal leading-relaxed text-slate-600">
                  EZVIZ: sandi = kode verifikasi 6 huruf di stiker kamera. Sandi disimpan di server dan tampil sebagai *** —
                  biarkan *** saat mengubah bila sandinya tetap.
                </span>
              )}
              <span className="text-[12px] font-normal text-red-700">{fieldError(fe, 'url')}</span>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-slate-700">
              Jenis tayangan
              <select className="vsf-input" value={form.tipe}
                onChange={(e) => setForm({ ...form, tipe: e.target.value as Form['tipe'] })}>
                <option value="rtsp">RTSP lewat server (EZVIZ / kamera IP)</option>
                <option value="snapshot">Snapshot (JPEG dimuat ulang)</option>
                <option value="mjpeg">Aliran MJPEG</option>
              </select>
            </label>
            <label className="grid gap-1 text-[12.5px] font-semibold text-slate-700">
              Interval muat ulang (detik)
              <input className="vsf-input" type="number" min={1} max={60} value={form.interval_detik}
                disabled={form.tipe === 'mjpeg'}
                aria-invalid={!!fieldError(fe, 'interval_detik')}
                onChange={(e) => setForm({ ...form, interval_detik: e.target.value })} />
              <span className="text-[12px] font-normal text-red-700">{fieldError(fe, 'interval_detik')}</span>
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} />
              Kamera aktif
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="vsf-btn-secondary" onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className="vsf-btn-primary" disabled={simpan}>{simpan ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Memuat daftar kamera">
          {[0, 1, 2].map((i) => <div key={i} className="vsf-skeleton h-[220px] rounded-card" />)}
        </div>
      ) : error ? (
        <div role="alert" className="vsf-card p-4 sm:p-5 text-[13px] text-red-700">{error}</div>
      ) : rows.length === 0 ? (
        <section className="vsf-card w-full min-w-0 p-6">
          <div className="rounded-card border border-dashed border-arutmin-border px-4 py-8 text-center">
            <div className="text-[15px] font-bold text-tinta">Belum ada kamera</div>
            <p className="mx-auto mt-1 max-w-[460px] text-[13px] text-slate-600">
              {admin
                ? 'Tambahkan kamera pertama: RTSP untuk EZVIZ / kamera IP, atau snapshot / MJPEG dari ESP32-CAM.'
                : 'Admin belum menambahkan kamera.'}
            </p>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 vsf-stagger">
          {rows.map((k) => (
            <div key={k.id} className="min-w-0">
              <Ubin k={k} onPerbesar={setBesar} />
              {admin && (
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" className="vsf-btn-secondary !min-h-[34px] !text-[12px]" onClick={() => buka(k)}>Ubah</button>
                  <button type="button" className="vsf-btn-danger !min-h-[34px] !text-[12px]" onClick={() => void hapus(k)}>Hapus</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {besar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Tayangan besar ${besar.nama}`}
          onMouseDown={(e) => e.target === e.currentTarget && setBesar(null)}
        >
          <div className="w-full max-w-[1000px]">
            <div className="mb-2 flex items-center gap-2 text-white">
              <div className="min-w-0 flex-1 truncate text-[15px] font-bold">{besar.nama}</div>
              <button type="button" className="vsf-btn-secondary" onClick={() => setBesar(null)}>Tutup</button>
            </div>
            <BesarGambar k={besar} />
          </div>
        </div>
      )}
    </div>
  )
}

function BesarGambar({ k }: { k: Kamera }) {
  const { src, gagal } = useSumber(k, 0)
  if (!src) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-card bg-navy text-[13px] text-white/80">
        {gagal ? 'Kamera tidak merespons.' : <span className="vsf-spinner" aria-label="Memuat tayangan" />}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={`Tayangan kamera ${k.nama}`}
      className="max-h-[80dvh] w-full rounded-card bg-navy object-contain"
    />
  )
}
