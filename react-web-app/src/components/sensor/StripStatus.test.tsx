import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StripStatus } from './StripStatus'

const KINI = Date.parse('2026-11-18T10:00:00Z')
const dasar = { waktuTerbaru: KINI - 60_000, kini: KINI, memuat: false, jumlah: 10, kembar: 0 }

describe('StripStatus — status dari server (sama dengan Dashboard)', () => {
  it('data segar → alat mengirim data', () => {
    expect(renderToStaticMarkup(<StripStatus {...dasar} alatOnline dataSegar />)).toContain('Alat mengirim data')
  })

  it('terhubung MQTT tetapi data tidak baru → dibedakan dari terputus', () => {
    expect(renderToStaticMarkup(<StripStatus {...dasar} alatOnline dataSegar={false} />)).toContain('Alat terhubung, data sensor belum masuk')
  })

  it('tidak terhubung → alat terputus', () => {
    expect(renderToStaticMarkup(<StripStatus {...dasar} alatOnline={false} dataSegar={false} />)).toContain('Alat terputus')
  })

  it('status server belum dimuat → pakai umur bacaan (≤ 10 menit = mengirim)', () => {
    expect(renderToStaticMarkup(<StripStatus {...dasar} alatOnline={null} dataSegar={null} />)).toContain('Alat mengirim data')
  })
})
