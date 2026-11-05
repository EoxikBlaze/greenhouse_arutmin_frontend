import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/authContext'
import { useApiList } from '../lib/crudApi'
import { useIotV41State } from '../lib/iotV41'
import { useApiObject } from '../lib/useApiObject'
import { KELOMPOK, saring, urutUrgensi, type Alat, type Kelompok, type StatusAlat, type Terkini } from '../lib/kalibrasi'
import { Segmen } from '../components/sensor/FilterBar'
import { Pesan } from '../components/kaca/DialogKaca'
import { PanelKalibrasiLangsungV41 } from '../components/kalibrasi/PanelKalibrasiLangsungV41'
import { RingkasanKalibrasi } from '../components/kalibrasi/RingkasanKalibrasi'
import { KartuAlat } from '../components/kalibrasi/KartuAlat'
import { DialogCatat } from '../components/kalibrasi/DialogCatat'
import { DialogRiwayat } from '../components/kalibrasi/DialogRiwayat'
import { DialogAtur } from '../components/kalibrasi/DialogAtur'

/**
 * Kalibrasi alat IoT — routes/kalibrasi.js & routes/iotV41.js (GET daftar/riwayat: admin & demo; POST/PUT: admin sungguhan).
 * Meliputi Kalibrasi 2-titik langsung (EC 1.413/12.880 µS/cm, pH 4,0/7,0, Kalibrasi pompa N detik), Mode pemeliharaan,
 * Pemulihan papan ESP32, serta jadwal & kartu kalibrasi per sensor/aktuator.
 */
export default function KalibrasiPage() {
  const { role } = useAuth()
  const bolehTulis = role === 'admin'
  const { rows, loading, error, reload } = useApiList<Alat>('/kalibrasi')
  const { data: terkini } = useApiObject<Terkini>('/api/latest-sensor', { pollMs: 5_000 })
  const iotV41 = useIotV41State()
  const [kelompok, setKelompok] = useState<Kelompok>('Semua')
  const [status, setStatus] = useState<StatusAlat | null>(null)
  const [catat, setCatat] = useState<Alat | null>(null)
  const [riwayat, setRiwayat] = useState<Alat | null>(null)
  const [atur, setAtur] = useState<Alat | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 4000)
    return () => window.clearTimeout(id)
  }, [pesan])

  const tampil = useMemo(() => saring(urutUrgensi(rows), kelompok, status), [rows, kelompok, status])

  const muatSemua = () => {
    reload()
    void iotV41.reload()
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      <RingkasanKalibrasi rows={rows} terkini={terkini ?? null} status={status} onStatus={setStatus} />

      <PanelKalibrasiLangsungV41 iot={iotV41.data} loading={iotV41.loading} onReload={muatSemua} />

      <section className="vsf-card w-full min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmen label="Kelompok alat" pilihan={KELOMPOK} nilai={kelompok} onPilih={setKelompok} />
          <div className="text-[12.5px] text-abu">{tampil.length} dari {rows.length} alat · yang perlu tindakan di atas</div>
        </div>

        {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
        {error && !loading && <Pesan jenis="galat">{error}</Pesan>}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {loading && rows.length === 0
            ? [0, 1, 2, 3].map((i) => <div key={i} className="vsf-skeleton h-[150px] rounded-card" />)
            : tampil.map((a) => (
              <KartuAlat key={a.sensor} a={a} terkini={terkini ?? null} bolehTulis={bolehTulis}
                onCatat={() => setCatat(a)} onRiwayat={() => setRiwayat(a)} onAtur={() => setAtur(a)} />
            ))}
        </div>
        {!loading && tampil.length === 0 && !error && (
          <div className="mt-3 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-tinta">Tidak ada alat yang cocok dengan saringan ini.</div>
        )}
      </section>

      {catat && <DialogCatat alat={catat} terkini={terkini ?? null} onTutup={() => setCatat(null)}
        onSelesai={() => { setCatat(null); setPesan('Kalibrasi tercatat.'); reload() }} />}
      {riwayat && <DialogRiwayat alat={riwayat} onTutup={() => setRiwayat(null)} />}
      {atur && <DialogAtur alat={atur} onTutup={() => setAtur(null)} onSelesai={() => { setAtur(null); setPesan('Pengaturan disimpan.'); reload() }} />}
    </div>
  )
}
