import { BadRequestException } from '@nestjs/common'
import { assertPasswordPolicy, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password.js'

describe('assertPasswordPolicy', () => {
  it('accepts 8 to 128 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
    expect(MAX_PASSWORD_LENGTH).toBe(128)
    expect(() => assertPasswordPolicy('x'.repeat(8))).not.toThrow()
    expect(() => assertPasswordPolicy('x'.repeat(128))).not.toThrow()
  })

  it.each([7, 129])('refuses %i characters', (n) => {
    expect(() => assertPasswordPolicy('x'.repeat(n))).toThrow(BadRequestException)
    expect(() => assertPasswordPolicy('x'.repeat(n))).toThrow('Password must be 8–128 characters')
  })
})
