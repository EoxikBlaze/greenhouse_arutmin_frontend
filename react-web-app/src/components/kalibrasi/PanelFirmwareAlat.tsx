import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { useApiError } from '../../lib/crudApi'
import { Pesan } from '../kaca/DialogKaca'

type Berkas = { nama: string; ukuran: number; diunggah: string; sha256: string }
type BarisPerintah = { id: number | string; status: string; hasil?: { alasan?: string; keluaran?: string } | null }
type StatusAlat = { v6?: Record<string, string>; perangkat?: { kode: string; firmware: string | null }[] }

const AKHIR = ['selesai', 'gagal', 'batal', 'kedaluwarsa']
const kb = (n: number) => `${Math.round(n / 1024).toLocaleString('id-ID')} KB`

/** Pantau satu perintah (OTA / KONSOL) sampai alat melapor. */
function usePerintah(id: number | string | null): { status: string; alasan: string | null; keluaran: string | null } | null {
  const [h, setH] = useState<{ id: string; status: string; alasan: string | null; keluaran: string | null } | null>(null)
  useEffect(() => {
    if (id === null) return
    let berhenti = false
    let timer = 0
    const cek = async () => {
      try {
        const r = await api.get('/api/aktuator/perintah', { params: { batas: 20 } })
        const b = ((r.data?.data ?? []) as BarisPerintah[]).find((x) => String(x.id) === String(id))
        if (berhenti || !b) return
        setH({ id: String(id), status: b.status, alasan: b.hasil?.alasan ?? null, keluaran: b.hasil?.keluaran ?? null })
        if (AKHIR.includes(b.status)) window.clearInterval(timer)
      } catch {
        // dicoba lagi di putaran berikut
      }
    }
    timer = window.setInterval(() => void cek(), 2000)
    void cek()
    return () => {
      berhenti = true
      window.clearInterval(timer)
    }
  }, [id])
  return h && id !== null && h.id === String(id) ? h : null
}

/**
 * Update program alat lewat WiFi (OTA jarak jauh) dan konsol jarak jauh — firmware v6.2+.
 * Admin saja. OTA wajib mode pemeliharaan; selama update semua pompa mati dan listrik jangan dicabut.
 */
