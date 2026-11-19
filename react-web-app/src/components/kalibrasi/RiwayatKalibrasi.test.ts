import { describe, expect, it } from 'vitest'
import { kalibrasiTerpakai } from './RiwayatKalibrasi'
import type { ArsipKalibrasiRow } from '../../lib/iotV41'

const baris = (id: number, sensor: string, catatan: string, konstanta_baru: ArsipKalibrasiRow['konstanta_baru'] = null): ArsipKalibrasiRow =>
  ({ id, sensor, dilakukan_pada: `2026-11-${10 + id}T08:00:00Z`, catatan, konstanta_baru })

describe('kalibrasiTerpakai', () => {
  it('ambil hasil terakhir per titik (terbaru dulu), abaikan sensor lain', () => {
    const r = kalibrasiTerpakai([
      baris(4, 'ph', 'Titik 2', { titik: 2, tegangan: 2.1, acuan: 6.86 }),
      baris(3, 'ec', 'Titik 1', { titik: 1, tegangan: 1, acuan: 1.413 }),
      baris(2, 'ph', 'Titik 1 baru', { titik: 1, tegangan: 2.5, acuan: 4.01 }),
      baris(1, 'ph', 'Titik 1 lama', { titik: 1, tegangan: 9, acuan: 4.01 }),
    ], 'ph')
    expect(r.titik.map((h) => [h.titik.titik, h.titik.tegangan])).toEqual([[1, 2.5], [2, 2.1]])
    expect(r.dikembalikan).toBeNull()
  })

  it('tandai bila kalibrasi sudah dikembalikan setelah titik terakhir', () => {
    const r = kalibrasiTerpakai([
      baris(2, 'ph', 'Dikembalikan ke kalibrasi sebelumnya (balik_kalibrasi)'),
      baris(1, 'ph', 'Titik 1', { titik: 1, tegangan: 2.5, acuan: 4.01 }),
    ], 'ph')
    expect(r.dikembalikan).toBe('2026-11-12T08:00:00Z')
  })
})
