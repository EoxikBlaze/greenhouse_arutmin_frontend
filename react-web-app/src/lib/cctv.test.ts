import { describe, expect, it } from 'vitest'
import { formDari, labelTipe, sambung, urlAmanBrowser } from './cctv'

describe('cctv', () => {
  it('sambung menambah penanda waktu dengan pemisah yang tepat', () => {
    expect(sambung('http://x/capture', 5)).toBe('http://x/capture?_t=5')
    expect(sambung('http://x/c?a=1', 5)).toBe('http://x/c?a=1&_t=5')
  })
  it('labelTipe per jenis', () => {
    expect(labelTipe({ tipe: 'mjpeg', interval_detik: 5 })).toBe('Aliran MJPEG')
    expect(labelTipe({ tipe: 'snapshot', interval_detik: 3 })).toBe('Snapshot tiap 3 dtk')
    expect(labelTipe({ tipe: 'rtsp', interval_detik: 10 })).toContain('RTSP')
  })
  it('formDari: kosong untuk baru, isi untuk kamera', () => {
    expect(formDari().aktif).toBe(true)
    const f = formDari({ id: 1, nama: 'A', lokasi: null, tipe: 'rtsp', url: null, interval_detik: 7, aktif: false })
    expect(f).toMatchObject({ nama: 'A', lokasi: '', url: '', interval_detik: '7', aktif: false })
  })
  it('urlAmanBrowser menolak port berbahaya Chrome (ERR_UNSAFE_PORT seperti port 9)', () => {
    expect(urlAmanBrowser('http://127.0.0.1:9/stream')).toBe(false)
    expect(urlAmanBrowser('http://192.168.1.50:81/stream')).toBe(true)
    expect(urlAmanBrowser('/cctv/18/demo.svg')).toBe(true)
  })
})
