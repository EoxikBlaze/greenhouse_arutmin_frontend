import { Ikon } from './Ikon'

export type StatusPompa = { a?: boolean | null; b?: boolean | null; ph_up?: boolean | null; ph_down?: boolean | null; isi?: boolean | null }

type Kunci = keyof StatusPompa
const DAFTAR: readonly { k: Kunci; nama: string; fungsi: string }[] = [
  { k: 'a', nama: 'Pompa A', fungsi: 'Nutrisi A' },
  { k: 'b', nama: 'Pompa B', fungsi: 'Nutrisi B' },
  { k: 'ph_up', nama: 'pH Up', fungsi: 'Naikkan pH' },
  { k: 'ph_down', nama: 'pH Down', fungsi: 'Turunkan pH' },
  { k: 'isi', nama: 'Isi air', fungsi: 'Pompa isi penampung' },
]

const KEGIATAN: Record<string, string> = {
  DIAM: 'Alat siaga (semua pompa mati)',
  DOSING_A: 'Dosing nutrisi A',
  JEDA_AB: 'Jeda antara nutrisi A dan B',
  DOSING_B: 'Dosing nutrisi B',
  PH_UP: 'Menaikkan pH',
  PH_DOWN: 'Menurunkan pH',
  ISI_AIR: 'Mengisi air (air rendah)',
  ENCER: 'Mengencerkan (ppm terlalu tinggi)',
  UJI_POMPA: 'Uji pompa dari web',
}

/**
 * Alat lama (firmware < v6.4) belum melapor status tiap relay: tebak dari `kegiatan`.
 * UJI_POMPA tidak menyebut pompa mana, jadi dibiarkan tidak diketahui (null).
 */
export function pompaDariKegiatan(kegiatan: string | null | undefined): StatusPompa {
  const g = kegiatan ?? 'DIAM'
  if (g === 'UJI_POMPA') return { a: null, b: null, ph_up: null, ph_down: null, isi: null }
  return {
    a: g === 'DOSING_A', b: g === 'DOSING_B', ph_up: g === 'PH_UP', ph_down: g === 'PH_DOWN', isi: g === 'ISI_AIR' || g === 'ENCER',
  }
}

/** Pakai laporan alat bila lengkap (v6.4+), selain itu tebakan dari kegiatan. */
export function pompaGabung(lapor: StatusPompa | null | undefined, kegiatan: string | null | undefined): StatusPompa {
  const adaLaporan = !!lapor && (lapor.a != null || lapor.b != null || lapor.ph_up != null || lapor.ph_down != null)
  return adaLaporan ? { ...lapor } : { ...pompaDariKegiatan(kegiatan), isi: lapor?.isi ?? pompaDariKegiatan(kegiatan).isi }
}

/**
 * Status pompa/relay sekarang: menyala atau mati. Alat terputus = tidak diketahui (bukan "mati"),
 * karena status terakhir yang tersimpan di server bisa basi.
 */
export function PanelStatusPompa({
  pompa, kegiatan, online, estop, memuat,
}: {
  pompa: StatusPompa | null | undefined
  kegiatan: string | null | undefined
  online: boolean
  estop: boolean | null | undefined
  memuat: boolean
}) {
  const st = pompaGabung(pompa, kegiatan)
  const nyala = online && !estop ? DAFTAR.filter((d) => st[d.k] === true).length : 0
  return (
    <section className="vsf-card flex flex-col p-4 sm:p-5 xl:col-span-12" aria-label="Status pompa">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="vsf-judul-bagian">Status Pompa</div>
        <span className="vsf-chip-nilai is-kosong">
          {!online ? 'Alat terputus' : estop ? 'E-STOP: semua pompa mati' : (KEGIATAN[kegiatan ?? 'DIAM'] ?? kegiatan ?? '—')}
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-live="polite">
        {memuat
          ? DAFTAR.map((d) => <li key={d.k} className="vsf-skeleton h-[84px]" />)
          : DAFTAR.map((d) => {
              const nilai = !online ? null : estop ? false : st[d.k] ?? null
              const hidup = nilai === true
              return (
                <li key={d.k} className={`vsf-stat flex items-center gap-3 px-3 py-3 ${hidup ? 'ring-2 ring-moss' : ''}`}
                  data-pompa={d.k} data-nyala={hidup ? 'ya' : 'tidak'}>
                  <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${hidup ? 'bg-moss text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <Ikon nama="dosing" className="h-5 w-5" />
                    {hidup && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-arutmin-error" aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-tinta">{d.nama}</div>
                    <div className="truncate text-[11.5px] text-abu">{d.fungsi}</div>
                    <div className={`mt-0.5 text-[12px] font-bold ${hidup ? 'text-moss' : 'text-abu'}`}>
                      {nilai === null ? '—' : hidup ? 'MENYALA' : 'mati'}
                    </div>
                  </div>
                </li>
              )
            })}
      </ul>
      <p className="mt-2 text-[11.5px] text-abu">
        {nyala > 0 ? `${nyala} pompa menyala sekarang.` : 'Tidak ada pompa menyala.'} Status diperbarui tiap beberapa detik; dosing yang sangat singkat bisa terlewat.
      </p>
    </section>
  )
}
