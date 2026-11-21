import { describe, expect, it } from 'vitest'
import { parseApiFailure } from './crudApi'

describe('parseApiFailure timeout', () => {
  it('timeout dibedakan dari offline', () => {
    expect(parseApiFailure({ code: 'ECONNABORTED' }).message).toMatch(/terlalu lama/)
    expect(parseApiFailure({ code: 'ERR_NETWORK' }).message).toMatch(/Tidak dapat terhubung/)
  })
})
