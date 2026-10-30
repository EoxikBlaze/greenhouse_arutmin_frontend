import { describe, expect, it } from 'vitest'
import {
  catatanPerubahan,
  daftarPerubahan,
  hitungPerAksi,
  namaTabel,
  nomorHalaman,
  ringkasPerangkat,
  ringkasSingkat,
  saringAudit,
  waktuRelatif,
  type AuditRow,
} from './audit'

const dasar: AuditRow = {
  id: 1,
  terjadi_pada: '2026-10-30T01:00:00Z',
  actor_user_id: 1,
  actor_tipe: 'user',
  actor_label: 'garap',
  aksi: 'create',
  tabel: 'mejas',
  row_id: '5',
  before_data: null,
  after_data: null,
  ip: '127.0.0.1',
  user_agent: null,
  meta: { level: 'admin', rute: 'POST /meja' },
}
const baris = (p: Partial<AuditRow>): AuditRow => ({ ...dasar, ...p })

describe('daftarPerubahan', () => {
  it('create: hanya nilai baru, tanpa kolom waktu', () => {
    const p = daftarPerubahan(baris({ after_data: { nama: 'Meja 1', created_at: '2026-01-01T00:00:00Z' } }))
    expect(p).toEqual([{ kunci: 'nama', label: 'Nama', baru: 'Meja 1' }])
  })
  it('update: hanya kunci yang berubah', () => {
    const p = daftarPerubahan(baris({ aksi: 'update', before_data: { a: 1, b: 2 }, after_data: { a: 1, b: 3 } }))
    expect(p).toEqual([{ kunci: 'b', label: 'B', lama: '2', baru: '3' }])
  })
  it('delete: hanya nilai lama', () => {
    const p = daftarPerubahan(baris({ aksi: 'delete', before_data: { nama: 'X' } }))
    expect(p).toEqual([{ kunci: 'nama', label: 'Nama', lama: 'X' }])
  })
  it('login kosong', () => expect(daftarPerubahan(baris({ aksi: 'login' }))).toEqual([]))
})

describe('catatanPerubahan & ringkasSingkat', () => {
  it('login', () => {
    const r = baris({ aksi: 'login', after_data: { username: 'garap', level: 'admin' } })
    expect(catatanPerubahan(r)).toBe('Masuk sebagai garap (admin)')
  })
  it('password tidak direkam', () => {
    const r = baris({ aksi: 'update', meta: { perubahan: 'Password' } })
    expect(catatanPerubahan(r)).toBe('Password diubah (nilai tidak direkam)')
  })
  it('update tanpa beda', () => {
    const r = baris({ aksi: 'update', before_data: { a: 1 }, after_data: { a: 1 } })
    expect(ringkasSingkat(r)).toBe('Tidak ada nilai berubah')
  })
  it('lebih dari dua → +N lainnya', () => {
    const r = baris({ after_data: { a: 1, b: 2, c: 3, d: 4 } })
    expect(ringkasSingkat(r)).toBe('A: 1 · B: 2 · +2 lainnya')
  })
})

describe('waktuRelatif', () => {
  const sekarang = new Date('2026-10-30T02:00:00Z').getTime()
  it('baru saja', () => expect(waktuRelatif('2026-10-30T01:59:50Z', sekarang)).toBe('baru saja'))
  it('menit', () => expect(waktuRelatif('2026-10-30T01:55:00Z', sekarang)).toBe('5 menit lalu'))
  it('jam', () => expect(waktuRelatif('2026-10-30T00:00:00Z', sekarang)).toBe('2 jam lalu'))
  it('kemarin', () => expect(waktuRelatif('2026-10-29T02:00:00Z', sekarang)).toBe('kemarin'))
})

describe('lain-lain', () => {
  it('namaTabel ramah + fallback', () => {
    expect(namaTabel('tanamen')).toBe('Jenis tanaman')
    expect(namaTabel('tabel_baru')).toBe('tabel_baru')
  })
  it('saringAudit cari nama ramah', () => {
    expect(saringAudit([baris({})], 'meja')).toHaveLength(1)
    expect(saringAudit([baris({})], 'zzz')).toHaveLength(0)
  })
  it('hitungPerAksi', () => {
    expect(hitungPerAksi([baris({}), baris({ aksi: 'login' }), baris({ aksi: 'login' })])).toMatchObject({ create: 1, login: 2 })
  })
  it('nomorHalaman', () => {
    expect(nomorHalaman(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(nomorHalaman(5, 20)).toEqual([1, '…', 4, 5, 6, '…', 20])
    expect(nomorHalaman(1, 20)).toEqual([1, 2, '…', 20])
  })
  it('ringkasPerangkat', () => {
    expect(ringkasPerangkat('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537')).toBe('Chrome · Windows')
    expect(ringkasPerangkat(null)).toBe('—')
  })
})
