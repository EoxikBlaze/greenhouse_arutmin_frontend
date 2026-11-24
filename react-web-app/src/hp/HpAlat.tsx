import { Link } from 'react-router-dom'
import { useApiObject } from '../lib/useApiObject'
import { TombolEstop } from '../components/TombolEstop'
import { TombolStopPompa } from '../components/TombolStopPompa'
import { Banner, BarisData, BarisMenu, JudulBagian, Kartu } from './Komponen'

type Dash = { keadaan_alat?: { mode?: string | null; kegiatan?: string | null; siap?: boolean | null; estop?: boolean | null; kunci?: string | null } | null; iotStatus?: { online?: boolean } | null }

/** S40 Alat (admin): keselamatan, STOP pompa & E-STOP terpisah, status perangkat. */
export function HpAlat() {
  const { data } = useApiObject<Dash>('/dashboard', { pollMs: 5_000 })
  const a = data?.keadaan_alat
  return (
    <>
      <JudulBagian judul="Alat" />
      <Banner tone="peringatan" judul="Keselamatan" isi="Kondisi tidak diketahui tidak berarti aman. Periksa panel fisik sebelum bekerja di greenhouse." />
      <Kartu>
        <h2 style={{ font: '700 16px Space Grotesk', margin: 0 }}>E-STOP</h2>
        <span className="hp-meta">Dua aksi terpisah, masing-masing dengan konfirmasi sendiri: STOP pompa dan E-STOP darurat. Mode demo tidak mengirim perintah.</span>
        <TombolStopPompa />
        <TombolEstop />
      </Kartu>
      <Kartu>
        <h2 style={{ font: '700 16px Space Grotesk', margin: 0 }}>Perangkat & mode</h2>
        {a?.mode ? (<>
          <BarisData label="Perangkat" nilai={data?.iotStatus?.online ? 'Online' : 'Offline'} />
          <BarisData label="Mode" nilai={a.mode} />
          <BarisData label="Kegiatan" nilai={a.kegiatan ?? '—'} />
          <BarisData label="Siap" nilai={a.siap == null ? '—' : a.siap ? 'Ya' : 'Belum'} />
        </>) : <span className="hp-meta">Belum ada laporan alat.</span>}
      </Kartu>
      <Kartu>
        <BarisMenu ikon="kalibrasi" label="Kalibrasi (lihat saja)" to="/kalibrasi" />
        <BarisMenu ikon="ambang" label="Pengaturan alat" to="/pengaturan-alat" />
        <Link className="hp-meta" to="/audit">Catatan aktivitas</Link>
      </Kartu>
    </>
  )
}
