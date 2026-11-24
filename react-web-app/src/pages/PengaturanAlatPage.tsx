import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { tglJamPendek } from '../lib/riwayatSensor'
import { PageHeader } from '../components/PageHeader'
import { DialogKonfirmasi, Pesan, Rangka } from '../components/kaca/DialogKaca'
import { usePerintah } from '../components/kalibrasi/PanelFirmwareAlat'

type Parameter = {
  param: string
  kelompok: string
  label: string
  satuan: string
  min: number
  max: number
  bawaan: number
  ket: string
  penting?: boolean
  bulat?: boolean
  nilai: number
  diatur: boolean
  diubah_pada: string | null
  status_kirim: string | null
}
type Daftar = {
  kelompok: Record<string, string>
  alat: { kode: string; nama: string; online: boolean }[]
  data: Parameter[]
}

const koma = (v: number) => String(v).replace('.', ',')
const STATUS: Record<string, string> = {
  selesai: 'terkirim ke alat',
  menunggu: 'menunggu alat',
  dikirim: 'menunggu alat',
  gagal: 'ditolak alat',
  kedaluwarsa: 'tidak sampai (alat offline)',
  batal: 'dibatalkan',
}

/**
 * Pengaturan Alat (Kendali, admin): parameter firmware v6 — batas dosis, pengenceran, dan waktu — yang dulu hanya bisa diubah lewat kabel USB.
 * Rentang dan bawaan mengikuti firmware; nilai di luar rentang ditolak sebelum dikirim. Penilai peringatan memakai angka yang sama.
 * Yang diatur di menu lain: volume/monitoring/jeda (Master Meja), ppm per mL dan takaran pH (Uji Lab), laju pompa (Kalibrasi).
 */
