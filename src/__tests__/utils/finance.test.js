import { describe, it, expect } from 'vitest'
import { monthsBetween, xirr, solveRate, computeLoanParams } from '../../utils/finance'

describe('monthsBetween', () => {
  it('returns correct month count for multi-year span', () => {
    expect(monthsBetween(new Date('2019-05-01'), new Date('2026-05-01'))).toBe(84)
  })
  it('returns correct count within a year', () => {
    expect(monthsBetween(new Date('2020-01-01'), new Date('2020-07-01'))).toBe(6)
  })
  it('returns 0 for same date', () => {
    expect(monthsBetween(new Date('2020-06-01'), new Date('2020-06-01'))).toBe(0)
  })
  it('handles year-boundary crossings', () => {
    expect(monthsBetween(new Date('2019-11-01'), new Date('2020-02-01'))).toBe(3)
  })
})

describe('xirr', () => {
  it('returns ~10% for a simple one-year 10% gain', () => {
    const cfs = [-1000, 1100]
    const dates = [new Date('2020-01-01'), new Date('2021-01-01')]
    expect(xirr(cfs, dates)).toBeCloseTo(0.10, 3)
  })

  it('returns ~0% for a break-even investment', () => {
    const cfs = [-1000, 1000]
    const dates = [new Date('2020-01-01'), new Date('2021-01-01')]
    expect(xirr(cfs, dates)).toBeCloseTo(0, 3)
  })

  it('returns ~5.92% for the default scenario', () => {
    // Rebuild cash flows matching App DEFAULT_FORM + DEFAULT_EVENTS
    const purchaseDate = new Date('2019-05-01')
    const valuationDate = new Date('2026-05-01')
    const movedInDate  = new Date('2022-04-01')
    const emiStart = new Date('2019-06-01')
    const monthlyEmi = 75500, monthlyRent = 50000
    const downPayment = 2100000, outstandingLoan = 7263000, currentValue = 18000000

    const cfV = [-downPayment], cfD = [new Date(purchaseDate)]
    for (let m = 0; m < 84; m++) {
      const d = new Date(emiStart)
      d.setMonth(d.getMonth() + m)
      if (d >= valuationDate) break
      cfV.push(d >= movedInDate ? -(monthlyEmi - monthlyRent) : -monthlyEmi)
      cfD.push(new Date(d))
    }
    cfV.push(-800000);  cfD.push(new Date('2021-05-01'))
    cfV.push(-1300000); cfD.push(new Date('2022-12-01'))
    cfV.push(currentValue - outstandingLoan); cfD.push(new Date(valuationDate))

    expect(xirr(cfV, cfD) * 100).toBeCloseTo(5.92, 1)
  })
})

describe('solveRate', () => {
  it('finds the implied annual rate from P, EMI, outstanding, months', () => {
    const r = solveRate(8900000, 75500, 7263000, 84)
    expect(r).not.toBeNull()
    expect(r * 1200).toBeCloseTo(8.228, 1)
  })

  it('back-checks: computed outstanding matches the given outstanding', () => {
    const P = 8900000, E = 75500, O = 7263000, m = 84
    const r = solveRate(P, E, O, m)
    const g = Math.pow(1 + r, m)
    const computedO = P * g - E * (g - 1) / r
    expect(computedO).toBeCloseTo(O, 0)
  })

  it('returns null when Newton-Raphson cannot converge', () => {
    // EMI far too small to ever service this loan — solver cannot converge
    expect(solveRate(10000000, 100, 9900000, 120)).toBeNull()
  })
})

describe('computeLoanParams', () => {
  const base = { purchaseDate: '2019-05-01', valuationDate: '2026-05-01', loanAmount: '8900000' }

  it('roi mode: computes EMI and outstanding from rate + tenure', () => {
    const res = computeLoanParams({ ...base, loanMode: 'roi', loanRate: '8.5', loanTenure: '240' })
    expect(res).not.toBeNull()
    expect(res.mode).toBe('roi')
    expect(res.emi).toBeCloseTo(77236, -2)
    expect(res.os).toBeCloseTo(7278344, -3)
  })

  it('emi mode: computes rate and tenure from EMI + outstanding', () => {
    const res = computeLoanParams({ ...base, loanMode: 'emi', monthlyEmi: '75500', outstandingLoan: '7263000' })
    expect(res).not.toBeNull()
    expect(res.mode).toBe('emi')
    expect(res.rAnnual).toBeCloseTo(8.228, 1)
    expect(res.nTotal).toBeCloseTo(242, 0)
  })

  it('roi mode: returns null for zero rate', () => {
    expect(computeLoanParams({ ...base, loanMode: 'roi', loanRate: '0', loanTenure: '240' })).toBeNull()
  })

  it('emi mode: returns null for zero EMI', () => {
    expect(computeLoanParams({ ...base, loanMode: 'emi', monthlyEmi: '0', outstandingLoan: '7263000' })).toBeNull()
  })

  it('emi mode: returns error object when EMI is too low to service loan', () => {
    const res = computeLoanParams({ ...base, loanMode: 'emi', monthlyEmi: '5000', outstandingLoan: '7263000' })
    expect(res?.error).toBeTruthy()
  })

  it('returns null when dates are invalid (m <= 0)', () => {
    // Valuation before purchase
    const res = computeLoanParams({ ...base, valuationDate: '2018-01-01', loanMode: 'roi', loanRate: '8.5', loanTenure: '240' })
    expect(res).toBeNull()
  })
})
