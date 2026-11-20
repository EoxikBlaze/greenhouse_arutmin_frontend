import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { angkaId, tglPendek } from '../../lib/format'
import { persenTeks, type DeretBatch, type RingkasBatch, type UjiBatch } from '../../lib/analisis'
import { TabelIlmiah, angka, teksP } from './Ilmiah'
import { Segmen } from '../sensor/FilterBar'
import { GarisBanding } from './Grafik'

const METRIK = [
  { id: 'ph', label: 'pH', satuan: '', digit: 2 },
  { id: 'tds', label: 'Nutrisi (ppm)', satuan: 'ppm', digit: 0 },
  { id: 'waterTemp', label: 'Suhu air', satuan: '°C', digit: 1 },
  { id: 'airTemp', label: 'Suhu udara', satuan: '°C', digit: 1 },
  { id: 'humidity', label: 'Kelembapan', satuan: '%', digit: 0 },
] as const

const namaBatch = (b: RingkasBatch) => `${b.tanaman ?? 'Tanaman'} #${b.id} (${tglPendek(`${String(b.mulai).slice(0, 10)}T00:00:00`)})`

/** Bandingkan dua batch menurut hari sejak semai: grafik harian dan ringkasan kestabilan, bersama hasil panen. */
export function PanelBatch() {
  const [daftar, setDaftar] = useState<RingkasBatch[] | null>(null)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [hasil, setHasil] = useState<{ a: DeretBatch; b: DeretBatch; uji?: Record<string, UjiBatch>; jumlah_uji?: number } | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [metrik, setMetrik] = useState<(typeof METRIK)[number]['label']>('pH')

  useEffect(() => {
    let batal = false
    api
      .get('/api/analisis/batch')
      .then((res) => {
        if (batal) return
        const list = ((res.data as { list?: RingkasBatch[] })?.list ?? []) as RingkasBatch[]
        setDaftar(list)
        // bawaan: dua batch terbaru
        if (list.length >= 2) {
          setA(String(list[1].id))
          setB(String(list[0].id))
        }
      })
      .catch(() => {
        if (!batal) setGalat('Daftar batch belum bisa dimuat.')
      })
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (!a || !b || a === b) return
    let batal = false
    setMemuat(true)
    api
      .get('/api/analisis/bandingkan-batch', { params: { a, b } })
      .then((res) => {
        if (batal) return
        setHasil(res.data as { a: DeretBatch; b: DeretBatch; uji?: Record<string, UjiBatch>; jumlah_uji?: number })
        setGalat(null)
      })
      .catch((err) => {
        if (!batal) setGalat((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Perbandingan belum bisa dimuat.')
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [a, b])

  const def = METRIK.find((m) => m.label === metrik) ?? METRIK[0]
  const seri = (d: DeretBatch | undefined) => (d?.hari ?? []).map((h) => ({ n: h.n, v: h[def.id] }))

  const baris = (d: DeretBatch, nama: string) => (
    <tr key={d.batch.id}>
      <th scope="row">{nama}</th>
      <td>{d.hari.length ? d.hari[d.hari.length - 1].n + 1 : 0}</td>
      <td>{persenTeks(d.ringkas.ph.dalam_batas_persen, 1)}</td>
      <td>{persenTeks(d.ringkas.tds.dalam_batas_persen, 1)}</td>
      <td>{d.ringkas.ph.sd == null ? '—' : angkaId(d.ringkas.ph.sd, 3)}</td>
      <td>{d.ringkas.waterTemp.rata == null ? '—' : angkaId(d.ringkas.waterTemp.rata, 1)}</td>
      <td>{d.batch.tgl_panen ? `${d.batch.panen_berhasil} / ${d.batch.panen_gagal}` : 'belum panen'}</td>
    </tr>
  )

  return (
    <div className="grid gap-4">
      <section className="vsf-card p-4 sm:p-5" aria-label="Bandingkan batch">
        <div className="vsf-judul-bagian">Bandingkan dua batch</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-abu">
          Kondisi dua batch disejajarkan menurut <b>hari sejak mulai semai</b>, jadi batch yang mulai pada tanggal berbeda tetap bisa dibandingkan.
          Bersama hasil panennya, ini bahan untuk menjawab: kondisi seperti apa yang menghasilkan panen terbaik.
        </p>
        {daftar === null && !galat ? (
          <div className="vsf-skeleton mt-3 h-[80px] rounded-card" role="status" aria-label="Memuat" />
        ) : daftar && daftar.length < 2 ? (
          <p className="mt-3 rounded-card bg-white/55 px-4 py-8 text-center text-[13px] text-abu">Butuh minimal dua batch untuk dibandingkan. Mulai semai batch berikutnya dari Kebun Saya.</p>
        ) : daftar ? (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[['Batch A (garis hijau)', a, setA], ['Batch B (garis putus-putus)', b, setB]].map(([judul, nilai, set]) => (
                <label key={judul as string} className="grid gap-1">
                  <span className="vsf-label">{judul as string}</span>
                  <select className="vsf-input w-full" value={nilai as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
                    {daftar.map((x) => <option key={String(x.id)} value={String(x.id)}>{namaBatch(x)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            {a === b && <p className="mt-2 text-[12.5px] text-[#854F0B]">Pilih dua batch yang berbeda.</p>}
            {galat && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">{galat}</div>}
            {hasil && a !== b && (
              <>
                <div className="mt-4"><Segmen label="Besaran" pilihan={METRIK.map((m) => m.label)} nilai={metrik} onPilih={setMetrik} /></div>
                <div className="mt-3">
                  <GarisBanding a={seri(hasil.a)} b={seri(hasil.b)} namaA={namaBatch(hasil.a.batch)} namaB={namaBatch(hasil.b.batch)} satuan={def.satuan} digit={def.digit} />
                </div>
                <TabelIlmiah
                  nomor={7}
                  judul="Ringkasan dua batch."
                  catatan="Dalam batas = persen waktu di dalam batas aman Ambang Sensor saat ini. SD = simpangan baku pH (kecil = stabil). Panen dalam jumlah tanaman."
                >
                  <table className="vsf-ilmiah-tabel">
                    <thead>
                      <tr>
                        <th scope="col">Batch</th>
                        <th scope="col">Hari (n)</th>
                        <th scope="col">pH dalam batas (%)</th>
                        <th scope="col">Nutrisi dalam batas (%)</th>
                        <th scope="col">SD pH</th>
                        <th scope="col">Suhu air rata-rata (°C)</th>
                        <th scope="col">Panen berhasil / gagal</th>
                      </tr>
                    </thead>
                    <tbody>{baris(hasil.a, 'A')}{baris(hasil.b, 'B')}</tbody>
                  </table>
                </TabelIlmiah>

                {hasil.uji && (
                  <TabelIlmiah
                    nomor={8}
                    judul="Uji perbedaan nilai harian batch A dan B (uji peringkat bertanda Wilcoxon, berpasangan menurut hari sejak semai)."
                    catatan={
                      <>
                        Selisih median = median (A − B) dari nilai harian pada hari-ke yang sama. Karena {hasil.jumlah_uji ?? 5} besaran diuji sekaligus, ambang p
                        dikoreksi Bonferroni ({teksP(0.05 / (hasil.jumlah_uji ?? 5))}). Dengan kurang dari 6 pasangan hari, uji tidak cukup kuat; &quot;tidak signifikan&quot;
                        bukan bukti tidak ada beda. Perbedaan ≠ sebab-akibat: tanaman, musim, dan meja dapat berbeda.
                      </>
                    }
                  >
                    <table className="vsf-ilmiah-tabel">
                      <thead>
                        <tr>
                          <th scope="col">Besaran</th>
                          <th scope="col">Pasangan hari (n)</th>
                          <th scope="col">Selisih median (A − B)</th>
                          <th scope="col">p</th>
                          <th scope="col" className="teks">Metode</th>
                          <th scope="col" className="teks">Kesimpulan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(hasil.uji).map(([k, u]) => {
                          const alfa = 0.05 / (hasil.jumlah_uji ?? 5)
                          const sig = u.p != null && u.p < alfa
                          return (
                            <tr key={k}>
                              <th scope="row">{u.nama}</th>
                              <td>{u.n_pasang}</td>
                              <td>{angka(u.selisih_median, k === 'tds' ? 0 : 2)}</td>
                              <td>{teksP(u.p)}</td>
                              <td className="teks">{u.metode ?? '—'}</td>
                              <td className={`teks ${sig ? 'baik' : ''}`}>{!u.cukup ? 'data kurang (n < 6)' : u.p == null ? '—' : sig ? 'berbeda (setelah koreksi)' : u.p < 0.05 ? 'berbeda sebelum koreksi' : 'tidak berbeda nyata'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </TabelIlmiah>
                )}
              </>
            )}
            {memuat && !hasil && <div className="vsf-skeleton mt-3 h-[240px] rounded-card" role="status" aria-label="Memuat" />}
          </>
        ) : null}
        {!daftar && galat && <div role="alert" className="vsf-banner vsf-tone-error mt-3 rounded-input px-3 py-2 text-[13px]">{galat}</div>}
      </section>
    </div>
  )
}
