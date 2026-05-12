import { describe, it, expect } from 'vitest'
import { fmtL, fmtCr, fmtINR, fmtDate } from '../../utils/format'

describe('fmtL', () => {
  it('formats values as lakhs with 2 decimal places', () => {
    expect(fmtL(1000000)).toBe('₹10.00L')
    expect(fmtL(2100000)).toBe('₹21.00L')
    expect(fmtL(500000)).toBe('₹5.00L')
    expect(fmtL(7263000)).toBe('₹72.63L')
  })
  it('uses absolute value for negative numbers', () => {
    expect(fmtL(-2100000)).toBe('₹21.00L')
  })
})

describe('fmtCr', () => {
  it('formats as crores when value >= 1 Cr', () => {
    expect(fmtCr(10000000)).toBe('₹1.00Cr')
    expect(fmtCr(18000000)).toBe('₹1.80Cr')
  })
  it('falls back to lakhs for values below 1 Cr', () => {
    expect(fmtCr(500000)).toBe('₹5.00L')
    expect(fmtCr(9999999)).toBe('₹100.00L') // 9999999/100000 = 99.9999 → rounds to 100.00
  })
  it('uses absolute value', () => {
    expect(fmtCr(-10000000)).toBe('₹1.00Cr')
  })
})

describe('fmtINR', () => {
  it('prefixes with ₹ and rounds to integer', () => {
    expect(fmtINR(75500)).toBe('₹75,500')
    expect(fmtINR(75500.9)).toBe('₹75,501')
  })
  it('uses absolute value', () => {
    expect(fmtINR(-50000)).toBe('₹50,000')
  })
})

describe('fmtDate', () => {
  it('formats as short month + year in en-IN locale', () => {
    expect(fmtDate(new Date('2019-05-01'))).toMatch(/May 2019/)
    expect(fmtDate(new Date('2022-04-01'))).toMatch(/Apr 2022/)
  })
})
