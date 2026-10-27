import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { fieldError, useApiError, useApiList } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { ModalBackdrop } from '../components/ModalBackdrop'

/**
 * Kalibrasi alat IoT — routes/kalibrasi.js:
 *   GET /kalibrasi · GET /kalibrasi/:sensor/riwayat · POST /kalibrasi/:sensor · PUT /kalibrasi/:sensor
 * Jadwal & status tiap alat, langkah kerja, pencatatan hasil, dan kalkulator konstanta firmware
 * (PH_V7 / PH_V4 / TDS_FAKTOR_KOREKSI di deploy-pi/firmware/sensor/sensor.ino).
 */

type Alat = {
  sensor: string
  label: string | null
  metode: string
  larutan_ref: string | null
  nilai_ref: string | number | null
  satuan: string | null
  periode_hari_min: number | null
  periode_hari_max: number | null
  penyimpanan: string | null
  hasil_ukur: string | number | null
  terakhir_dikalibrasi: string | null
  keterangan: string | null
  toleransi: string | number | null
  konstanta: Record<string, number> | null
  perangkat_kode: string | null
  perangkat_nama: string | null
  perangkat_online: boolean | null
  log_terakhir: { dilakukan_pada: string; lulus: boolean | null; oleh_label: string | null } | null
  status: 'terlambat' | 'segera' | 'aman' | 'belum' | 'tanpa_jadwal'
  jatuh_tempo: string | null
}

type Log = {
  id: number | string
  dilakukan_pada: string
  nilai_ref: string | number | null
  bacaan_sebelum: string | number | null
  bacaan_sesudah: string | number | null
  lulus: boolean | null
  konstanta_lama: Record<string, number> | null
  konstanta_baru: Record<string, number> | null
  catatan: string | null
  oleh_label: string | null
}

type Terkini = {
  is_online?: boolean
  seconds_ago?: number | null
  sensor?: { ph?: number | null; tds?: number | null; ec_ms_cm?: number | null; waterTemp?: number | null; airTemp?: number | null; humidity?: number | null } | null
}

const STATUS: Record<Alat['status'], { label: string; kelas: string }> = {
  terlambat: { label: 'Terlambat', kelas: 'border-red-600/40 bg-red-50 text-red-700' },
  segera: { label: 'Segera', kelas: 'border-amber-500/50 bg-amber-50 text-amber-800' },
  aman: { label: 'Aman', kelas: 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' },
  belum: { label: 'Belum pernah', kelas: 'border-navy/25 bg-navy/[.05] text-navy' },
  tanpa_jadwal: { label: 'Sesuai kebutuhan', kelas: 'border-slate-300 bg-slate-50 text-slate-600' },
}

/** Langkah kerja per alat (pH/EC mengikuti cara kalibrasi di firmware sensor.ino). */
const LANGKAH: Record<string, string[]> = {
  ph: [
    'Bilas probe dengan air suling, tiriskan dengan tisu (jangan digosok).',
    'Celup ke buffer pH 6,86. Tunggu bacaan stabil ±1 menit, lalu isi "Bacaan di buffer 1".',
    'Bilas lagi, celup ke buffer pH 4,00. Tunggu stabil, isi "Bacaan di buffer 2".',
    'Simpan → salin PH_V7 dan PH_V4 baru ke sensor.ino, unggah ulang firmware.',
    'Cek ulang di buffer 6,86: selisih harus ≤ toleransi. Simpan probe terendam larutan KCl.',
  ],
  ec: [
    'Bilas probe dengan air suling dan tiriskan.',
    'Celup ke larutan standar 1413 µS/cm (suhu ±25 °C). Tunggu bacaan stabil.',
    'Isi bacaan TDS (ppm) yang tampil di sistem.',
    'Simpan → salin TDS_FAKTOR_KOREKSI baru ke sensor.ino, unggah ulang firmware.',
    'Cek ulang: larutan 1413 µS/cm harus terbaca ±706 ppm.',
  ],
  suhu_air: [
    'Celup termometer referensi dan probe suhu di air yang sama selama 5 menit.',
    'Isi suhu referensi dan bacaan sistem. Lulus bila selisih ≤ toleransi.',
  ],
  suhu_udara: [
    'Letakkan termo-higrometer referensi tepat di samping sensor, terlindung sinar matahari langsung, 15 menit.',
    'Isi suhu referensi dan bacaan sistem; catat juga selisih kelembapan di catatan.',
  ],
  pulsa_peristaltik: [
    'Jalankan pompa 10 detik ke gelas ukur (atau timbang airnya, 1 g ≈ 1 mL).',
    'Ulangi 3 kali, isi rata-rata mL/detik sebagai hasil. Lakukan untuk tiap pompa (A, B, pH Up, pH Down) dan tulis di catatan.',
  ],
}

const n = (v: unknown, d = 2): string => {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v)
  return Number.isFinite(x) ? String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',') : String(v)
}
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const tgl = (iso?: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}
const angkaIsian = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')))
/** Konstanta urut seperti di sensor.ino (PH_V7 sebelum PH_V4); jsonb mengurutkan kunci sendiri. */
const URUT_KONSTANTA = ['PH_V7', 'PH_V4', 'TDS_FAKTOR_KOREKSI']
const urutKonstanta = (k: Record<string, number>) => Object.entries(k)
  .sort(([a], [b]) => (URUT_KONSTANTA.indexOf(a) + 1 || 99) - (URUT_KONSTANTA.indexOf(b) + 1 || 99))
