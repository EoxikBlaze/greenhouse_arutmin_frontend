import { usePublik } from '../lib/usePublik'
import { info } from '../lib/info'

function Garis({ nilai, warna }: { nilai: Array<number | null>; warna: string }) {
  const v = nilai.filter((x): x is number => x !== null)
  if (v.length < 2) return <div className="h-10" />
  const min = Math.min(...v)
  const max = Math.max(...v)
  const rentang = max - min || 1
  const titik = v.map((x, i) => `${(i / (v.length - 1)) * 100},${34 - ((x - min) / rentang) * 30}`).join(' ')
  return (
    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
      <polyline points={titik} fill="none" stroke={warna} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const fmt = (n: number | null | undefined, satuan = '') => (n === null || n === undefined ? '—' : `${n.toLocaleString('id-ID')}${satuan}`)

/** Kartu data langsung dari kebun — memakai /api/publik/ringkasan, jatuh ke "—" bila server tak terjangkau. */
export function DataLangsung() {
  const { data, galat, memuat } = usePublik()
  const r = data?.rata_6_jam
  const tren = data?.tren_24_jam ?? []
  const kartu = [
    { k: 'pH air', v: fmt(r?.ph), ket: 'ideal 5,5–6,5', w: '#2f6bff', seri: tren.map((t) => t.ph), tip: 'Rata-rata pH larutan nutrisi 6 jam terakhir. Di luar 5,5–6,5 tanaman sulit menyerap nutrisi.' },
    { k: 'TDS', v: fmt(r?.tds, ' ppm'), ket: 'kepekatan nutrisi', w: '#0f9d6b', seri: tren.map((t) => t.tds), tip: 'Total padatan terlarut — gambaran kepekatan nutrisi. Dosing otomatis menjaganya dekat target.' },
    { k: 'Suhu air', v: fmt(r?.suhu_air, ' °C'), ket: 'penampung', w: '#e08a00', seri: tren.map((t) => t.suhu_air), tip: 'Suhu larutan di penampung. Terlalu panas menurunkan oksigen terlarut.' },
    { k: 'Udara & lembap', v: `${fmt(r?.suhu_udara, ' °C')} · ${fmt(r?.kelembapan, '%')}`, ket: 'ruang greenhouse', w: '#7a5cff', seri: [], tip: 'Suhu dan kelembapan udara di dalam greenhouse (rata-rata 6 jam).' },
  ]
  const ringkas = [
    { k: 'Meja', v: data?.meja },
    { k: 'Lubang tanam', v: data?.lubang },
    { k: 'Jenis tanaman', v: data?.jenis_tanaman },
    { k: 'Panen berhasil', v: data?.panen.berhasil },
  ]
  return (
    <section id="data" className="mt-12 scroll-mt-24" aria-labelledby="vsf-data-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="vsf-eyebrow vsf-judul-latar">Data langsung</div>
          <h2 id="vsf-data-title" className="vsf-judul-latar mt-2 text-[22px] sm:text-[28px]">Kondisi kebun saat ini</h2>
        </div>
        <span
          {...info('Status perangkat', 'Hijau berarti ESP32 mengirim data dalam 2 menit terakhir. Merah berarti perangkat belum mengirim data baru.')}
          className="vsf-kaca vsf-kaca-gelap inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-bold"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${galat ? 'bg-slate-400' : data?.iot.online ? 'animate-pulse bg-moss' : 'bg-arutmin-error'}`} aria-hidden />
          {galat ? 'Server tidak terjangkau' : memuat ? 'Memuat…' : data?.iot.online ? 'Perangkat online' : 'Perangkat offline'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kartu.map((c, i) => (
          <div key={c.k} {...info(c.k, c.tip)} className="vsf-card vsf-muncul flex flex-col gap-1 rounded-3xl p-4" style={{ ['--d' as string]: `${i * 0.07}s` }}>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{c.k}</div>
            <div className="font-display text-[24px] font-bold leading-tight text-tinta">{c.v}</div>
            <Garis nilai={c.seri} warna={c.w} />
            <div className="text-[11.5px] text-slate-500">{c.ket}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ringkas.map((c, i) => (
          <div key={c.k} className="vsf-card vsf-muncul p-4 text-center" style={{ ['--d' as string]: `${i * 0.06}s` }}>
            <div className="font-display text-[26px] font-bold leading-none text-arutmin-forest">{fmt(c.v)}</div>
            <div className="mt-1.5 text-[12.5px] font-semibold text-tinta">{c.k}</div>
          </div>
        ))}
      </div>
      <p className="vsf-judul-latar mt-3 text-center text-[11.5px] !text-white/85">
        Rata-rata 6 jam terakhir dari {fmt(r?.jumlah)} pembacaan sensor{data ? ` · diperbarui ${new Date(data.diperbarui).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </p>
    </section>
  )
}
