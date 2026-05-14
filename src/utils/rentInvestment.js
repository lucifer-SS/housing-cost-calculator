export const INVEST_OPTION_RATES = { 'fd-7': 7, 'debt-9': 9, 'equity-12': 12 }

export function getInvestRate(optionKey) {
  return INVEST_OPTION_RATES[optionKey] ?? 12
}

/**
 * Simulates renting while investing the down payment as lumpsum and the
 * (EMI - rent) delta as monthly SIP. Additional lumpsum investments can be
 * added at any month, each with their own annual return rate.
 *
 * When rent > EMI, the surplus rent is funded by SWP from the corpus. If the
 * corpus is fully depleted, simulation stops and `depleted: true` is returned.
 *
 * Multiple investment pools are tracked (main + each additional lumpsum) so
 * that different annual rates are applied correctly. SWP is withdrawn
 * proportionally across all pools.
 */
export function buildRentInvestSchedule({
  downPayment,
  estEmi,
  tenureMonths,
  monthlyRent,
  annualRentIncrease,
  startDate,           // Date or null
  investRate,          // annual %, e.g. 12
  additionalLumpsums,  // [{ month (1-indexed), amount, rate (annual %) }]
}) {
  const mainRate = investRate / 1200
  let mainPool = downPayment

  // Map: month → pools to add (each additional lumpsum gets its own growth pool)
  const lsByMonth = {}
  additionalLumpsums.forEach(ls => {
    if (!lsByMonth[ls.month]) lsByMonth[ls.month] = []
    lsByMonth[ls.month].push({ rate: ls.rate / 1200, value: ls.amount })
  })
  const activeLsPools = []  // growing pools from additional lumpsums

  const schedule = []
  let totalRentPaid = 0
  let totalSipIn = 0
  let totalSwpOut = 0
  let totalLumpsumInvested = additionalLumpsums.reduce((s, l) => s + l.amount, 0)
  let depleted = false
  let depletedAt = null

  for (let month = 1; month <= tenureMonths; month++) {
    const openingCorpus = mainPool + activeLsPools.reduce((s, p) => s + p.value, 0)

    // Compound all pools
    mainPool *= (1 + mainRate)
    activeLsPools.forEach(p => { p.value *= (1 + p.rate) })

    // Activate new lumpsum pools for this month
    let lumpsumThisMonth = 0
    if (lsByMonth[month]) {
      lsByMonth[month].forEach(p => {
        activeLsPools.push({ rate: p.rate, value: p.value })
        lumpsumThisMonth += p.value
      })
    }

    // Current rent (compounded annually from month 0)
    const yearsElapsed = Math.floor((month - 1) / 12)
    const currentRent = monthlyRent * Math.pow(1 + annualRentIncrease / 100, yearsElapsed)
    totalRentPaid += currentRent

    const net = estEmi - currentRent
    let sipAmount = 0
    let swpAmount = 0

    if (net >= 0) {
      mainPool += net
      sipAmount = net
      totalSipIn += net
    } else {
      swpAmount = -net
      const totalCorpus = mainPool + activeLsPools.reduce((s, p) => s + p.value, 0)
      if (totalCorpus <= swpAmount) {
        // Corpus depleted — record what's left and stop
        depleted = true
        depletedAt = month
        const date = startDate ? new Date(startDate.getTime()) : null
        if (date) date.setMonth(date.getMonth() + month - 1)
        schedule.push({
          month, date,
          currentRent: Math.round(currentRent),
          sipAmount: 0,
          swpAmount: Math.round(totalCorpus),
          lumpsumThisMonth: Math.round(lumpsumThisMonth),
          openingCorpus: Math.round(openingCorpus),
          corpus: 0,
        })
        mainPool = 0
        activeLsPools.forEach(p => { p.value = 0 })
        break
      }
      // Proportional withdrawal across all pools
      const ratio = swpAmount / totalCorpus
      mainPool -= mainPool * ratio
      activeLsPools.forEach(p => { p.value -= p.value * ratio })
      totalSwpOut += swpAmount
    }

    const finalCorpus = mainPool + activeLsPools.reduce((s, p) => s + p.value, 0)
    const date = startDate ? new Date(startDate.getTime()) : null
    if (date) date.setMonth(date.getMonth() + month - 1)

    schedule.push({
      month, date,
      currentRent: Math.round(currentRent),
      sipAmount: Math.round(sipAmount),
      swpAmount: Math.round(swpAmount),
      lumpsumThisMonth: Math.round(lumpsumThisMonth),
      openingCorpus: Math.round(openingCorpus),
      corpus: Math.round(finalCorpus),
    })
  }

  const finalCorpus = mainPool + activeLsPools.reduce((s, p) => s + p.value, 0)

  return {
    schedule,
    finalCorpus: Math.round(finalCorpus),
    totalRentPaid: Math.round(totalRentPaid),
    totalSipIn: Math.round(totalSipIn),
    totalSwpOut: Math.round(totalSwpOut),
    totalLumpsumInvested: Math.round(totalLumpsumInvested),
    // Money that entered the corpus (down payment + SIPs + extra lumpsums)
    totalInvested: Math.round(downPayment + totalSipIn + totalLumpsumInvested),
    // All money that left the user's pocket (rent + down payment + extra lumpsums)
    totalMoneyOut: Math.round(downPayment + totalRentPaid + totalLumpsumInvested),
    depleted,
    depletedAt,
  }
}
