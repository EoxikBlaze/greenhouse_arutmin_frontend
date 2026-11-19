import { describe, expect, it } from 'vitest'
import { formatSel, gagalAktivitas, ringkasAktivitas, type Aktivitas } from './aktivitas'

const dasar: Aktivitas = { kunci: 'x', waktu: '2026-11-19T08:00:00Z', jenis: 'data', aksi: 'create', pelaku: 'garap', objek: 'mejas', ref: '3', status: null, ringkas: null, detail: null }

describe('aktivitas', () => {
  it('ringkasan per jenis dalam bahasa petani', () => {
    expect(ringkasAktivitas(dasar)).toBe('Tambah mejas #3')
    expect(ringkasAktivitas({ ...dasar, jenis: 'perintah', aksi: 'SEMAI', objek: 'aktuator-01', ringkas: 'semai_dimulai' })).toBe('Mulai semai ke aktuator-01 — semai_dimulai')
    expect(ringkasAktivitas({ ...dasar, jenis: 'peringatan', aksi: 'buka', objek: 'x', ringkas: 'Air RENDAH' })).toBe('Peringatan muncul: Air RENDAH')
    expect(ringkasAktivitas({ ...dasar, jenis: 'dosing', aksi: 'AB', ringkas: 'ke-2 hari ini' })).toBe('Nutrisi A+B ke-2 hari ini')
    expect(ringkasAktivitas({ ...dasar, jenis: 'login', aksi: 'login' })).toBe('garap masuk ke sistem')
  })

  it('status gagal ditandai', () => {
    expect(gagalAktivitas('gagal')).toBe(true)
    expect(gagalAktivitas('selesai')).toBe(false)
    expect(gagalAktivitas(null)).toBe(false)
  })

  it('format sel laporan: kosong, angka, tanggal', () => {
    expect(formatSel(null)).toBe('—')
    expect(formatSel(1250)).toBe('1.250')
    expect(formatSel(6.2)).toBe('6,2')
    expect(formatSel('2026-11-19T00:00:00.000Z')).toMatch(/2026/)
    expect(formatSel('teks')).toBe('teks')
  })
})
