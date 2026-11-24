import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/authContext'
import { useApiError } from '../../lib/crudApi'
import type { IotV41State } from '../../lib/iotV41'
import { Pesan, Rangka } from '../kaca/DialogKaca'
import { SwitchKaca } from '../SwitchKaca'

type KunciSaklar = 'nutrisi' | 'ph' | 'encer' | 'isi'

type SaklarItem = { kunci: KunciSaklar; judul: string; ket: string }

const DAFTAR_SAKLAR: readonly SaklarItem[] = [
  {
    kunci: 'nutrisi',
    judul: 'Nutrisi A + B',
    ket: 'OFF: alat tidak menyuntik nutrisi sendiri. ppm kurang hanya jadi peringatan.',
  },
  {
    kunci: 'ph',
    judul: 'Koreksi pH',
    ket: 'OFF: alat tidak menyuntik pH naik/turun sendiri. pH di luar rentang hanya jadi peringatan.',
  },
  {
    kunci: 'encer',
    judul: 'Pengenceran',
    ket: 'OFF: alat tidak menambah air untuk menurunkan ppm. Perlu "Isi air otomatis" juga menyala.',
  },
  {
    kunci: 'isi',
    judul: 'Isi air otomatis',
    ket: 'OFF: pompa isi tidak jalan sendiri saat air rendah (mis. pompa rusak). Petani mengisi sendiri. Selama air rendah, alat juga tidak mendosis.',
  },
]

/** Saklar → izin otomasi di alat (perintah OTOMASI). Alat tetap membaca sensor dan melapor. */
export function PanelSaklarMode({
  iot,
  loading,
  onReload,
}: {
  iot: IotV41State | null
  loading: boolean
  onReload: () => void
}) {
  const { role } = useAuth()
  const bolehUbah = role === 'admin'
  const handleApiError = useApiError()

  const p = iot?.params
  const diAlat = iot?.otomasi_alat ?? null

  const [draf, setDraf] = useState<Partial<Record<KunciSaklar, boolean>>>({})
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const tersimpan: Record<KunciSaklar, boolean> = {
    nutrisi: Boolean(p?.saklar_ab ?? true),
    ph: Boolean((p?.saklar_ph_up ?? true) && (p?.saklar_ph_down ?? true)),
    encer: Boolean(p?.saklar_pengenceran ?? true),
    isi: p ? p.mode_isi === 'otomatis' : true,
  }
  const form: Record<KunciSaklar, boolean> = {
    nutrisi: draf.nutrisi ?? tersimpan.nutrisi,
    ph: draf.ph ?? tersimpan.ph,
    encer: draf.encer ?? tersimpan.encer,
    isi: draf.isi ?? tersimpan.isi,
  }

  useEffect(() => {
    if (!pesan) return
    const id = window.setTimeout(() => setPesan(null), 6000)
    return () => window.clearTimeout(id)
  }, [pesan])

  function resetForm() {
    setDraf({})
    setGalat(null)
  }

  async function simpan() {
    if (!bolehUbah || sibuk) return
    setSibuk(true)
    setGalat(null)
    setPesan(null)
    try {
      const res = await api.put<{ message?: string }>('/iot-v41/saklar', {
        saklar_ab: form.nutrisi ? 1 : 0,
        saklar_ph_up: form.ph ? 1 : 0,
        saklar_ph_down: form.ph ? 1 : 0,
        saklar_pengenceran: form.encer ? 1 : 0,
        mode_isi: form.isi ? 'otomatis' : 'manual',
      })
      setDraf({})
      setPesan(res.data?.message ?? 'Saklar disimpan.')
      onReload()
    } catch (err) {
      setGalat(handleApiError(err).message)
    } finally {
      setSibuk(false)
    }
  }

  if (loading && !iot) {
    return (
      <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Saklar otomasi">
        <Rangka />
      </section>
    )
  }

  const peringatanEncerManual = !form.isi && form.encer

  return (
    <section className="vsf-card w-full min-w-0 p-4 sm:p-5" aria-label="Saklar otomasi">
      <div className="vsf-judul-bagian">Otomasi Alat</div>
      <p className="mt-0.5 text-[13px] text-abu">
        Matikan otomasi satu jenis tindakan saat semai berjalan. Alat tetap membaca sensor dan melapor, tindakan itu hanya jadi peringatan.
        {!bolehUbah && ' Hanya admin yang dapat mengubah saklar.'}
      </p>

      {pesan && <Pesan jenis="ok">{pesan}</Pesan>}
      {galat && <Pesan jenis="galat" onTutup={() => setGalat(null)}>{galat}</Pesan>}

      <div className="mt-4 grid gap-2.5">
        {DAFTAR_SAKLAR.map((item) => {
          const dilapor = diAlat?.[item.kunci] ?? null
          const sama = dilapor === null ? null : dilapor === tersimpan[item.kunci]
          return (
            <div key={item.kunci} className="vsf-blok flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-tinta">{item.judul}</div>
                <div className="mt-0.5 text-[12.5px] leading-relaxed text-abu">{item.ket}</div>
                <div className="mt-1 text-[12px] text-abu">
                  Di alat:{' '}
                  {dilapor === null
                    ? 'belum melapor'
                    : `${dilapor ? 'ON' : 'OFF'}${sama ? '' : ' (belum sama dengan web, menunggu alat)'}`}
                </div>
              </div>
              <SwitchKaca
                nyala={form[item.kunci]}
                label={item.judul}
                disabled={!bolehUbah || sibuk}
                onUbah={() => setDraf((s) => ({ ...s, [item.kunci]: !form[item.kunci] }))}
              />
            </div>
          )
        })}
      </div>

      {peringatanEncerManual && (
        <div role="status" className="vsf-tone-warn mt-3 rounded-input px-3 py-2.5 text-[12.5px] leading-relaxed">
          Pengenceran menyala tetapi isi air otomatis mati — ppm tinggi hanya jadi peringatan, alat tidak menambah air.
        </div>
      )}

      {bolehUbah && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="vsf-btn-primary" disabled={sibuk} onClick={() => void simpan()}>
              {sibuk && <span className="vsf-spinner" aria-hidden />}
              {sibuk ? 'Menyimpan…' : 'Simpan dan kirim ke alat'}
            </button>
            <button type="button" className="vsf-btn-secondary" disabled={sibuk} onClick={resetForm}>
              Batalkan
            </button>
          </div>
          <p className="mt-2 text-[12px] text-abu">
            Geser saklarnya dulu — belum ada yang dikirim sampai tombol di atas ditekan. Saklar OFF berarti alat tidak menyuntik atau mengisi sendiri; web tidak punya dosing manual, jadi tambahkan nutrisi atau pH langsung di penampung dan catat di logbook.
          </p>
        </div>
      )}
    </section>
  )
}
