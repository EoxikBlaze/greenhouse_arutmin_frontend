import { describe, expect, it } from 'vitest'
import { infoNutrisiPindah, type TanamRow } from './kebun'

const dasar: TanamRow = { id: 1, tipe: 'semai', tahap_berikut: 'peremajaan' }

describe('infoNutrisiPindah — apa yang terjadi pada ppm saat pindah tahap dikonfirmasi', () => {
  it('per siklus: ppm tahap berikutnya baru mulai setelah konfirmasi', () => {
    const r: TanamRow = { ...dasar, nutrisi: { kurva: { cara: 'tahap', ppm_semai: 300, ppm_peremajaan: 700, ppm_pendewasaan: 1100 }, hari_netpot: null, target_hari_ini: 300, per_hari: null } }
    const t = infoNutrisiPindah(r)
    expect(t).toContain('300 → 700 ppm')
    expect(t).toContain('setelah Anda menekan konfirmasi')
  })

  it('per siklus: dari peremajaan ke pendewasaan memakai angka tahap yang tepat', () => {
    const r: TanamRow = { ...dasar, tipe: 'peremajaan', tahap_berikut: 'pendewasaan', nutrisi: { kurva: { cara: 'tahap', ppm_semai: 300, ppm_peremajaan: 700, ppm_pendewasaan: 1100 }, hari_netpot: 2, target_hari_ini: 700, per_hari: null } }
    expect(infoNutrisiPindah(r)).toContain('700 → 1100 ppm')
  })

  it('per hari: tidak berubah, tidak menunggu klik', () => {
    const r: TanamRow = { ...dasar, nutrisi: { kurva: { cara: 'harian', ppm_awal: 400, ppm_target: 1200, hari_capai: 16, diubah_hari: null }, hari_semai: 1, hari_netpot: null, target_hari_ini: 450, per_hari: 50 } }
    const t = infoNutrisiPindah(r)
    expect(t).toContain('tidak berubah')
    expect(t).toContain('hari ini 450 ppm')
  })

  it('tahap terakhir per siklus: alat berhenti setelah panen; tanpa resep: tidak ada perubahan', () => {
    const panen: TanamRow = { ...dasar, tipe: 'pendewasaan', tahap_berikut: 'panen', nutrisi: { kurva: { cara: 'tahap', ppm_semai: 300, ppm_peremajaan: 700, ppm_pendewasaan: 1100 }, hari_netpot: 5, target_hari_ini: 1100, per_hari: null } }
    expect(infoNutrisiPindah(panen)).toContain('alat berhenti menjaga')
    expect(infoNutrisiPindah({ ...dasar, nutrisi: null })).toContain('tidak ada perubahan ppm')
  })
})