/** Potongan kode firmware siap tempel. */
const potongan = (k: Record<string, number>) => urutKonstanta(k).map(([nama, v]) => `const float ${nama} = ${v}f;`).join('\n')

function Kartu({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('vsf-card w-full min-w-0 p-4', className)}>{children}</section>
}

function Modal({ judul, onTutup, children, lebar = 'max-w-[520px]' }: { judul: string; onTutup: () => void; children: ReactNode; lebar?: string }) {
  return (
    <ModalBackdrop onMouseDown={(e) => { if (e.target === e.currentTarget) onTutup() }}>
      <div role="dialog" aria-modal="true" aria-label={judul} onKeyDown={(e) => { if (e.key === 'Escape') onTutup() }}
        className={clsx('w-full rounded-card bg-white p-5 vsf-modal-card max-h-[90vh] overflow-auto', lebar)}>
        <div className="text-[11px] uppercase tracking-[.14em] font-bold text-slate-500">{judul}</div>
        {children}
      </div>
    </ModalBackdrop>
  )
}

function Isian({ label, value, onChange, galat, contoh, aksi }: { label: string; value: string; onChange: (v: string) => void; galat?: string; contoh?: string; aksi?: ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold text-slate-700">
      {label}
      <span className="mt-1 flex gap-2">
        <input className="vsf-input w-full" inputMode="decimal" value={value} placeholder={contoh} onChange={(e) => onChange(e.target.value)} />
        {aksi}
      </span>
      {galat && <span className="mt-1 block text-[12px] font-normal text-red-700">{galat}</span>}
    </label>
  )
}

