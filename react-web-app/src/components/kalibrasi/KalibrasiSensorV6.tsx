import { useState } from 'react'

type Aksi = 'UKUR' | 'SIMPAN' | 'BATAL'

/**
 * Kalibrasi pH / EC dua titik (firmware v6, perintah KAL_SENSOR): alat mengukur tegangan probe sendiri
 * setelah bacaan tenang (UKUR), lalu menyimpannya sebagai titik itu (SIMPAN). Acuan bawaan alat.
 */
export function KalibrasiSensorV6({
  sensor, judul, bacaan, larutan, bolehUbah, pemeliharaanAktif, sibuk, onKirim, onBalik,
}: {
  sensor: 'ph' | 'ec'
  judul: string
  bacaan: string
  larutan: [string, string]
  bolehUbah: boolean
  pemeliharaanAktif: boolean
  sibuk: string | null
  onKirim: (sensor: 'ph' | 'ec', titik: 1 | 2, aksi: Aksi) => Promise<void>
  onBalik: () => void
}) {
  const [titik, setTitik] = useState<1 | 2>(1)
  const nonaktif = !bolehUbah || !pemeliharaanAktif || sibuk !== null
  return (
    <section className="vsf-card flex flex-col justify-between p-4 sm:p-5" aria-label={judul}>
      <div>
        <div className="vsf-judul-bagian">{judul}</div>
        <div className="vsf-blok mt-3 px-3 py-2">
          <div className="vsf-label">BACAAN ALAT SEKARANG</div>
          <div className="mt-0.5 text-[18px] font-bold tabular-nums text-tinta">{bacaan}</div>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-abu">
          <li>Aktifkan mode pemeliharaan.</li>
          <li>Celup probe ke <b className="text-tinta">{larutan[titik - 1]}</b>, tunggu bacaan tenang.</li>
          <li>Tekan &ldquo;Ukur&rdquo;, tunggu alat menjawab, lalu &ldquo;Simpan&rdquo;.</li>
          <li>Ulangi untuk titik berikutnya. Kalibrasi selesai setelah dua titik tersimpan.</li>
        </ol>
        <div className="mt-3 flex gap-2" role="group" aria-label="Titik kalibrasi">
          {([1, 2] as const).map((t) => (
            <button key={t} type="button" aria-pressed={titik === t}
              className={titik === t ? 'vsf-btn-primary' : 'vsf-btn-secondary'} onClick={() => setTitik(t)}>
              Titik {t}
            </button>
          ))}
        </div>
        {bolehUbah && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="vsf-btn-primary" disabled={nonaktif} onClick={() => void onKirim(sensor, titik, 'UKUR')}>
              Ukur titik {titik}
            </button>
            <button type="button" className="vsf-btn-primary" disabled={nonaktif} onClick={() => void onKirim(sensor, titik, 'SIMPAN')}>
              Simpan titik {titik}
            </button>
            <button type="button" className="vsf-btn-secondary" disabled={nonaktif} onClick={() => void onKirim(sensor, titik, 'BATAL')}>
              Batal
            </button>
          </div>
        )}
      </div>
      {bolehUbah && (
        <button type="button" className="vsf-btn-secondary mt-3 w-full" disabled={sibuk !== null} onClick={onBalik}>
          Kembalikan kalibrasi sebelumnya
        </button>
      )}
    </section>
  )
}
