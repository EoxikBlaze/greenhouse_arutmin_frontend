import { useState } from 'react'
import { useAuth } from '../lib/authContext'
import { PageHeader } from '../components/PageHeader'
import { Segmen } from '../components/sensor/FilterBar'
import { RentangRiwayat } from '../components/sensor/RentangRiwayat'
import { PanelKestabilan } from '../components/analisis/PanelKestabilan'
import { PanelDosing } from '../components/analisis/PanelDosing'
import { PanelPola } from '../components/analisis/PanelPola'
import { PanelBatch } from '../components/analisis/PanelBatch'
import { PanelHubungan } from '../components/analisis/PanelHubungan'
import { PanelKualitas } from '../components/analisis/PanelKualitas'
import { PanelMetode } from '../components/analisis/PanelMetode'
import { PanelDataRiset } from '../components/analisis/PanelDataRiset'
import { useAnalisis, type ResponKestabilan, type ResponKonsumsi, type ResponKorelasi, type ResponKualitas, type ResponPola, type ResponRespons } from '../lib/analisis'
import { useRentangWaktu } from '../lib/useRentangWaktu'
import { tglJamPendek } from '../lib/riwayatSensor'

const TAB = ['Kestabilan', 'Dosing', 'Pola harian', 'Hubungan', 'Kualitas data', 'Bandingkan batch', 'Metode', 'Data riset'] as const
type Tab = (typeof TAB)[number]

/**
 * Analisis (menu Pantau): kestabilan tiap sensor, respons dosing dan konsumsi nutrisi, pola harian + VPD,
 * perbandingan batch, dan paket data riset. Semua dihitung server dari bacaan yang sudah tersimpan; tidak mengirim perintah ke alat.
 */
export default function AnalisisPage() {
  const { role } = useAuth()
  const pengelola = role !== 'petani'
  const w = useRentangWaktu('7 Hari')
  const [tab, setTab] = useState<Tab>('Kestabilan')

  // Hanya tab yang sedang dibuka yang memanggil server (rentang null = tidak memuat).
  const r = w.r
  const kestabilan = useAnalisis<ResponKestabilan>('kestabilan', tab === 'Kestabilan' ? r : null)
  const respons = useAnalisis<ResponRespons>('respons-dosing', tab === 'Dosing' ? r : null)
  const konsumsi = useAnalisis<ResponKonsumsi>('konsumsi', tab === 'Dosing' ? r : null)
  const pola = useAnalisis<ResponPola>('pola-harian', tab === 'Pola harian' ? r : null)
  const korelasi = useAnalisis<ResponKorelasi>('korelasi', tab === 'Hubungan' ? r : null)
  const kualitas = useAnalisis<ResponKualitas>('kualitas-data', tab === 'Kualitas data' ? r : null)

  return (
    <div className="vsf-halaman vsf-stagger">
      <PageHeader
        judul="Analisis"
        deskripsi="Kestabilan, respons dosing, konsumsi nutrisi, pola harian, hubungan antar sensor, kualitas data, dan perbandingan batch, dihitung dari data yang sudah tersimpan, lengkap dengan metode dan keterbatasannya."
      />

      <RentangRiwayat
        rentang={w.rentang}
        onRentang={w.pilih}
        dari={w.dari}
        sampai={w.sampai}
        onDari={w.setDari}
        onSampai={w.setSampai}
        onTerapkan={w.terapkan}
        onGeser={w.geser}
        bisaBerikutnya={w.bisaBerikutnya}
        galat={w.galat}
        meta={
          tab === 'Bandingkan batch'
            ? 'Perbandingan batch memakai seluruh masa batch, bukan rentang ini.'
            : tab === 'Metode'
              ? 'Dokumentasi metode tidak bergantung pada rentang.'
            : r ? `${tglJamPendek(r.dari)} – ${tglJamPendek(r.sampai)}${r.live ? ' · diperbarui otomatis' : ''}` : 'Pilih tanggal lalu tekan Terapkan.'
        }
      />

      <Segmen label="Jenis analisis" pilihan={TAB} nilai={tab} onPilih={setTab} />

      {tab === 'Kestabilan' && <PanelKestabilan data={kestabilan.data} galat={kestabilan.galat} memuat={kestabilan.memuat} />}
      {tab === 'Dosing' && <PanelDosing respons={respons.data} konsumsi={konsumsi.data} galat={respons.galat ?? konsumsi.galat} memuat={respons.memuat || konsumsi.memuat} />}
      {tab === 'Pola harian' && <PanelPola data={pola.data} galat={pola.galat} memuat={pola.memuat} />}
      {tab === 'Hubungan' && <PanelHubungan data={korelasi.data} galat={korelasi.galat} memuat={korelasi.memuat} />}
      {tab === 'Kualitas data' && <PanelKualitas data={kualitas.data} galat={kualitas.galat} memuat={kualitas.memuat} />}
      {tab === 'Bandingkan batch' && <PanelBatch />}
      {tab === 'Metode' && <PanelMetode />}
      {tab === 'Data riset' && <PanelDataRiset r={r} bolehUnduh={pengelola} />}
    </div>
  )
}
