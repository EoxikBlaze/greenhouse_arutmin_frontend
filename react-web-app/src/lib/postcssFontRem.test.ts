import postcss from 'postcss'
import { describe, expect, it } from 'vitest'
import fontRem from '../../tools/postcssFontRem.js'

const ubah = async (css: string) => (await postcss([fontRem()]).process(css, { from: undefined })).css

describe('postcssFontRem', () => {
  it('mengubah font-size px menjadi rem (16px = 1rem) agar ikut setelan ukuran huruf pengguna', async () => {
    expect(await ubah('.a{font-size:13px}')).toBe('.a{font-size:0.8125rem}')
    expect(await ubah('.b{font-size: 12.5px !important}')).toBe('.b{font-size: 0.78125rem !important}')
  })

  it('tidak menyentuh properti lain, nilai non-px, atau px di dalam fungsi', async () => {
    expect(await ubah('.c{padding:13px;font-size:1.2em}')).toBe('.c{padding:13px;font-size:1.2em}')
    expect(await ubah('.d{font-size:clamp(14px,2vw,18px)}')).toBe('.d{font-size:clamp(14px,2vw,18px)}')
  })
})
