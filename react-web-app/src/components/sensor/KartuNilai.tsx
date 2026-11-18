import clsx from 'clsx'
import { Ikon, type NamaIkon } from '../Ikon'
import { relatif } from '../../lib/waktu'
import {
  PARAMS,
  batasSah,
  nilaiAngka,
  statusNilai,
  type Ambang,
  type KunciSensor,
  type StatusNilai,
  type TitikSeri,
} from '../../lib/sensorLaporan'
import { angkaId } from '../../lib/format'

const IKON: Record<KunciSensor, NamaIkon> = {
  ph: 'ph',
  waterTemp: 'suhu',
  tds: 'kalibrasi',
  ec_ms_cm: 'dosing',
  airTemp: 'matahari',
  humidity: 'tetes',
}

const CHIP: Record<StatusNilai, { kelas: string; teks: string }> = {
  normal: { kelas: 'is-normal', teks: 'Normal' },
  rendah: { kelas: 'is-luar', teks: 'Terlalu rendah' },
  tinggi: { kelas: 'is-luar', teks: 'Terlalu tinggi' },
  kosong: { kelas: 'is-kosong', teks: 'Belum ada data' },
}

/** Nilai sensor ini lebih tua dari bacaan terbaru alat lebih dari ini → field tidak dikirim (sensor gagal dibaca). */
const TERTINGGAL_MS = 30_000

/**
 * Lima nilai terbaru. Tiap kartu juga tombol pilih: yang aktif punya grafiknya sendiri di bawah.
 * Status memakai teks + warna (bukan warna saja).
 */
export function KartuNilai({
  terakhir,
  ambang,
  terpilih,
  onToggle,
  kini,
  memuat,
  waktuTerbaru,
}: {
  /** Waktu bacaan terbaru alat (semua sensor). Firmware v6 tidak mengirim field sensor yang gagal dibaca. */
  waktuTerbaru: number | null
  terakhir: Record<KunciSensor, TitikSeri | null>
  ambang: Ambang
  terpilih: KunciSensor[]
  onToggle: (k: KunciSensor) => void
  kini: number
  memuat: boolean
}) {
  return (
    <div role="group" aria-label="Pilih sensor untuk grafik" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {PARAMS.map((p) => {
        // tinggi kerangka = tinggi kartu (156 px, diukur 320–768 px) supaya kartu tidak melompat saat data datang
        if (memuat && !terakhir[p.kunci]) return <div key={p.kunci} className="vsf-skeleton h-[156px] rounded-card" />
        const lama = terakhir[p.kunci]
        // bacaan terakhir yang berisi bisa berjam-jam lalu: jangan tampil sebagai nilai sekarang
        const tertinggal = lama !== null && waktuTerbaru !== null && waktuTerbaru - lama.t > TERTINGGAL_MS
        const t = tertinggal ? null : lama
        const batas = ambang?.[p.kunci]
        const s = statusNilai(t?.y ?? null, batas)
        const aktif = terpilih.includes(p.kunci)
        const min = nilaiAngka(batas?.min)
        const maks = nilaiAngka(batas?.max)
        return (
          <button
            key={p.kunci}
            type="button"
            aria-pressed={aktif}
            onClick={() => onToggle(p.kunci)}
            className={clsx('vsf-nilai vsf-kpi-kaca min-h-[156px]', aktif && 'is-aktif')}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="vsf-label flex items-center gap-1.5 vsf-label-tinta">
                <Ikon nama={IKON[p.kunci]} className="h-4 w-4" />
                {p.label}
              </span>
              {aktif && <Ikon nama="centang" className="h-4 w-4 text-arutmin-forest" />}
            </span>
            <span className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-[28px] font-bold leading-none tabular-nums text-tinta">
                {t ? angkaId(t.y, p.digit) : '—'}
              </span>
              {p.satuan && <span className="text-[13px] text-abu">{p.satuan}</span>}
            </span>
            <span className="mt-2 flex items-center">
              <span className={clsx('vsf-chip-nilai', CHIP[s].kelas)}>{tertinggal ? 'Tidak terbaca' : CHIP[s].teks}</span>
            </span>
            {/* baris waktu selalu disediakan: dulu muncul belakangan di samping chip → baris pecah, kartu meninggi (CLS) */}
            <span className="mt-1 block truncate text-[12px] text-abu">
              {tertinggal && lama && kini > 0
                ? `terakhir ${angkaId(lama.y, p.digit)}${p.satuan ? ` ${p.satuan}` : ''} · ${relatif(Math.max(0, kini - lama.t))}`
                : t && kini > 0
                  ? relatif(Math.max(0, kini - t.t))
                  : ' '}
            </span>
            {!batasSah(batas) ? (
              <span className="mt-1 text-[12px] text-abu">Batas aman perlu dicek admin</span>
            ) : (min !== null || maks !== null) && (
              <span className="mt-1 text-[12px] text-abu">
                Aman {min !== null ? angkaId(min, p.digit) : '…'}–{maks !== null ? angkaId(maks, p.digit) : '…'}
                {p.satuan ? ` ${p.satuan}` : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