export default function PengaturanAlatPage() {
  const handleApiError = useApiError()
  const [daftar, setDaftar] = useState<Daftar | null>(null)
  const [draf, setDraf] = useState<Record<string, string>>({})
  const [galat, setGalat] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [tanya, setTanya] = useState<null | 'simpan' | 'semua'>(null)
  const [galatDialog, setGalatDialog] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [idKonsol, setIdKonsol] = useState<number | string | null>(null)
  const hasilKonsol = usePerintah(idKonsol)

  const muat = useCallback(async () => {
    try {
      const r = await api.get('/pengaturan-alat')
      setDaftar(r.data as Daftar)
      setGalat(null)
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }, [handleApiError])

  useEffect(() => { void muat() }, [muat])
  useEffect(() => {
    if (!pesan) return
    const t = window.setTimeout(() => setPesan(null), 8000)
    return () => window.clearTimeout(t)
  }, [pesan])

  if (!daftar) return <div className="vsf-halaman"><PageHeader judul="Pengaturan Alat" />{galat ? <Pesan jenis="galat">{galat}</Pesan> : <Rangka />}</div>

  const nilaiDraf = (p: Parameter): number | null => {
    const t = draf[p.param]
    if (t === undefined) return p.nilai
    const n = Number(t.replace(',', '.'))
    return t.trim() === '' || !Number.isFinite(n) ? null : n
  }
  const berubah = daftar.data.filter((p) => draf[p.param] !== undefined && nilaiDraf(p) !== p.nilai)
  const kelompok = Object.entries(daftar.kelompok)

  async function simpan() {
    setSibuk(true)
    setGalatDialog(null)
    setFieldErrors({})
    try {
      const nilai: Record<string, number | string> = {}
      for (const p of berubah) nilai[p.param] = draf[p.param]
      const r = await api.put('/pengaturan-alat', { nilai })
      setPesan(String((r.data as { message?: string }).message ?? 'Tersimpan.'))
      setDraf({})
      setTanya(null)
      await muat()
    } catch (e) {
      const f = handleApiError(e)
      setFieldErrors(f.fieldErrors)
      setGalatDialog(f.message)
    } finally {
      setSibuk(false)
    }
  }

  async function bawaan(param?: string) {
    setSibuk(true)
    setGalatDialog(null)
    try {
      const r = await api.post('/pengaturan-alat/bawaan', param ? { param } : {})
      setPesan(String((r.data as { message?: string }).message ?? 'Dikembalikan ke bawaan.'))
      setDraf({})
      setTanya(null)
      await muat()
    } catch (e) {
      setGalatDialog(handleApiError(e).message)
    } finally {
      setSibuk(false)
    }
  }

  async function bacaDariAlat() {
    setGalat(null)
    try {
      const r = await api.post('/api/firmware/konsol', { baris: 'param' })
      setIdKonsol((r.data as { id_perintah?: number | string }).id_perintah ?? null)
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }

  const onlineSemua = daftar.alat.length > 0 && daftar.alat.every((a) => a.online)

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Pengaturan Alat"
        deskripsi="Batas dosis, pengenceran, dan waktu yang dipakai alat. Rentang mengikuti firmware: nilai di luar rentang ditolak sebelum dikirim. Peringatan di web memakai angka yang sama. Volume dan waktu monitoring ada di Master Data → Meja, takaran di Master Data → Uji Lab, laju pompa di Kalibrasi."
      />

      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}
      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {!onlineSemua && (
        <div role="status" className="vsf-tone-warn rounded-input px-4 py-3 text-[13px]">
          {daftar.alat.length === 0 ? 'Belum ada alat terdaftar.' : 'Alat sedang offline.'} Perubahan tetap tersimpan di web dan ikut terkirim saat alat tersambung dan saat Mulai Semai berikutnya.
        </div>
      )}

      {kelompok.map(([kode, judul]) => (
        <section key={kode} className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label={judul}>
          <div className="vsf-judul-bagian">{judul}</div>
          <div className="mt-3 grid gap-2.5">
            {daftar.data.filter((p) => p.kelompok === kode).map((p) => {
              const kotor = draf[p.param] !== undefined && nilaiDraf(p) !== p.nilai
              const err = fieldErrors[p.param]?.[0]
              return (
                <div key={p.param} className="vsf-blok grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-tinta">
                      {p.label}
                      {p.penting && <span className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-2 py-[1px] text-[10.5px] font-semibold text-amber-800">keselamatan</span>}
                    </div>
                    <div className="mt-0.5 text-[12.5px] leading-relaxed text-abu">{p.ket}</div>
                    <div className="mt-1 text-[12px] text-abu">
                      Bawaan {koma(p.bawaan)} {p.satuan} · rentang {koma(p.min)}–{koma(p.max)}
                      {' · '}
                      {p.diatur ? <b className="text-tinta">diatur{p.status_kirim ? `, ${STATUS[p.status_kirim] ?? p.status_kirim}` : ''}{p.diubah_pada ? ` (${tglJamPendek(new Date(p.diubah_pada).getTime())})` : ''}</b> : 'memakai bawaan'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        className="vsf-input w-full tabular-nums" inputMode="decimal" aria-label={p.label}
                        value={draf[p.param] ?? koma(p.nilai)}
                        onChange={(e) => setDraf((d) => ({ ...d, [p.param]: e.target.value }))}
                      />
                      <span className="w-10 shrink-0 text-[12px] text-abu">{p.satuan}</span>
                    </div>
                    {err && <div role="alert" className="mt-1 text-[12px] text-red-700">{err}</div>}
                    <div className="mt-1 flex gap-3">
                      {kotor && <button type="button" className="text-[12px] font-semibold text-arutmin-forest underline" onClick={() => setDraf((d) => { const n = { ...d }; delete n[p.param]; return n })}>Batalkan</button>}
                      {p.diatur && !kotor && <button type="button" className="text-[12px] font-semibold text-arutmin-forest underline" disabled={sibuk} onClick={() => void bawaan(p.param)}>Kembali ke bawaan</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="vsf-card flex flex-wrap items-center gap-2 p-4 sm:p-5">
        <button type="button" className="vsf-btn-primary" disabled={berubah.length === 0 || sibuk} onClick={() => { setGalatDialog(null); setTanya('simpan') }}>
          Simpan dan kirim ke alat{berubah.length ? ` (${berubah.length})` : ''}
        </button>
        <button type="button" className="vsf-btn-secondary" disabled={berubah.length === 0 || sibuk} onClick={() => setDraf({})}>Batalkan perubahan</button>
        <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={() => { setGalatDialog(null); setTanya('semua') }}>Kembalikan semua ke bawaan</button>
        <p className="w-full text-[12px] text-abu">Geser angkanya dulu: belum ada yang dikirim sampai tombol simpan ditekan.</p>
      </section>

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Nilai di alat">
        <div className="vsf-judul-bagian">Nilai yang sedang dipegang alat</div>
        <p className="mt-0.5 text-[12.5px] text-abu">Alat belum melaporkan parameternya otomatis, jadi dibaca lewat konsol alat (perintah param). Berguna untuk memastikan angka di alat sama dengan di web.</p>
        <button type="button" className="vsf-btn-secondary mt-3" onClick={() => void bacaDariAlat()}>Baca dari alat</button>
        {idKonsol !== null && (
          <pre className="mt-3 max-h-80 overflow-auto rounded-card bg-white/55 p-3 font-mono text-[11.5px] leading-snug text-tinta">
            {hasilKonsol ? (hasilKonsol.keluaran ?? `(${hasilKonsol.status}${hasilKonsol.alasan ? `: ${hasilKonsol.alasan}` : ''})`) : 'Menunggu jawaban alat…'}
          </pre>
        )}
      </section>

      {tanya === 'simpan' && (
        <DialogKonfirmasi
          judul="Kirim pengaturan ke alat?" ya="Ya, simpan dan kirim" bahaya={berubah.some((p) => p.penting)} sibuk={sibuk} galat={galatDialog ?? undefined}
          onYa={() => void simpan()} onBatal={() => setTanya(null)}
        >
          <ul className="mt-1 space-y-1 text-[13px]">
            {berubah.map((p) => (
              <li key={p.param}><b>{p.label}</b>: {koma(p.nilai)} → {nilaiDraf(p) == null ? '(kosong)' : koma(nilaiDraf(p) as number)} {p.satuan}{p.penting ? ' (keselamatan)' : ''}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12.5px]">Alat langsung memakai angka baru. Perubahan dicatat di Catatan Aktivitas.</p>
        </DialogKonfirmasi>
      )}
      {tanya === 'semua' && (
        <DialogKonfirmasi
          judul="Kembalikan semua ke bawaan firmware?" ya="Ya, kembalikan" bahaya sibuk={sibuk} galat={galatDialog ?? undefined}
          onYa={() => void bawaan()} onBatal={() => setTanya(null)}
        >
          Semua angka di halaman ini kembali ke bawaan firmware dan dikirim ke alat.
        </DialogKonfirmasi>
      )}
    </div>
  )
}