/* ── modal catat kalibrasi ─────────────────────────────────────────── */
function CatatKalibrasi({ alat, terkini, onSelesai, onTutup }: { alat: Alat; terkini: Terkini | null; onSelesai: () => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const [f, setF] = useState<Record<string, string>>({
    buffer1: '6.86', buffer2: '4.00', ref_us_cm: alat.nilai_ref != null ? String(Number(alat.nilai_ref)) : '1413',
    nilai_ref: alat.nilai_ref != null ? String(Number(alat.nilai_ref)) : '', lulus: '',
  })
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const [hasil, setHasil] = useState<Log | null>(null)
  const [disalin, setDisalin] = useState(false)
  const ubah = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const live = terkini?.sensor ?? null
  const ambilLive = (k: string, v: number | null | undefined) => (
    <button type="button" className="vsf-btn-secondary min-h-[40px] shrink-0 px-3 text-[12.5px]" disabled={v == null}
      onClick={() => setF((s) => ({ ...s, [k]: v == null ? '' : String(v) }))} title="Isi dengan bacaan sistem saat ini">
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
      <Modal judul={`Kalibrasi tersimpan · ${alat.label ?? alat.sensor}`} onTutup={onSelesai}>
        <p className="mt-3 text-[13.5px] text-slate-700">
          Ganti baris berikut di <code className="rounded bg-arutmin-mint/60 px-1">deploy-pi/firmware/sensor/sensor.ino</code>, lalu unggah ulang firmware ke ESP32 sensor.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-std bg-navy p-3 text-[13px] text-emas">{kode}</pre>
        <div className="mt-2 text-[12px] text-slate-500">
          Sebelumnya: {hasil.konstanta_lama ? urutKonstanta(hasil.konstanta_lama).map(([k, v]) => `${k} = ${v}`).join(' · ') : '—'}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="vsf-btn-secondary" onClick={() => { void navigator.clipboard?.writeText(kode).then(() => setDisalin(true)) }}>
            {disalin ? 'Tersalin' : 'Salin kode'}
          </button>
          <button type="button" className="vsf-btn-primary" onClick={onSelesai}>Selesai</button>
        </div>
      </Modal>
    )
  }

  const langkah = LANGKAH[alat.sensor] ?? [alat.metode]
  const e = (k: string) => fieldError(errs, k)
  return (
    <Modal judul={`Catat kalibrasi · ${alat.label ?? alat.sensor}`} onTutup={onTutup}>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate-700">
        {langkah.map((l) => <li key={l}>{l}</li>)}
      </ol>
      <form className="mt-4 grid gap-3" onSubmit={(ev) => { ev.preventDefault(); void simpan() }}>
        {alat.sensor === 'ph' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Isian label="Buffer 1 (pH)" value={f.buffer1} onChange={ubah('buffer1')} galat={e('buffer1')} />
              <Isian label="Bacaan di buffer 1" value={f.baca1 ?? ''} onChange={ubah('baca1')} galat={e('baca1')} contoh="7,06" aksi={ambilLive('baca1', live?.ph)} />
              <Isian label="Buffer 2 (pH)" value={f.buffer2} onChange={ubah('buffer2')} galat={e('buffer2')} />
              <Isian label="Bacaan di buffer 2" value={f.baca2 ?? ''} onChange={ubah('baca2')} galat={e('baca2')} contoh="4,30" aksi={ambilLive('baca2', live?.ph)} />
            </div>
            {e('konstanta') && <div className="text-[12px] text-red-700">{e('konstanta')}</div>}
          </>
        )}
        {alat.sensor === 'ec' && (
          <div className="grid grid-cols-2 gap-3">
            <Isian label="Larutan standar (µS/cm)" value={f.ref_us_cm} onChange={ubah('ref_us_cm')} galat={e('ref_us_cm')} />
            <Isian label="Bacaan TDS sistem (ppm)" value={f.baca_ppm ?? ''} onChange={ubah('baca_ppm')} galat={e('baca_ppm') ?? e('konstanta')} contoh="650" aksi={ambilLive('baca_ppm', live?.tds)} />
          </div>
        )}
        {alat.sensor !== 'ph' && alat.sensor !== 'ec' && (
          <>
            <div className="grid grid-cols-2 gap-3">
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
        {errs.umum && <div role="alert" className="rounded-std border border-red-600/50 bg-red-50 px-3 py-2 text-[13px] text-red-700">{errs.umum[0]}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
          <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : alat.sensor === 'ph' || alat.sensor === 'ec' ? 'Hitung & simpan' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── modal riwayat ─────────────────────────────────────────────────── */
function Riwayat({ alat, onTutup }: { alat: Alat; onTutup: () => void }) {
  const { rows, loading, error } = useApiList<Log>(`/kalibrasi/${alat.sensor}/riwayat`)
  return (
    <Modal judul={`Riwayat kalibrasi · ${alat.label ?? alat.sensor}`} onTutup={onTutup} lebar="max-w-[760px]">
      {error && <div className="mt-3 text-[13px] text-red-700">{error}</div>}
      <div className="mt-3 overflow-x-auto rounded-card border border-arutmin-border">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-navy/[.055] text-left text-[11px] uppercase tracking-[.12em] text-navy">
            <th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Bacaan</th>
            <th className="px-3 py-2">Konstanta baru</th><th className="px-3 py-2">Hasil</th><th className="px-3 py-2">Oleh · catatan</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-4"><div className="vsf-skeleton h-5 w-full rounded" /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Belum ada kalibrasi tercatat.</td></tr>
                : rows.map((l) => (
                  <tr key={String(l.id)} className="even:bg-navy/[.03] align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{tgl(l.dilakukan_pada)}</td>
                    <td className="px-3 py-2">{n(l.nilai_ref)}</td>
                    <td className="px-3 py-2">{l.bacaan_sesudah != null ? n(l.bacaan_sesudah) : n(l.bacaan_sebelum)}</td>
                    <td className="px-3 py-2 font-mono text-[12px]">{l.konstanta_baru ? urutKonstanta(l.konstanta_baru).map(([k, v]) => `${k}=${v}`).join(' ') : '—'}</td>
                    <td className="px-3 py-2">{l.lulus == null ? '—' : l.lulus ? 'Lulus' : 'Tidak lulus'}</td>
                    <td className="px-3 py-2">{l.oleh_label ?? '—'}{l.catatan ? ` · ${l.catatan}` : ''}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end"><button type="button" className="vsf-btn-secondary" onClick={onTutup}>Tutup</button></div>
    </Modal>
  )
}

/* ── modal atur jadwal & konstanta ─────────────────────────────────── */
function Atur({ alat, onSelesai, onTutup }: { alat: Alat; onSelesai: () => void; onTutup: () => void }) {
  const handleApiError = useApiError()
  const isi = (v: unknown) => (v == null ? '' : String(Number(v)))
  const [f, setF] = useState<Record<string, string>>({
    periode_hari_min: isi(alat.periode_hari_min), periode_hari_max: isi(alat.periode_hari_max), toleransi: isi(alat.toleransi),
    larutan_ref: alat.larutan_ref ?? '', nilai_ref: isi(alat.nilai_ref),
    ...Object.fromEntries(Object.entries(alat.konstanta ?? {}).map(([k, v]) => [`k_${k}`, String(v)])),
  })
  const [errs, setErrs] = useState<Record<string, string[]>>({})
  const [sibuk, setSibuk] = useState(false)
  const kunciKonstanta = Object.keys(alat.konstanta ?? {})
  async function simpan() {
    setSibuk(true)
    setErrs({})
    const body: Record<string, unknown> = {
      periode_hari_min: angkaIsian(f.periode_hari_min), periode_hari_max: angkaIsian(f.periode_hari_max), toleransi: angkaIsian(f.toleransi),
      larutan_ref: f.larutan_ref.trim() || null, nilai_ref: angkaIsian(f.nilai_ref),
    }
    if (kunciKonstanta.length) body.konstanta = Object.fromEntries(kunciKonstanta.map((k) => [k, angkaIsian(f[`k_${k}`] ?? '')]))
    try {
      await api.put(`/kalibrasi/${alat.sensor}`, body)
      onSelesai()
    } catch (e) {
      const g = handleApiError(e)
      setErrs(Object.keys(g.fieldErrors).length ? g.fieldErrors : { umum: [g.message] })
    } finally {
      setSibuk(false)
    }
  }
  const ubah = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  return (
    <Modal judul={`Atur · ${alat.label ?? alat.sensor}`} onTutup={onTutup}>
      <form className="mt-3 grid grid-cols-2 gap-3" onSubmit={(ev) => { ev.preventDefault(); void simpan() }}>
        <Isian label="Kalibrasi paling cepat (hari)" value={f.periode_hari_min} onChange={ubah('periode_hari_min')} galat={fieldError(errs, 'periode_hari_min')} />
        <Isian label="Batas waktu (hari)" value={f.periode_hari_max} onChange={ubah('periode_hari_max')} galat={fieldError(errs, 'periode_hari_max')} />
        <Isian label={`Toleransi${alat.satuan ? ` (${alat.satuan})` : ''}`} value={f.toleransi} onChange={ubah('toleransi')} galat={fieldError(errs, 'toleransi')} />
        <Isian label="Nilai referensi" value={f.nilai_ref} onChange={ubah('nilai_ref')} galat={fieldError(errs, 'nilai_ref')} />
        <label className="col-span-2 block text-[13px] font-semibold text-slate-700">
          Larutan / alat referensi
          <input className="vsf-input mt-1 w-full" value={f.larutan_ref} onChange={(ev) => ubah('larutan_ref')(ev.target.value)} />
        </label>
        {kunciKonstanta.map((k) => (
          <Isian key={k} label={`Konstanta firmware ${k}`} value={f[`k_${k}`] ?? ''} onChange={ubah(`k_${k}`)} />
        ))}
        {(fieldError(errs, 'konstanta') || errs.umum) && <div className="col-span-2 text-[12.5px] text-red-700">{fieldError(errs, 'konstanta') ?? errs.umum?.[0]}</div>}
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" className="vsf-btn-secondary" onClick={onTutup} disabled={sibuk}>Batal</button>
          <button type="submit" className="vsf-btn-primary" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── halaman ───────────────────────────────────────────────────────── */
export default function KalibrasiPage() {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const { rows, loading, error, reload } = useApiList<Alat>('/kalibrasi')
  const { data: terkini } = useApiObject<Terkini>('/api/latest-sensor', { pollMs: 5_000 })
  const [catat, setCatat] = useState<Alat | null>(null)
  const [riwayat, setRiwayat] = useState<Alat | null>(null)
  const [atur, setAtur] = useState<Alat | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const hitung = (s: Alat['status']) => rows.filter((r) => r.status === s).length
  const s = terkini?.sensor ?? null
  const online = !!terkini?.is_online

  return (
    <div className="mx-auto w-full max-w-[1180px] grid grid-cols-[minmax(0,1fr)] gap-4 vsf-stagger">
      <Kartu>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 max-w-[680px]">
            <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Kalibrasi alat IoT</div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Sensor yang tidak dikalibrasi tetap mengirim angka yang terlihat wajar tetapi salah, dan dosing otomatis akan
              mengikutinya. Ikuti jadwal di bawah, catat hasilnya, dan untuk pH/EC salin konstanta baru ke firmware.
            </p>
          </div>
          <span className="flex-1" />
          <div className="flex flex-wrap gap-2">
            {(['terlambat', 'segera', 'belum', 'aman'] as const).map((k) => (
              <span key={k} className={clsx('vsf-pill', STATUS[k].kelas)}>{STATUS[k].label}: {hitung(k)}</span>
            ))}
          </div>
        </div>
      </Kartu>

      <Kartu>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Bacaan sensor saat ini</div>
          <span className={clsx('vsf-pill', online ? 'border-arutmin-moss bg-arutmin-mint/50 text-arutmin-forest' : 'border-amber-500/50 bg-amber-50 text-amber-800')}>
            {online ? 'Perangkat online · diperbarui tiap 5 detik' : 'Perangkat offline — bacaan bisa sudah lama'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['pH', n(s?.ph)], ['TDS', s?.tds != null ? `${n(s.tds, 0)} ppm` : '—'], ['EC', s?.ec_ms_cm != null ? `${n(s.ec_ms_cm)} mS/cm` : '—'],
            ['Suhu air', s?.waterTemp != null ? `${n(s.waterTemp, 1)} °C` : '—'], ['Suhu udara', s?.airTemp != null ? `${n(s.airTemp, 1)} °C` : '—'],
            ['Kelembapan', s?.humidity != null ? `${n(s.humidity, 0)} %` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-std border border-arutmin-border bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-[.12em] text-slate-500 font-bold">{k}</div>
              <div className="mt-0.5 text-[18px] font-bold tabular-nums text-slate-900">{v}</div>
            </div>
          ))}
        </div>
      </Kartu>

      {pesan && <div role="status" className="vsf-banner rounded-input border border-arutmin-moss/50 bg-arutmin-mint/40 px-3 py-2 text-[13px] text-arutmin-forest">{pesan}</div>}
      {error && !loading && <div role="alert" className="rounded-card border border-red-600/40 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {loading && rows.length === 0
          ? [0, 1, 2, 3].map((i) => <div key={i} className="vsf-card p-4"><div className="vsf-skeleton h-28 w-full rounded" /></div>)
          : rows.map((a) => (
            <Kartu key={a.sensor} className={a.status === 'terlambat' ? 'border-red-600/40' : undefined}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-bold text-slate-900">{a.label ?? a.sensor}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                    {a.perangkat_kode ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={clsx('h-2 w-2 rounded-full', a.perangkat_online ? 'bg-emerald-500' : 'bg-slate-400')} aria-hidden />
                        {a.perangkat_nama ?? a.perangkat_kode}
                      </span>
                    ) : 'Tanpa perangkat (diukur manual)'}
                  </div>
                </div>
                <span className={clsx('vsf-pill shrink-0', STATUS[a.status].kelas)}>{STATUS[a.status].label}</span>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-slate-500">Metode</dt><dd className="text-slate-800">{a.metode}</dd>
                {a.larutan_ref && <><dt className="text-slate-500">Referensi</dt><dd className="text-slate-800">{a.larutan_ref}</dd></>}
                <dt className="text-slate-500">Jadwal</dt>
                <dd className="text-slate-800">{a.periode_hari_max ? `tiap ${a.periode_hari_min && a.periode_hari_min !== a.periode_hari_max ? `${a.periode_hari_min}–` : ''}${a.periode_hari_max} hari` : 'sesuai kebutuhan'}</dd>
                <dt className="text-slate-500">Terakhir</dt>
                <dd className="text-slate-800">{tgl(a.terakhir_dikalibrasi)}{a.log_terakhir?.oleh_label ? ` · ${a.log_terakhir.oleh_label}` : ''}{a.jatuh_tempo ? ` · jatuh tempo ${tgl(a.jatuh_tempo)}` : ''}</dd>
                {a.toleransi != null && <><dt className="text-slate-500">Toleransi</dt><dd className="text-slate-800">± {n(a.toleransi)} {a.satuan ?? ''}</dd></>}
                {a.konstanta && <><dt className="text-slate-500">Firmware</dt><dd className="font-mono text-[12px] text-slate-800">{urutKonstanta(a.konstanta).map(([k, v]) => `${k} = ${v}`).join(' · ')}</dd></>}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {bolehTulis && <button type="button" className="vsf-btn-primary min-h-[38px] px-3 py-1 text-[13px]" onClick={() => setCatat(a)}>Catat kalibrasi</button>}
                <button type="button" className="vsf-btn-secondary min-h-[38px] px-3 py-1 text-[13px]" onClick={() => setRiwayat(a)}>Riwayat</button>
                {bolehTulis && <button type="button" className="vsf-btn-secondary min-h-[38px] px-3 py-1 text-[13px]" onClick={() => setAtur(a)}>Atur</button>}
              </div>
            </Kartu>
          ))}
      </div>

      {catat && <CatatKalibrasi alat={catat} terkini={terkini ?? null} onTutup={() => setCatat(null)}
        onSelesai={() => { setCatat(null); setPesan('Kalibrasi tercatat.'); reload() }} />}
      {riwayat && <Riwayat alat={riwayat} onTutup={() => setRiwayat(null)} />}
      {atur && <Atur alat={atur} onTutup={() => setAtur(null)} onSelesai={() => { setAtur(null); setPesan('Pengaturan disimpan.'); reload() }} />}
    </div>
  )
}
