import { cagrMonthlyRate, growLumpsum } from './finance'

/**
 * SIP maturity using annuity-due formula (payment at start of each period):
 *   FV = P × [(1+r)^n − 1] / r × (1+r)
 * where r = cagrMonthlyRate(annualRate), consistent with growLumpsum.
 */
export function buildSipSchedule({ monthlyAmount, annualRate, tenureMonths }) {
  const r = cagrMonthlyRate(annualRate)
  const schedule = []

  for (let month = 1; month <= tenureMonths; month++) {
    const corpus = monthlyAmount * (Math.pow(1 + r, month) - 1) / r * (1 + r)
    const totalInvested = monthlyAmount * month
    schedule.push({
      month,
      corpus: Math.round(corpus),
      totalInvested: Math.round(totalInvested),
      interest: Math.round(corpus - totalInvested),
    })
  }

  const last = schedule[schedule.length - 1] ?? { corpus: 0, totalInvested: 0, interest: 0 }
  return {
    schedule,
    finalCorpus: last.corpus,
    totalInvested: last.totalInvested,
    interestEarned: last.interest,
  }
}

export function buildLumpsumSchedule({ amount, annualRate, tenureMonths }) {
  const schedule = []

  for (let month = 1; month <= tenureMonths; month++) {
    const corpus = growLumpsum(amount, annualRate, month)
    schedule.push({
      month,
      corpus: Math.round(corpus),
      totalInvested: amount,
      interest: Math.round(corpus - amount),
    })
  }

  const last = schedule[schedule.length - 1] ?? { corpus: 0, interest: 0 }
  return {
    schedule,
    finalCorpus: last.corpus,
    totalInvested: amount,
    interestEarned: last.interest,
  }
}
