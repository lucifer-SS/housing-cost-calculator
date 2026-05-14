export function monthsBetween(d1, d2) {
  return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
}

export function xirr(cfs, dates, guess = 0.1) {
  const MAXITER = 3000, TOL = 1e-9
  let rate = guess
  for (let i = 0; i < MAXITER; i++) {
    const t0 = dates[0].getTime()
    let f = 0, df = 0
    for (let j = 0; j < cfs.length; j++) {
      const t = (dates[j].getTime() - t0) / (365.25 * 24 * 3600 * 1000)
      const pv = cfs[j] / Math.pow(1 + rate, t)
      f += pv
      df += -t * cfs[j] / Math.pow(1 + rate, t + 1)
    }
    const nr = rate - f / df
    if (Math.abs(nr - rate) < TOL) return nr
    rate = nr
  }
  return rate
}

export function solveRate(P, E, O, m, guess = 0.007) {
  const MAXITER = 2000, TOL = 1e-10
  let r = guess
  for (let i = 0; i < MAXITER; i++) {
    const g = Math.pow(1 + r, m)
    const f = P * g - E * (g - 1) / r - O
    const df = m * Math.pow(1 + r, m - 1) * (P - E / r) + E * (g - 1) / (r * r)
    if (!df) break
    const rNew = r - f / df
    if (Math.abs(rNew - r) < TOL) return Math.max(0, rNew)
    r = rNew > 0 ? rNew : guess / 2
  }
  return null
}

export function monthToDate(startDate, month) {
  if (!startDate) return null
  const d = new Date(startDate)
  d.setMonth(d.getMonth() + month - 1)
  return d
}

export function computeLoanParams(form) {
  const purchaseDate = new Date(form.purchaseDate)
  const valuationDate = new Date(form.valuationDate)
  const P = parseFloat(form.loanAmount) || 0
  const m = monthsBetween(purchaseDate, valuationDate)
  if (P <= 0 || m <= 0) return null

  if (form.loanMode === 'roi') {
    const rAnnual = parseFloat(form.loanRate) || 0
    const n = parseInt(form.loanTenure) || 0
    if (rAnnual <= 0 || n <= 0) return null
    const r = rAnnual / 1200
    const fn = Math.pow(1 + r, n)
    const emi = P * r * fn / (fn - 1)
    const fm = Math.pow(1 + r, m)
    const os = Math.max(0, P * fm - emi * (fm - 1) / r)
    return { mode: 'roi', emi, os, label1: 'Computed monthly EMI', label2: `Computed outstanding (after ${m}m)` }
  } else {
    const E = parseFloat(form.monthlyEmi) || 0
    const O = parseFloat(form.outstandingLoan) || 0
    if (E <= 0) return null
    if (E <= P * 0.007) return { error: 'EMI too low relative to loan — check inputs.' }
    const r = solveRate(P, E, O, m)
    if (r === null || r <= 0) return { error: 'Could not solve for interest rate — check your inputs.' }
    const rAnnual = r * 1200
    const nTotal = Math.log(E / (E - P * r)) / Math.log(1 + r)
    return { mode: 'emi', rAnnual, nTotal }
  }
}
