import { describe, it, expect } from 'vitest'
import { buildRentInvestSchedule, getInvestRate } from '../../utils/rentInvestment'

// ── getInvestRate ────────────────────────────────────────────────────────────

describe('getInvestRate', () => {
  it('returns 7 for fd-7', () => expect(getInvestRate('fd-7')).toBe(7))
  it('returns 9 for debt-9', () => expect(getInvestRate('debt-9')).toBe(9))
  it('returns 12 for equity-12', () => expect(getInvestRate('equity-12')).toBe(12))
  it('returns 12 for unknown keys (default)', () => expect(getInvestRate('unknown')).toBe(12))
})

// ── helpers ──────────────────────────────────────────────────────────────────

const base = {
  downPayment: 1_000_000,
  estEmi: 50_000,
  tenureMonths: 12,
  monthlyRent: 30_000,
  annualRentIncrease: 0,
  startDate: null,
  investRate: 12,          // 1% / month
  additionalLumpsums: [],
}

// ── basic SIP scenario ───────────────────────────────────────────────────────

describe('buildRentInvestSchedule — SIP scenario (EMI > rent)', () => {
  it('produces a schedule with tenureMonths rows', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.schedule).toHaveLength(12)
  })

  it('is not depleted', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.depleted).toBe(false)
    expect(res.depletedAt).toBeNull()
  })

  it('corpus after 1 month: downPayment×1.01 + SIP(EMI−rent)', () => {
    // 1,000,000 × 1.01 + (50,000 − 30,000) = 1,030,000
    const res = buildRentInvestSchedule({ ...base, tenureMonths: 1 })
    expect(res.finalCorpus).toBe(1_030_000)
    expect(res.schedule[0].corpus).toBe(1_030_000)
    expect(res.schedule[0].sipAmount).toBe(20_000)
    expect(res.schedule[0].swpAmount).toBe(0)
  })

  it('totalRentPaid equals 12 × monthlyRent when annualRentIncrease is 0', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.totalRentPaid).toBe(12 * 30_000)
  })

  it('totalSipIn equals 12 × (EMI − rent) when annualRentIncrease is 0', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.totalSipIn).toBe(12 * 20_000)
  })

  it('totalInvested = downPayment + totalSipIn + additionalLumpsums', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.totalInvested).toBe(res.downPayment ?? 1_000_000 + res.totalSipIn)
    // More directly:
    expect(res.totalInvested).toBe(1_000_000 + 12 * 20_000)
  })

  it('finalCorpus > totalInvested (investment gains at 12% pa)', () => {
    const res = buildRentInvestSchedule(base)
    expect(res.finalCorpus).toBeGreaterThan(res.totalInvested)
  })
})

// ── SWP scenario (rent > EMI) ────────────────────────────────────────────────

describe('buildRentInvestSchedule — SWP scenario (rent > EMI)', () => {
  const swpBase = { ...base, monthlyRent: 60_000, estEmi: 30_000, downPayment: 5_000_000 }

  it('records swpAmount and not sipAmount in SWP months', () => {
    const res = buildRentInvestSchedule({ ...swpBase, tenureMonths: 1 })
    expect(res.schedule[0].sipAmount).toBe(0)
    expect(res.schedule[0].swpAmount).toBe(30_000)
  })

  it('totalSwpOut equals 12 × (rent − EMI) at 0% rent increase', () => {
    const res = buildRentInvestSchedule({ ...swpBase, tenureMonths: 12 })
    expect(res.totalSwpOut).toBe(12 * 30_000)
  })

  it('corpus after 1 SWP month: (downPayment×1.01) − swpAmount', () => {
    // 5,000,000 × 1.01 = 5,050,000; withdraw 30,000 → 5,020,000
    const res = buildRentInvestSchedule({ ...swpBase, tenureMonths: 1 })
    expect(res.finalCorpus).toBe(5_020_000)
  })

  it('corpus shrinks over time when SWP exceeds investment growth', () => {
    // Use small DP so that SWP (30K/mo) exceeds monthly growth on corpus
    // DP=200K at 1%/mo = 2K gain vs 30K SWP → net -28K per month
    const shrinkBase = { ...base, downPayment: 200_000, monthlyRent: 60_000, estEmi: 30_000 }
    const res = buildRentInvestSchedule({ ...shrinkBase, tenureMonths: 6 })
    const first = res.schedule[0].corpus
    const last = res.schedule[res.schedule.length - 1].corpus
    expect(last).toBeLessThan(first)
  })
})

// ── depletion ────────────────────────────────────────────────────────────────

