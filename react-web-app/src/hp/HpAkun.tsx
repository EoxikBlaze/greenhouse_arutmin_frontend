import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useApiError } from '../lib/crudApi'
import { Banner, BarisMenu, JudulBagian, Kartu, Tombol } from './Komponen'

const VAR = { password_lama: '', password: '', password_confirmation: '' }

/** S60 Akun · S61 Ganti kata sandi · S62 Tentang. */
export function HpAkun() {
  const { username, role, logout } = useAuth()
  const handleApiError = useApiError()
  const [mode, setMode] = useState<'menu' | 'sandi'>('menu')
  const [f, setF] = useState(VAR)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function ganti(e: FormEvent) {
    e.preventDefault()
    if (f.password.length < 8) return setGalat('Kata sandi baru minimal 8 karakter.')
    if (f.password !== f.password_confirmation) return setGalat('Konfirmasi kata sandi tidak sama.')
    setSibuk(true); setGalat('')
    try { await api.post('/profil/password', f); logout() } catch (err) { handleApiError(err); setGalat('Gagal mengganti kata sandi. Periksa kata sandi lama.') } finally { setSibuk(false) }
  }

  if (mode === 'sandi') return (
    <>
      <JudulBagian judul="Ganti kata sandi" />
      <Banner judul="Perlu masuk kembali" isi="Setelah kata sandi diganti, Anda perlu masuk kembali." />
      <form onSubmit={ganti} style={{ display: 'contents' }}>
        {([['password_lama', 'Kata sandi lama'], ['password', 'Kata sandi baru'], ['password_confirmation', 'Ulangi kata sandi baru']] as const).map(([k, l]) => (
          <div key={k} className="hp-field"><label htmlFor={`s-${k}`}>{l}</label>
            <input id={`s-${k}`} type="password" autoComplete={k === 'password_lama' ? 'current-password' : 'new-password'} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
        {galat && <p className="hp-galat" role="alert">{galat}</p>}
        <Tombol type="submit" disabled={sibuk}>Simpan</Tombol>
        <Tombol sek onClick={() => { setMode('menu'); setF(VAR); setGalat('') }}>Batal</Tombol>
      </form>
    </>
  )
  return (
    <>
      <JudulBagian judul="Akun" />
      <Kartu>
        <div className="hp-header" style={{ boxShadow: 'none', padding: 0 }}>
          <div className="hp-avatar">{(username || '?').slice(0, 2).toUpperCase()}</div>
          <div><h1>{username}</h1><p>Level: {role}</p></div>
        </div>
      </Kartu>
      <Kartu>
        <BarisMenu ikon="kunci" label="Ganti kata sandi" onClick={() => setMode('sandi')} />
        <BarisMenu ikon="info" label="Tentang & tampilan" to="/tentang" />
      </Kartu>
      <p className="hp-meta">GARAP Mobile · Vertonik Smart Farm. Notifikasi hanya muncul di ponsel ini saat aplikasi dibuka.</p>
      <Link className="hp-btn bahaya" to="/login" onClick={(e) => { e.preventDefault(); logout() }}>Keluar</Link>
    </>
  )
}
