import { Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useApiObject } from '../lib/useApiObject'
import { useApiList } from '../lib/crudApi'
import type { Ambang } from '../lib/sensorLaporan'
import type { BarisAlert } from '../pages/PeringatanPage'
import type { TanamRow } from '../lib/kebun'
import { Banner, Header, JudulBagian, Kosong, KartuMetrik, Kartu, Chip, Skeleton } from './Komponen'
import { DEF, angkaId, jamId, statusSensor, type KunciHp } from './format'

type Dash = {
  iotStatus?: { online?: boolean; data_segar?: boolean; data_last_seen?: string | null } | null
  latest_sensor?: Partial<Record<KunciHp, number | string | null>> | null
  ambang?: Ambang
}
const URUT: KunciHp[] = ['ph', 'tds', 'waterTemp', 'airTemp']
const IKON = { ph: 'ph', tds: 'dosing', waterTemp: 'suhu', airTemp: 'matahari', humidity: 'tetes' } as const

/** S10 Beranda — pen: kondisi sensor, peringatan terbaru, kegiatan tanam, tombol Asisten. */
export function HpBeranda() {
  const { role, username } = useAuth()
  const dash = useApiObject<Dash>('/dashboard', { pollMs: 5_000 })
  const al = useApiObject<{ data?: BarisAlert[] }>('/alert-logs?limit=3', { pollMs: 30_000 })
  const tanam = useApiList<TanamRow>('/tanam')
  const s = dash.data?.latest_sensor ?? null
  const segar = !!dash.data?.iotStatus?.data_segar
  const adaData = URUT.some((k) => s?.[k] != null)
  const peran = role === 'admin' ? 'Admin' : role === 'demo' ? 'Demo' : 'Petani'
  const aktif = (tanam.rows ?? []).filter((r) => (r.status ?? '').toLowerCase() !== 'selesai').slice(0, 2)

  return (
    <>
      <Header inisial={(username || '?').slice(0, 2).toUpperCase()} judul="Beranda" sub={`${peran} · Kebun Vertonik`} />
      <JudulBagian judul="Kondisi sensor" aksi="Riwayat" to="/sensor-realtime?k=ph" />
      {dash.error && <Banner tone="peringatan" judul="Data belum termuat" isi={dash.error} />}
      {dash.loading && !dash.data ? <Skeleton /> : (
        <div className="hp-grid2">
          {URUT.map((k) => {
            const st = statusSensor(s?.[k], k, dash.data?.ambang, segar, adaData)
            return (
              <Link key={k} to={`/sensor-realtime?k=${k}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <KartuMetrik ikon={IKON[k]} label={DEF[k].label} nilai={s?.[k] == null ? 'Belum ada data' : `${angkaId(s[k], DEF[k].digit)}${DEF[k].satuan}`} status={st.teks} tone={st.tone} />
              </Link>
            )
          })}
        </div>
      )}
      <p className="hp-meta">
        {adaData ? `Pembacaan terakhir ${jamId(dash.data?.iotStatus?.data_last_seen)}${segar ? '' : ' · data lama'}.` : 'Belum ada data dari perangkat.'}
      </p>
      <JudulBagian judul="Peringatan terbaru" aksi="Semua" to="/peringatan" />
      {(al.data?.data ?? []).length === 0
        ? <Kosong judul="Tidak ada peringatan" isi="Belum ada log peringatan yang tercatat untuk kebun ini." />
        : (al.data?.data ?? []).map((a) => (
            <Kartu key={a.id}>
              <div className="hp-bagian"><Chip tone={a.severity === 'critical' ? 'kritis' : a.severity === 'warning' ? 'peringatan' : 'info'}>{a.severity === 'critical' ? 'Kritis' : a.severity === 'warning' ? 'Peringatan' : 'Info'}</Chip><span className="hp-meta">{jamId(a.created_at)}</span></div>
              <strong>{a.type.replace(/_/g, ' ')}</strong>
            </Kartu>
          ))}
      <JudulBagian judul="Kegiatan tanam" aksi="Tanam" to="/tanam" />
      {aktif.length === 0
        ? <Kosong ikon="tanam" judul="Belum ada batch aktif" isi="Mulai semai dari menu Tanam untuk membuat batch baru." />
        : aktif.map((r) => (
            <Link key={r.id} to="/tanam" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Kartu><strong>Batch {r.varietas ?? 'Tanam'}{r.meja ? ` · ${r.meja}` : ''}</strong><span className="hp-meta">Tahap: {r.tipe}</span></Kartu>
            </Link>
          ))}
      <Link className="hp-btn" to="/asisten-ai">Tanya Asisten GARAP</Link>
    </>
  )
}
