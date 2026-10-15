import { useState } from 'react'
import { BtnEdit, BtnHapus, CrudScreen, Field } from '../components/CrudScreen'

/* ============= 16 · MANAJEMEN USER ============= */
type UserRow = { username: string; level: string; demo: string; lastLogin: string }

export function ManajemenUserPage() {
  const rows: UserRow[] = [
    { username: 'admin', level: 'admin', demo: '—', lastLogin: '12 Okt 08:10' },
    { username: 'demo', level: 'demo', demo: 'Ya', lastLogin: '12 Okt 07:44' },
    { username: 'petani1', level: 'petani', demo: '—', lastLogin: '11 Okt 16:20' },
  ]

  return (
    <CrudScreen<UserRow>
      title="Toolbar — Manajemen User"
      addButton="+ Tambah User"
      columns={[
        { key: 'username', header: 'Username', render: (r) => <b className="text-slate-900">{r.username}</b> },
        { key: 'level', header: 'Level', render: (r) => r.level },
        { key: 'demo', header: 'Demo?', render: (r) => r.demo },
        { key: 'lastLogin', header: 'Terakhir login', render: (r) => r.lastLogin },
      ]}
      rows={rows}
      rowKey={(r) => r.username}
      form={
        <>
          <Field label="Username"><input className="vsf-input w-full" placeholder="petani2" /></Field>
          <Field label="Level"><input className="vsf-input w-full" placeholder="petani" /></Field>
          <Field label="Password"><input className="vsf-input w-full" type="password" placeholder="••••••••" /></Field>
        </>
      }
      notes={[
        'Level menentukan sidebar: petani hanya Dashboard / Sensor / Tanam Saya.',
        'Akun demo = admin read-only + data auto-hapus 1 jam.',
        'Reset password via modal konfirmasi.',
        'Aksi terhadap akun sendiri disembunyikan (tidak bisa hapus diri sendiri).',
      ]}
      actions={(r, ask) => (
        <>
          <BtnEdit />
          {r.username !== 'admin' && <BtnHapus label={r.username} onPick={ask} />}
        </>
      )}
    />
  )
}

/* ================ 17 · PROFIL ================ */
export function ProfilPage() {
  const [banner, setBanner] = useState(false)

  return (
    <div className="mx-auto max-w-[1180px] grid gap-4 vsf-stagger">
      {banner && (
        <div className="vsf-banner rounded-card border border-arutmin-moss bg-arutmin-mint/40 px-4 py-2 text-[13px] text-arutmin-forest">
          ✔ Perubahan tersimpan
        </div>
      )}

      {/* Kartu identitas */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Kartu identitas</div>
        <div className="mt-3 flex items-center gap-4">
          <div className="h-[64px] w-[64px] rounded-full border border-dashed border-arutmin-border grid place-items-center text-slate-500">
            foto
          </div>
          <div>
            <div className="text-[16px] font-bold">Admin</div>
            <div className="text-[13px] text-slate-600">username: admin • level: admin</div>
          </div>
        </div>
      </section>

      {/* Edit profil */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Edit profil</div>
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          <Field label="Nama"><input className="vsf-input w-full" defaultValue="Admin" /></Field>
          <Field label="Username"><input className="vsf-input w-full" defaultValue="admin" /></Field>
        </div>
        <button className="vsf-btn-primary mt-3" onClick={() => setBanner(true)}>
          Simpan Perubahan
        </button>
      </section>

      {/* Ganti password */}
      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">
          Ganti password (form terpisah: /profil/password)
        </div>
        <div className="mt-3 grid gap-1 max-w-sm">
          <Field label="Password lama"><input className="vsf-input w-full" type="password" /></Field>
          <Field label="Password baru"><input className="vsf-input w-full" type="password" /></Field>
          <Field label="Ulangi password baru"><input className="vsf-input w-full" type="password" /></Field>
        </div>
        <button className="vsf-btn-primary mt-3">Perbarui Password</button>
      </section>

      <section className="vsf-card p-4">
        <div className="text-[11px] uppercase tracking-[.14em] text-slate-500 font-bold">Catatan struktur & state</div>
        <ul className="mt-2 list-disc pl-5 text-[13px] text-slate-700 leading-relaxed">
          <li>State: password salah / tidak cocok → error inline per field.</li>
          <li>Sukses → banner hijau ‘Perubahan tersimpan’.</li>
        </ul>
      </section>
    </div>
  )
}