describe('buildRentInvestSchedule — corpus depletion', () => {
  // Tiny corpus, large SWP needed each month → depletes in month 1
  const depBase = {
    ...base,
    downPayment: 5_000,
    estEmi: 10_000,
    monthlyRent: 50_000,  // needs 40,000/month SWP
    tenureMonths: 12,
  }

  it('sets depleted = true', () => {
    const res = buildRentInvestSchedule(depBase)
    expect(res.depleted).toBe(true)
  })

  it('sets depletedAt = 1 (first month)', () => {
    const res = buildRentInvestSchedule(depBase)
    expect(res.depletedAt).toBe(1)
  })

  it('schedule stops at the depletion month', () => {
    const res = buildRentInvestSchedule(depBase)
    expect(res.schedule).toHaveLength(1)
  })

  it('finalCorpus is 0 after depletion', () => {
    const res = buildRentInvestSchedule(depBase)
    expect(res.finalCorpus).toBe(0)
  })
})

// ── annual rent increase ─────────────────────────────────────────────────────

describe('buildRentInvestSchedule — annual rent increase', () => {
  it('rent in month 13 is 10% higher than month 1 when annualRentIncrease=10', () => {
    const res = buildRentInvestSchedule({
      ...base, tenureMonths: 13, monthlyRent: 20_000, annualRentIncrease: 10,
    })
    const rentMonth1 = res.schedule[0].currentRent
    const rentMonth13 = res.schedule[12].currentRent
    expect(rentMonth1).toBe(20_000)
    expect(rentMonth13).toBe(22_000)
  })

  it('rent is unchanged in months 1–12 (increase only after full year)', () => {
    const res = buildRentInvestSchedule({
      ...base, tenureMonths: 12, monthlyRent: 20_000, annualRentIncrease: 50,
    })
    res.schedule.forEach(row => {
      expect(row.currentRent).toBe(20_000)
    })
  })
})

// ── additional lump sums ─────────────────────────────────────────────────────

describe('buildRentInvestSchedule — additional lump sums', () => {
  it('lump sum at month 1 appears in schedule and boosts corpus', () => {
    const withLs = buildRentInvestSchedule({
      ...base, tenureMonths: 1,
      additionalLumpsums: [{ month: 1, amount: 500_000, rate: 12 }],
    })
    const without = buildRentInvestSchedule({ ...base, tenureMonths: 1 })
    // corpus with lump sum must be higher
    expect(withLs.finalCorpus).toBeGreaterThan(without.finalCorpus)
    expect(withLs.schedule[0].lumpsumThisMonth).toBe(500_000)
  })

  it('totalLumpsumInvested sums all additional lumpsums', () => {
    const res = buildRentInvestSchedule({
      ...base, tenureMonths: 6,
      additionalLumpsums: [
        { month: 1, amount: 200_000, rate: 12 },
        { month: 3, amount: 300_000, rate: 9 },
      ],
    })
    expect(res.totalLumpsumInvested).toBe(500_000)
  })

  it('lump sum in a future month does not appear in earlier months', () => {
    const res = buildRentInvestSchedule({
      ...base, tenureMonths: 3,
      additionalLumpsums: [{ month: 3, amount: 100_000, rate: 12 }],
    })
    expect(res.schedule[0].lumpsumThisMonth).toBe(0)
    expect(res.schedule[1].lumpsumThisMonth).toBe(0)
    expect(res.schedule[2].lumpsumThisMonth).toBe(100_000)
  })

  it('different rates on lump sums are applied independently', () => {
    // Two separate runs: one with 7% lump sum, one with 12% — 12% must yield more
    const low = buildRentInvestSchedule({
      ...base, tenureMonths: 12,
      additionalLumpsums: [{ month: 1, amount: 500_000, rate: 7 }],
    })
    const high = buildRentInvestSchedule({
      ...base, tenureMonths: 12,
      additionalLumpsums: [{ month: 1, amount: 500_000, rate: 12 }],
    })
    expect(high.finalCorpus).toBeGreaterThan(low.finalCorpus)
  })
})

// ── down payment compounding ─────────────────────────────────────────────────

describe('buildRentInvestSchedule — down payment', () => {
  it('with no SIP and no rent increase, corpus = downPayment × (1.01)^n', () => {
    // Make EMI == rent so SIP = 0; pure lump sum compounding
    const res = buildRentInvestSchedule({
      ...base, estEmi: 30_000, monthlyRent: 30_000,
      tenureMonths: 12, downPayment: 1_000_000, investRate: 12,
    })
    const expected = Math.round(1_000_000 * Math.pow(1.01, 12))
    expect(res.finalCorpus).toBe(expected)
  })
})
