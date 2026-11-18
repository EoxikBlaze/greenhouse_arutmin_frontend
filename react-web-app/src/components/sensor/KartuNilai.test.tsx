import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KartuNilai } from './KartuNilai'
import type { KunciSensor, TitikSeri } from '../../lib/sensorLaporan'

const KINI = Date.parse('2026-11-18T03:30:00Z')
const kosong: Record<KunciSensor, TitikSeri | null> = { ph: null, waterTemp: null, tds: null, ec_ms_cm: null, airTemp: null, humidity: null }
const props = { ambang: null, terpilih: ['ph'] as KunciSensor[], onToggle: () => {}, kini: KINI, memuat: false }

describe('KartuNilai — sensor yang tidak dikirim alat', () => {
  it('ppm terakhir berjam-jam lalu tidak tampil sebagai nilai sekarang', () => {
    const html = renderToStaticMarkup(
      <KartuNilai {...props} waktuTerbaru={KINI} terakhir={{ ...kosong, tds: { t: KINI - 3 * 3600_000, y: 1347 } }} />,
    )
    expect(html).toContain('Tidak terbaca')
    expect(html).toContain('terakhir 1.347 ppm')
  })

  it('bacaan segar tetap tampil normal', () => {
    const html = renderToStaticMarkup(
      <KartuNilai {...props} waktuTerbaru={KINI} terakhir={{ ...kosong, tds: { t: KINI, y: 1050 } }} />,
    )
    expect(html).not.toContain('Tidak terbaca')
    expect(html).toContain('1.050')
  })
})
