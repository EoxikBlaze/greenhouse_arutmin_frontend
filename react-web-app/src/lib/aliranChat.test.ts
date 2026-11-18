import { describe, expect, it } from 'vitest'
import { bacaAliran } from './aliranChat'

const baris = (...o: object[]) => o.map((x) => `${JSON.stringify(x)}\n`).join('')

describe('bacaAliran (NDJSON /api/ai/chat)', () => {
  it('mengumpulkan kalimat yang sudah utuh, mengabaikan baris yang belum selesai', () => {
    const teks = baris({ tipe: 'kalimat', teks: 'pH aman.' }, { tipe: 'kalimat', teks: 'Suhu normal.' }) + '{"tipe":"kal'
    expect(bacaAliran(teks)).toEqual({ kalimat: ['pH aman.', 'Suhu normal.'], selesai: null })
  })

  it('mengembalikan jawaban akhir dari baris selesai', () => {
    const teks = baris({ tipe: 'kalimat', teks: 'A.' }, { tipe: 'selesai', jawaban: 'A. B.', sumber: 'ollama' })
    expect(bacaAliran(teks).selesai).toEqual({ tipe: 'selesai', jawaban: 'A. B.', sumber: 'ollama' })
  })

  it('backend lama yang membalas JSON biasa tetap terbaca sebagai jawaban akhir', () => {
    expect(bacaAliran('{"jawaban":"halo","sumber":"sapaan"}').selesai).toEqual({ jawaban: 'halo', sumber: 'sapaan' })
  })

  it('teks kosong atau rusak tidak melempar galat', () => {
    expect(bacaAliran('')).toEqual({ kalimat: [], selesai: null })
    expect(bacaAliran('bukan json\n')).toEqual({ kalimat: [], selesai: null })
  })
})
