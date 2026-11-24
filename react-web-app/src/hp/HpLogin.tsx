import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { Layar, Banner, Tombol } from './Komponen'

/** S02 Login — pen. Galat dari server tetap ditampilkan apa adanya. */
export function HpLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ingat, setIngat] = useState(true)
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return setGalat('Isi nama pengguna dan kata sandi.')
    setSibuk(true); setGalat('')
    try {
      navigate((await login(username, password, ingat)) || '/dashboard', { replace: true })
    } catch (err) {
      const d = (err as { response?: { data?: { message?: string } } })?.response?.data
      setGalat(d?.message || 'Login gagal — periksa koneksi ke sistem.')
    } finally { setSibuk(false) }
  }

  return (
    <Layar>
      <div className="hp-wordmark">Vertonik · GARAP</div>
      <h1 className="hp-judul">Masuk ke GARAP</h1>
      <p className="hp-sub">Pantau greenhouse Vertonik dari ponsel.</p>
      <form onSubmit={kirim} style={{ display: 'contents' }} noValidate>
        <div className="hp-field"><label htmlFor="hp-user">Nama pengguna</label>
          <input id="hp-user" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div className="hp-field"><label htmlFor="hp-sandi">Kata sandi</label>
          <input id="hp-sandi" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <label className="hp-baris" style={{ cursor: 'pointer' }}>
          <button type="button" role="switch" aria-checked={ingat} className="hp-saklar" onClick={() => setIngat(!ingat)} aria-label="Ingat saya"><i /></button>
          <span style={{ flex: 1 }}>Ingat saya</span>
        </label>
        {galat && <Banner tone="bahaya" judul="Login gagal" isi={galat} />}
        <Tombol type="submit" disabled={sibuk}>{sibuk ? 'Memeriksa…' : 'Masuk'}</Tombol>
      </form>
    </Layar>
  )
}
