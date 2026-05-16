import { describe, it, expect } from 'vitest'
import { buildSipSchedule, buildLumpsumSchedule } from '../../utils/investing'

// ── buildSipSchedule ─────────────────────────────────────────────────────────

describe('buildSipSchedule', () => {
  it('60K/month @ 12% for 20yr → corpus ₹5,51,91,441 and interest ₹4,07,91,441', () => {
    const res = buildSipSchedule({ monthlyAmount: 60_000, annualRate: 12, tenureMonths: 240 })
    expect(res.finalCorpus).toBe(55_191_441)
    expect(res.interestEarned).toBe(40_791_441)
    expect(res.totalInvested).toBe(60_000 * 240)
  })

  it('produces a schedule with tenureMonths rows', () => {
    const res = buildSipSchedule({ monthlyAmount: 10_000, annualRate: 12, tenureMonths: 12 })
    expect(res.schedule).toHaveLength(12)
  })

  it('corpus grows monotonically', () => {
    const res = buildSipSchedule({ monthlyAmount: 10_000, annualRate: 12, tenureMonths: 24 })
    for (let i = 1; i < res.schedule.length; i++) {
      expect(res.schedule[i].corpus).toBeGreaterThan(res.schedule[i - 1].corpus)
    }
  })

  it('corpus after 1 month equals monthlyAmount × (1 + cagrMonthlyRate(12))', () => {
    // Annuity due: single payment at start of month, grows by 1 month
    const r = Math.pow(1.12, 1 / 12) - 1
    const expected = Math.round(10_000 * (1 + r))
    const res = buildSipSchedule({ monthlyAmount: 10_000, annualRate: 12, tenureMonths: 1 })
    expect(res.finalCorpus).toBe(expected)
  })

  it('finalCorpus matches last schedule row corpus', () => {
    const res = buildSipSchedule({ monthlyAmount: 5_000, annualRate: 9, tenureMonths: 36 })
    expect(res.finalCorpus).toBe(res.schedule[35].corpus)
  })

  it('interestEarned = finalCorpus − totalInvested', () => {
    const res = buildSipSchedule({ monthlyAmount: 20_000, annualRate: 7, tenureMonths: 60 })
    expect(res.interestEarned).toBeCloseTo(res.finalCorpus - res.totalInvested, 0)
  })
})

// ── buildLumpsumSchedule ─────────────────────────────────────────────────────

describe('buildLumpsumSchedule', () => {
  it('40L @ 12% for 20yr → corpus ₹3,85,85,172 and interest ₹3,45,85,172', () => {
    const res = buildLumpsumSchedule({ amount: 40_00_000, annualRate: 12, tenureMonths: 240 })
    expect(res.finalCorpus).toBe(38_585_172)
    expect(res.interestEarned).toBe(34_585_172)
    expect(res.totalInvested).toBe(40_00_000)
  })

  it('produces a schedule with tenureMonths rows', () => {
    const res = buildLumpsumSchedule({ amount: 1_00_000, annualRate: 12, tenureMonths: 12 })
    expect(res.schedule).toHaveLength(12)
  })

  it('corpus after 12 months equals amount × 1.12 (CAGR property)', () => {
    const res = buildLumpsumSchedule({ amount: 1_000_000, annualRate: 12, tenureMonths: 12 })
    expect(res.finalCorpus).toBe(Math.round(1_000_000 * 1.12))
  })

  it('totalInvested is always the initial amount in every row', () => {
    const res = buildLumpsumSchedule({ amount: 5_00_000, annualRate: 7, tenureMonths: 60 })
    res.schedule.forEach(row => expect(row.totalInvested).toBe(5_00_000))
  })

  it('corpus grows monotonically', () => {
    const res = buildLumpsumSchedule({ amount: 1_000_000, annualRate: 9, tenureMonths: 24 })
    for (let i = 1; i < res.schedule.length; i++) {
      expect(res.schedule[i].corpus).toBeGreaterThan(res.schedule[i - 1].corpus)
    }
  })

  it('finalCorpus matches last schedule row corpus', () => {
    const res = buildLumpsumSchedule({ amount: 2_000_000, annualRate: 9, tenureMonths: 36 })
    expect(res.finalCorpus).toBe(res.schedule[35].corpus)
  })
})
