import { describe, expect, it } from 'vitest'
import { bolehSplash } from './useSplash'

describe('bolehSplash', () => {
  it('tampil pada kunjungan biasa', () => expect(bolehSplash('', '', false)).toBe(true))
  it('lewati bila gerak dikurangi', () => expect(bolehSplash('', '', true)).toBe(false))
  it('lewati untuk tautan ber-hash', () => expect(bolehSplash('#tim', '', false)).toBe(false))
  it('lewati dengan ?splash=0', () => expect(bolehSplash('', '?splash=0', false)).toBe(false))
})
