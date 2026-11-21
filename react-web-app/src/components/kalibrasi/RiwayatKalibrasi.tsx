import { useApiList } from '../../lib/crudApi'
import { tglJam } from '../../lib/format'
import type { ArsipKalibrasiRow, IotV41Params } from '../../lib/iotV41'

const NAMA: Record<string, string> = { ph: 'pH', ec: 'EC', pulsa_peristaltik: 'Pompa' }
const POMPA: [keyof IotV41Params, string][] = [
  ['laju_a', 'Pompa A'], ['laju_b', 'Pompa B'], ['laju_ph_up', 'Pompa pH up'], ['laju_ph_down', 'Pompa pH down'],
]
const angka = (v: unknown, d = 2) => (v == null || v === '' || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(d).replace('.', ','))

type Titik = { titik: number; tegangan: number | null; acuan: number | null }
const titikDari = (r: ArsipKalibrasiRow): Titik | null => {
  const k = r.konstanta_baru as { titik?: number; tegangan?: number; acuan?: number } | null
  return typeof k?.titik === 'number' ? { titik: k.titik, tegangan: k.tegangan ?? null, acuan: k.acuan ?? null } : null
}

/** Hasil terakhir per titik (catatan web dari laporan alat). Baris diurut terbaru dulu. */
export function kalibrasiTerpakai(baris: ArsipKalibrasiRow[], sensor: 'ph' | 'ec') {
  const hasil: { titik: Titik; pada: string }[] = []
  let dikembalikan: string | null = null
  for (const r of baris.filter((x) => x.sensor === sensor)) {
    if (/Dikembalikan ke kalibrasi sebelumnya/.test(r.catatan ?? '') && hasil.length === 0) dikembalikan = r.dilakukan_pada
    const t = titikDari(r)
    if (t && !hasil.some((h) => h.titik.titik === t.titik)) hasil.push({ titik: t, pada: r.dilakukan_pada })
  }
  // Firmware menghapus titik 0 EC bila titik 1 disimpan ulang setelahnya: titik 0 yang lebih lama tidak berlaku lagi.
  const t1 = hasil.find((h) => h.titik.titik === 1)
  const berlaku = sensor === 'ec' && t1 ? hasil.filter((h) => h.titik.titik !== 0 || new Date(h.pada) > new Date(t1.pada)) : hasil
  return { titik: berlaku.sort((a, b) => a.titik.titik - b.titik.titik), dikembalikan }
}

/** Riwayat lengkap kalibrasi + ringkasan "yang dipakai sekarang" (hasil terakhir yang tercatat di server). */
export function RiwayatKalibrasi({ params, versi }: { params: IotV41Params | undefined; versi: number }) {
  const { rows } = useApiList<ArsipKalibrasiRow>(`/iot-v41/riwayat-kalibrasi?v=${versi}`)
  const lajuTerakhir = rows.find((r) => r.sensor === 'pulsa_peristaltik' && /KALIBRASI POMPA/.test(r.catatan ?? ''))
  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Riwayat kalibrasi">
      <div className="vsf-judul-bagian">Kalibrasi yang dipakai (hasil terakhir)</div>
      <p className="mt-0.5 text-[12.5px] text-abu">Dari catatan terakhir di server. Nilai sebenarnya tersimpan di alat.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {(['ph', 'ec'] as const).map((s) => {
          const { titik, dikembalikan } = kalibrasiTerpakai(rows, s)
          return (
            <div key={s} className="vsf-stat">
              <div className="vsf-label">Sensor {NAMA[s]}</div>
              {titik.length === 0 && <div className="mt-1 text-[13px] text-abu">Belum ada kalibrasi tercatat.</div>}
              {titik.map((h) => (
                <div key={h.titik.titik} className="mt-1 text-[13px] text-tinta">
                  Titik {h.titik.titik}: acuan <b>{angka(h.titik.acuan, s === 'ph' ? 2 : 3)}</b>, {angka(h.titik.tegangan, 3)} V
                  <span className="block text-[11.5px] text-abu">{tglJam(h.pada)}</span>
                </div>
              ))}
              {dikembalikan && (
                <div className="vsf-tone-warn mt-2 rounded-input px-2 py-1 text-[11.5px]">
                  Sudah dikembalikan ke kalibrasi sebelumnya pada {tglJam(dikembalikan)}; angka di atas mungkin tidak berlaku lagi.
                </div>
              )}
            </div>
          )
        })}
        <div className="vsf-stat">
          <div className="vsf-label">Laju pompa</div>
          {POMPA.map(([k, nama]) => (
            <div key={k} className="mt-1 text-[13px] text-tinta">{nama}: <b>{angka(params?.[k])}</b> mL/detik</div>
          ))}
          <span className="mt-1 block text-[11.5px] text-abu">{lajuTerakhir ? `Dikalibrasi ${tglJam(lajuTerakhir.dilakukan_pada)}` : 'Belum pernah dikalibrasi'}</span>
        </div>
      </div>

      <div className="vsf-judul-bagian mt-5">Riwayat lengkap</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-abu">Belum ada kalibrasi tercatat.</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5 text-[13px]">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
              <span className="w-[130px] shrink-0 tabular-nums text-abu">{tglJam(r.dilakukan_pada)}</span>
              <b className="w-[60px] shrink-0 text-tinta">{NAMA[r.sensor] ?? r.sensor}</b>
              <span className="min-w-0 flex-1 text-tinta">{r.catatan ?? '—'}</span>
              <span className="text-abu">{r.oleh_label ?? ''}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