export function PanelFirmwareAlat({ pemeliharaanAktif }: { pemeliharaanAktif: boolean }) {
  const handleApiError = useApiError()
  const [berkas, setBerkas] = useState<Berkas[]>([])
  const [status, setStatus] = useState<StatusAlat | null>(null)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [idOta, setIdOta] = useState<number | string | null>(null)
  const [idKonsol, setIdKonsol] = useState<number | string | null>(null)
  const [baris, setBaris] = useState('status')
  const input = useRef<HTMLInputElement>(null)
  const hasilOta = usePerintah(idOta)
  const hasilKonsol = usePerintah(idKonsol)

  const muatDaftar = useCallback(async () => {
    try {
      const r = await api.get('/api/firmware')
      setBerkas((r.data?.data ?? []) as Berkas[])
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }, [handleApiError])

  useEffect(() => { void muatDaftar() }, [muatDaftar])

  // progres OTA + versi program alat (tiap 3 dtk)
  useEffect(() => {
    let berhenti = false
    const ambil = async () => {
      try {
        const r = await api.get('/api/aktuator/status')
        if (!berhenti) setStatus(r.data as StatusAlat)
      } catch {
        // dicoba lagi
      }
    }
    void ambil()
    const t = window.setInterval(() => void ambil(), 3000)
    return () => { berhenti = true; window.clearInterval(t) }
  }, [])

  const otaJalan = status?.v6?.ota_berjalan === '1'
  const persen = Number(status?.v6?.ota_persen ?? 0)
  const versi = status?.perangkat?.find((p) => p.kode === 'aktuator-01')?.firmware ?? status?.perangkat?.[0]?.firmware ?? null

  async function unggah(f: File) {
    setSibuk('unggah'); setGalat(null); setPesan(null)
    try {
      const r = await api.post(`/api/firmware/unggah?nama=${encodeURIComponent(f.name)}`, await f.arrayBuffer(), {
        headers: { 'Content-Type': 'application/octet-stream' }, timeout: 120_000,
      })
      setPesan(`Berkas ${r.data?.berkas?.nama} terunggah (SHA-256 ${String(r.data?.berkas?.sha256 ?? '').slice(0, 12)}…).`)
      await muatDaftar()
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(null)
      if (input.current) input.current.value = ''
    }
  }

  async function pasang(b: Berkas) {
    if (!window.confirm(`Pasang ${b.nama} ke alat?\n\nSemua pompa MATI selama update (±1–2 menit). Jangan cabut listrik. Bila gagal, program lama tetap jalan.`)) return
    setSibuk('pasang'); setGalat(null); setPesan(null)
    try {
      const r = await api.post('/api/firmware/pasang', { nama: b.nama })
      setIdOta(r.data?.id_perintah ?? null)
      setPesan(String(r.data?.message ?? 'Perintah update dikirim.'))
    } catch (e) {
      setGalat(handleApiError(e).message)
    } finally {
      setSibuk(null)
    }
  }

  async function hapus(b: Berkas) {
    if (!window.confirm(`Hapus ${b.nama} dari server?`)) return
    try {
      await api.delete(`/api/firmware/${encodeURIComponent(b.nama)}`)
      await muatDaftar()
    } catch (e) {
      setGalat(handleApiError(e).message)
    }
  }

  async function kirimKonsol(e: React.FormEvent) {
    e.preventDefault()
    setSibuk('konsol'); setGalat(null)
    try {
      const r = await api.post('/api/firmware/konsol', { baris })
      setIdKonsol(r.data?.id_perintah ?? null)
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(null)
    }
  }

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Update program alat">
      <div className="vsf-judul-bagian">Update program alat (OTA) &amp; konsol</div>
      <p className="mt-0.5 text-[12.5px] text-abu">
        Program di alat: <span className="font-mono">{versi ?? '—'}</span>. Aktifkan mode pemeliharaan dulu. Gunakan berkas .bin hasil
        &quot;Export Compiled Binary&quot; (tanpa bootloader) dengan partisi Minimal SPIFFS.
      </p>

      {otaJalan && (
        <div className="vsf-blok mt-3 p-3 text-center text-[13px] font-semibold text-tinta">
          Alat sedang memperbarui program… {Number.isFinite(persen) ? `${persen}%` : ''} — jangan cabut listrik
        </div>
      )}
      {hasilOta && (
        <Pesan jenis={hasilOta.status === 'selesai' ? 'ok' : hasilOta.status === 'gagal' || hasilOta.status === 'kedaluwarsa' ? 'galat' : 'ok'}>
          Update: {hasilOta.status}{hasilOta.alasan ? ` (${hasilOta.alasan})` : ''}. Hasil akhir &quot;ota_berhasil_v…&quot; muncul setelah alat restart.
        </Pesan>
      )}
      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat">{galat}</Pesan>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept=".bin" className="text-[12.5px]" disabled={sibuk !== null}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void unggah(f) }} />
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {berkas.length === 0 && <li className="text-[12.5px] text-abu">Belum ada berkas program.</li>}
        {berkas.map((b) => (
          <li key={b.nama} className="vsf-stat flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[12.5px]">
            <div className="min-w-0">
              <div className="truncate font-semibold text-tinta">{b.nama}</div>
              <div className="text-[11.5px] text-abu">{kb(b.ukuran)} · SHA-256 {b.sha256.slice(0, 12)}…</div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="vsf-btn-primary" disabled={!pemeliharaanAktif || sibuk !== null || otaJalan}
                title={pemeliharaanAktif ? undefined : 'Aktifkan mode pemeliharaan dulu'} onClick={() => void pasang(b)}>Pasang ke alat</button>
              <button type="button" className="vsf-btn-secondary" disabled={sibuk !== null} onClick={() => void hapus(b)}>Hapus</button>
            </div>
          </li>
        ))}
      </ul>

      <form className="mt-4 flex flex-col gap-2" onSubmit={(e) => void kirimKonsol(e)}>
        <div className="vsf-label">KONSOL ALAT (pengganti Serial Monitor)</div>
        <div className="flex gap-2">
          <input className="vsf-input min-w-0 flex-1 font-mono" value={baris} maxLength={47} onChange={(e) => setBaris(e.target.value)}
            placeholder="status | param | kal | help" />
          <button type="submit" className="vsf-btn-secondary" disabled={sibuk !== null || !baris.trim()}>Kirim</button>
        </div>
        <p className="text-[11.5px] text-abu">Perintah wifi, server, cari, scan, kosongkan, auto, mqtt hanya bisa lewat kabel USB.</p>
        {hasilKonsol && (
          <pre className="max-h-72 overflow-auto rounded-card bg-white/55 p-3 font-mono text-[11.5px] leading-snug text-tinta">
            {hasilKonsol.keluaran ?? `(${hasilKonsol.status}${hasilKonsol.alasan ? `: ${hasilKonsol.alasan}` : ''})`}
          </pre>
        )}
      </form>
    </section>
  )
}
