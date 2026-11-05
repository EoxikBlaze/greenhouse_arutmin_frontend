import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useApiError } from '../lib/crudApi'
import { useApiObject } from '../lib/useApiObject'
import { useAuth } from '../lib/authContext'
import type { UserRow } from '../lib/pengguna'
import { Pesan, Rangka } from '../components/kaca/DialogKaca'
import { DialogGantiSandi, type FormSandi } from '../components/profile/DialogGantiSandi'
import { DialogUbahProfil, type FormProfil } from '../components/profile/DialogUbahProfil'
import { KartuProfil } from '../components/profile/KartuProfil'
import { PanelTampilan } from '../components/profile/PanelTampilan'

type ProfilPayload = { user?: UserRow | null }

const SANDI_KOSONG: FormSandi = { password_lama: '', password: '', password_confirmation: '' }

/* ===== Profile — GET /profil (milik sendiri) · POST /profil/update · POST /profil/password ===== */
export function ProfilePage() {
  const handleApiError = useApiError()
  const { demo, logout } = useAuth()
  const { data, loading, error, reload } = useApiObject<ProfilPayload>('/profil')
  const user = data?.user ?? null

  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 4000)
    return () => clearTimeout(id)
  }, [flash])

  const [ubah, setUbah] = useState<FormProfil | null>(null)
  const [ubahErr, setUbahErr] = useState<Record<string, string[]>>({})
  const [ubahGalat, setUbahGalat] = useState<string | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)

  const [sandi, setSandi] = useState<FormSandi | null>(null)
  const [sandiErr, setSandiErr] = useState<Record<string, string[]>>({})
  const [sandiGalat, setSandiGalat] = useState<string | null>(null)
  const [memperbarui, setMemperbarui] = useState(false)

  function bukaUbah() {
    setUbah({ username: user?.username ?? '', email: user?.email ?? '' })
    setUbahErr({})
    setUbahGalat(null)
  }

  function bukaSandi() {
    setSandi(SANDI_KOSONG)
    setSandiErr({})
    setSandiGalat(null)
  }

  async function simpanProfil() {
    if (!ubah || menyimpan) return
    setUbahGalat(null)
    const errs: Record<string, string[]> = {}
    if (ubah.username.trim().length < 3) errs.username = ['Nama pengguna min 3 karakter.']
    setUbahErr(errs)
    if (Object.keys(errs).length > 0) return

    setMenyimpan(true)
    try {
      const res = await api.post('/profil/update', {
        username: ubah.username.trim(),
        email: ubah.email.trim() || null,
      })
      setFlash(String((res.data as { message?: unknown })?.message ?? 'Perubahan tersimpan.'))
      setUbah(null)
      reload()
    } catch (err) {
      const f = handleApiError(err)
      setUbahErr(f.fieldErrors)
      setUbahGalat(f.message)
    } finally {
      setMenyimpan(false)
    }
  }

  async function gantiSandi() {
    if (!sandi || memperbarui) return
    setSandiGalat(null)
    const errs: Record<string, string[]> = {}
    if (sandi.password.length < 8) errs.password = ['Password baru min 8 karakter.']
    if (sandi.password !== sandi.password_confirmation) errs.password_confirmation = ['Konfirmasi password tidak cocok.']
    setSandiErr(errs)
    if (Object.keys(errs).length > 0) return

    setMemperbarui(true)
    try {
      const res = await api.post('/profil/password', sandi)
      setFlash(String((res.data as { message?: unknown })?.message ?? 'Perubahan tersimpan.'))
      setSandi(null)
    } catch (err) {
      const f = handleApiError(err)
      setSandiErr(f.fieldErrors)
      setSandiGalat(f.message)
    } finally {
      setMemperbarui(false)
    }
  }

  return (
    <div className="vsf-halaman vsf-stagger">
      {flash && <Pesan jenis="ok" onTutup={() => setFlash(null)}>{flash}</Pesan>}
      {error && (
        <Pesan jenis="galat">
          {error}{' '}
          <button type="button" className="vsf-btn-secondary vsf-btn-kecil ml-2" onClick={reload}>
            Coba lagi
          </button>
        </Pesan>
      )}

      {loading && !user ? (
        <section className="vsf-card p-4 sm:p-6"><Rangka /></section>
      ) : (
        <KartuProfil
          user={user}
          memuat={loading}
          terkunci={demo}
          onUbah={bukaUbah}
          onSandi={bukaSandi}
          onKeluar={logout}
        />
      )}
      <PanelTampilan />

      {ubah && (
        <DialogUbahProfil
          form={ubah}
          setForm={setUbah}
          fieldErrors={ubahErr}
          galat={ubahGalat}
          menyimpan={menyimpan}
          onTutup={() => setUbah(null)}
          onSimpan={() => void simpanProfil()}
        />
      )}
      {sandi && (
        <DialogGantiSandi
          form={sandi}
          setForm={setSandi}
          fieldErrors={sandiErr}
          galat={sandiGalat}
          menyimpan={memperbarui}
          onTutup={() => setSandi(null)}
          onSimpan={() => void gantiSandi()}
        />
      )}
    </div>
  )
}

export default ProfilePage
