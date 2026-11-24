import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { nilaiAngka, seriParam, type Ambang, type Titik } from '../lib/sensorLaporan'
import { Banner, BarisData, Kartu, Kosong } from './Komponen'
import { DEF, angkaId, jamId, statusSensor, type KunciHp } from './format'

type Dash = { iotStatus?: { data_segar?: boolean; data_last_seen?: string | null; data_seconds_ago?: number | null } | null; latest_sensor?: Partial<Record<KunciHp, number | string | null>> | null; ambang?: Ambang }
const SEMUA = Object.keys(DEF) as KunciHp[]

function Garis({ seri }: { seri: { t: number; y: number }[] }) {
  if (seri.length < 2) return null
  const [t0, t1] = [seri[0].t, seri[seri.length - 1].t]
  const ys = seri.map((p) => p.y); const lo = Math.min(...ys), hi = Math.max(...ys)
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * 300
  const y = (v: number) => 90 - ((v - lo) / Math.max(1e-9, hi - lo)) * 80
  return <svg viewBox="0 0 300 100" width="100%" role="img" aria-label="Riwayat 12 jam"><polyline fill="none" stroke="#1e7a55" strokeWidth="2" points={seri.map((p) => `${x(p.t)},${y(p.y)}`).join(' ')} /></svg>
}

/** S11 Detail Sensor + S12 Grafik — satu sensor per layar, parameter lain di bawah. */
export function HpSensor() {
  const { demo } = useAuth()
  const [q, setQ] = useSearchParams()
  const k = (SEMUA.includes(q.get('k') as KunciHp) ? q.get('k') : 'ph') as KunciHp
  const dash = useApiObject<Dash>('/dashboard', { pollMs: 5_000 })
  const [seri, setSeri] = useState<{ t: number; y: number }[]>([])
  useEffect(() => {
    let batal = false
    const sampai = Date.now()
    api.get('/monitoring/riwayat', { params: { dari: new Date(sampai - 12 * 3_600_000).toISOString(), sampai: new Date(sampai).toISOString() } })
      .then((r) => { if (!batal) setSeri(seriParam(((r.data as { titik?: Titik[] })?.titik ?? []) as Titik[], k)) })
      .catch(() => { if (!batal) setSeri([]) })
    return () => { batal = true }
  }, [k])

  const s = dash.data?.latest_sensor ?? null
  const segar = !!dash.data?.iotStatus?.data_segar
  const ada = SEMUA.some((x) => s?.[x] != null)
  const st = statusSensor(s?.[k], k, dash.data?.ambang, segar, ada)
  const umur = dash.data?.iotStatus?.data_seconds_ago

  return (
    <>
      <div className="hp-bagian"><h2>{DEF[k].judul}</h2><Link to="/dashboard">Kembali</Link></div>
      <div className="hp-grid2" role="tablist" aria-label="Pilih sensor" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {SEMUA.map((x) => <button key={x} role="tab" aria-selected={x === k} className={`hp-btn ${x === k ? '' : 'sek'}`} style={{ minHeight: 44, fontSize: 13, padding: '0 6px' }} onClick={() => setQ({ k: x })}>{DEF[x].label.replace(' ppm', '')}</button>)}
      </div>
      {demo ? <Kartu><div className="hp-nilai" style={{ font: '700 28px Space Grotesk' }}>Disembunyikan</div><span className="hp-meta">Akun demo tidak menampilkan nilai sensor</span></Kartu> : (
        <Kartu>
          <div style={{ font: '700 36px Space Grotesk' }}>{ada && s?.[k] != null ? `${angkaId(s[k], DEF[k].digit)}${DEF[k].satuan}` : '—'}</div>
          <span className={`hp-status ${st.tone}`}>{st.teks === 'Data lama' ? 'Data basi' : st.teks}</span>
          <span className="hp-meta">{ada ? `Diperbarui ${jamId(dash.data?.iotStatus?.data_last_seen)}${umur != null ? ` · umur ${umur < 60 ? `${umur} detik` : `${Math.round(umur / 60)} menit`}` : ''}` : 'Belum ada data · perangkat belum pernah sinkron'}</span>
        </Kartu>
      )}
      {seri.length > 1 ? <Kartu><h2 style={{ font: '700 16px Space Grotesk', margin: 0 }}>Riwayat {DEF[k].judul}</h2><Garis seri={seri} /><span className="hp-meta">Riwayat 12 jam.</span></Kartu> : <Kosong ikon="sensor" judul="Belum ada riwayat" isi="Grafik muncul setelah sensor mengirim pembacaan." />}
      <Kartu>
        <h2 style={{ font: '700 16px Space Grotesk', margin: 0 }}>Parameter lain</h2>
        {SEMUA.filter((x) => x !== k).map((x) => <BarisData key={x} label={DEF[x].label.replace(' ppm', '')} nilai={demo || nilaiAngka(s?.[x]) === null ? '—' : `${angkaId(s?.[x], DEF[x].digit)}${DEF[x].satuan}`} />)}
      </Kartu>
      <Banner judul="Status dosing otomatis" isi="Terkunci · hanya informasi. Dosis tidak dijalankan dari aplikasi." />
    </>
  )
}
