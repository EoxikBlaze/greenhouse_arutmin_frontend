import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import type { BarisAlert } from '../pages/PeringatanPage'
import { Banner, Chip, JudulBagian, Kartu, Kosong, Skeleton, Tombol } from './Komponen'
import { jamId } from './format'

const SEG = [['', 'Semua'], ['critical', 'Kritis'], ['warning', 'Peringatan'], ['info', 'Info']] as const
const tone = (s: string) => (s === 'critical' ? 'kritis' : s === 'warning' ? 'peringatan' : 'info')
const teks = (s: string) => (s === 'critical' ? 'Kritis' : s === 'warning' ? 'Peringatan' : 'Info')

/** S30/S31 Peringatan — log untuk semua login; tandai selesai hanya admin. */
export function HpPeringatan() {
  const admin = useAuth().role === 'admin'
  const handleApiError = useApiError()
  const { data, loading, error, reload } = useApiObject<{ data?: BarisAlert[] }>('/alert-logs?limit=100', { pollMs: 30_000 })
  const [seg, setSeg] = useState('')
  const [buka, setBuka] = useState<BarisAlert | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const baris = (data?.data ?? []).filter((a) => !seg || a.severity === seg)

  async function ack(id: BarisAlert['id']) {
    setSibuk(true)
    try { await api.post(`/alert-logs/${id}/ack`); setBuka(null); reload() } catch (e) { handleApiError(e) } finally { setSibuk(false) }
  }

  if (buka) return (
    <>
      <JudulBagian judul="Detail peringatan" />
      <Kartu>
        <div className="hp-bagian"><Chip tone={tone(buka.severity)}>{teks(buka.severity)}</Chip><span className="hp-meta">{jamId(buka.created_at)}</span></div>
        <strong>{buka.type.replace(/_/g, ' ')}</strong>
        <span className="hp-meta">{buka.value}</span>
        <span className="hp-meta">{buka.acknowledged ? 'Sudah ditandai selesai.' : buka.sedang_terjadi ? 'Sedang terjadi.' : 'Sudah pulih.'}</span>
      </Kartu>
      {admin ? (!buka.acknowledged && <Tombol disabled={sibuk} onClick={() => ack(buka.id)}>Tandai selesai</Tombol>)
        : <Tombol sek disabled>Lapor ke pengelola (DITUNDA)</Tombol>}
      <Tombol sek onClick={() => setBuka(null)}>Kembali</Tombol>
    </>
  )
  return (
    <>
      <JudulBagian judul="Peringatan" />
      <div className="hp-grid2" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {SEG.map(([k, l]) => <button key={k} className={`hp-btn ${seg === k ? '' : 'sek'}`} style={{ minHeight: 44, fontSize: 13, padding: '0 4px' }} onClick={() => setSeg(k)}>{l}</button>)}
      </div>
      {error && <Banner tone="peringatan" judul="Gagal memuat" isi={error} />}
      {loading && !data ? <Skeleton /> : baris.length === 0
        ? <Kosong ikon="kosong" judul="Tidak ada peringatan" isi="Belum ada log peringatan yang tercatat untuk kebun ini." />
        : baris.map((a) => (
            <button key={a.id} type="button" className="hp-kartu" style={{ border: 0, textAlign: 'left', font: 'inherit' }} onClick={() => setBuka(a)}>
              <div className="hp-bagian"><Chip tone={tone(a.severity)}>{teks(a.severity)}</Chip><span className="hp-meta">{jamId(a.created_at)}</span></div>
              <strong>{a.type.replace(/_/g, ' ')}</strong>
              <span className="hp-meta">{a.acknowledged ? 'Selesai' : a.sedang_terjadi ? 'Sedang terjadi' : 'Pulih'}</span>
            </button>
          ))}
    </>
  )
}
