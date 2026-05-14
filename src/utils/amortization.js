export function calcEmi(principal, monthlyRate, months) {
  if (months <= 0 || principal <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const fn = Math.pow(1 + monthlyRate, months)
  return principal * monthlyRate * fn / (fn - 1)
}

export function buildSchedule({
  loanAmount,
  annualRate,
  tenureMonths,
  startDate,
  partPayments = [],
  rateChanges = [],
  partPaymentMode = 'reduce-tenure',
}) {
  const schedule = []
  let balance = loanAmount
  let currentAnnualRate = annualRate
  let currentRate = annualRate / 1200
  let currentEmi = calcEmi(balance, currentRate, tenureMonths)
  const originalEmi = currentEmi

  // Build month-keyed lookup maps
  const ppByMonth = {}
  partPayments.forEach(pp => {
    const mo = parseInt(pp.month) || 0
    const amt = parseFloat(pp.amount) || 0
    if (mo > 0 && amt !== 0) ppByMonth[mo] = (ppByMonth[mo] || 0) + amt
  })

  const rcByMonth = {}
  rateChanges.forEach(rc => {
    const mo = parseInt(rc.fromMonth) || 0
    const rate = parseFloat(rc.newRate) || 0
    if (mo > 0 && rate > 0) rcByMonth[mo] = rate
  })

  let totalInterest = 0
  let totalPrincipal = 0
  let totalPartPayments = 0
  let hasPartPayments = false
  let hasRateChanges = false

  // Safety limit: max 2× tenure to handle top-ups extending the loan
  const maxMonths = tenureMonths * 2

  for (let m = 1; m <= maxMonths && balance > 0.5; m++) {
    // Apply rate change at this month
    if (rcByMonth[m] !== undefined) {
      currentAnnualRate = rcByMonth[m]
      currentRate = currentAnnualRate / 1200
      const remaining = Math.max(1, tenureMonths - m + 1)
      currentEmi = calcEmi(balance, currentRate, remaining)
      hasRateChanges = true
    }

    const interest = balance * currentRate
    // Last payment may be smaller than full EMI
    const emiForMonth = Math.min(currentEmi, balance + interest)
    const actualPrincipal = Math.min(Math.max(0, emiForMonth - interest), balance)

    const rawPP = ppByMonth[m] || 0
    // Clamp prepayments so balance can't go below zero
    const pp = rawPP > 0
      ? Math.min(rawPP, balance - actualPrincipal)
      : rawPP  // top-ups (negative) applied as-is

    const closingBalance = Math.max(0, balance - actualPrincipal - pp)

    let date = null
    if (startDate) {
      date = new Date(startDate)
      date.setMonth(date.getMonth() + m - 1)
    }

    schedule.push({
      month: m,
      date,
      openingBalance: Math.round(balance),
      emi: Math.round(emiForMonth),
      interest: Math.round(interest),
      principal: Math.round(actualPrincipal),
      partPayment: Math.round(pp),
      closingBalance: Math.round(closingBalance),
      annualRate: currentAnnualRate,
    })

    totalInterest += interest
    totalPrincipal += actualPrincipal
    if (rawPP !== 0) {
      totalPartPayments += pp
      hasPartPayments = true
    }

    balance = closingBalance
    if (balance < 0.5) break

    // Recalculate EMI after part payment based on mode
    if (rawPP !== 0) {
      if (rawPP < 0 || partPaymentMode === 'reduce-emi') {
        // Top-up always recalculates; reduce-emi recalculates for prepayments too
        const remaining = Math.max(1, tenureMonths - m)
        currentEmi = calcEmi(balance, currentRate, remaining)
      }
      // reduce-tenure: EMI stays, loan ends sooner (handled naturally)
    }
  }

  const completedAt = schedule.length

  return {
    schedule,
    originalEmi: Math.round(originalEmi),
    totalInterest: Math.round(totalInterest),
    totalPrincipal: Math.round(totalPrincipal),
    totalPartPayments: Math.round(totalPartPayments),
    completedAt,
    tenureSaved: Math.max(0, tenureMonths - completedAt),
    hasPartPayments,
    hasRateChanges,
    initialRate: annualRate,
  }
}
