import { useState, useMemo, useEffect } from 'react'
import Header from './components/Header'
import HomePage from './components/HomePage'
import PropertyDetails from './components/inputs/PropertyDetails'
import LoanDetails from './components/inputs/LoanDetails'
import RentSavings from './components/inputs/RentSavings'
import ExtraExpenses from './components/inputs/ExtraExpenses'
import Results from './components/results/Results'
import AmortizationPage from './components/amortization/AmortizationPage'
import RentInvestmentPage from './components/rentinvestment/RentInvestmentPage'
import { monthsBetween, xirr, computeLoanParams } from './utils/finance'
import { fmtINR, fmtDate } from './utils/format'

const DEFAULT_FORM = {
  propertyValue: '11000000',
  valuationMode: 'actual',
  currentValue: '18000000',
  annualAppreciation: '8',
  purchaseDate: '2019-05-01',
  valuationDate: '2026-05-01',
  loanAmount: '8900000',
  downPayment: '2100000',
  loanMode: 'emi',
  monthlyEmi: '75500',
  outstandingLoan: '7263000',
  loanRate: '8.5',
  loanTenure: '240',
  monthlyRent: '50000',
  annualRentIncrease: '10',
  movedInDate: '2022-04-01',
}

const DEFAULT_EVENTS = [
  { id: 1, label: 'Registration + Legal fees', date: '2021-05-01', amount: '800000' },
  { id: 2, label: 'Interiors', date: '2022-12-01', amount: '1300000' },
]

let nextId = 3

function hashToTab(hash) {
  if (hash === '#/house_investment') return 'housing'
  if (hash === '#/loan_amortization') return 'amortization'
  if (hash === '#/rent_investment') return 'rent-invest'
  return 'home'
}

function tabToHash(tab) {
  if (tab === 'housing') return '#/house_investment'
  if (tab === 'amortization') return '#/loan_amortization'
  if (tab === 'rent-invest') return '#/rent_investment'
  return '#/'
}

export default function App() {
  const [activeTab, setActiveTab] = useState(() => hashToTab(window.location.hash))

  useEffect(() => {
    function onHashChange() {
      setActiveTab(hashToTab(window.location.hash))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigate(tab) {
    window.location.hash = tabToHash(tab)
    setActiveTab(tab)
  }
  const [form, setForm] = useState(DEFAULT_FORM)
  const [events, setEvents] = useState(DEFAULT_EVENTS)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [loanEnabled, setLoanEnabled] = useState(false)
  const [rentEnabled, setRentEnabled] = useState(false)

  useEffect(() => {
    const pv = parseFloat(form.propertyValue) || 0
    const la = parseFloat(form.loanAmount) || 0
    if (pv > 0 && la > 0) {
      setField('downPayment', String(Math.max(0, pv - la)))
    }
  }, [form.propertyValue, form.loanAmount])

  const computedLoan = useMemo(() => computeLoanParams(form), [
    form.loanMode, form.loanAmount, form.loanRate, form.loanTenure,
    form.monthlyEmi, form.outstandingLoan, form.purchaseDate, form.valuationDate,
  ])

  const computedValuation = useMemo(() => {
    if (form.valuationMode !== 'appreciation') return null
    const purchaseDate = new Date(form.purchaseDate)
    const valuationDate = new Date(form.valuationDate)
    const months = monthsBetween(purchaseDate, valuationDate)
    if (months <= 0) return null
    const propertyValue = parseFloat(form.propertyValue) || 0
    const appreciation = parseFloat(form.annualAppreciation) || 0
    if (!propertyValue || appreciation <= 0) return null
    return { value: Math.round(propertyValue * Math.pow(1 + appreciation / 100, months / 12)) }
  }, [form.valuationMode, form.purchaseDate, form.valuationDate, form.propertyValue, form.annualAppreciation])

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addEvent() {
    setEvents(ev => [...ev, { id: nextId++, label: '', date: '', amount: '' }])
  }

  function removeEvent(id) {
    setEvents(ev => ev.filter(e => e.id !== id))
  }

  function updateEvent(id, key, value) {
    setEvents(ev => ev.map(e => e.id === id ? { ...e, [key]: value } : e))
  }

  function calculate() {
    setError('')
    try {
      const purchaseDate = new Date(form.purchaseDate)
      const valuationDate = new Date(form.valuationDate)
      const movedInDate = new Date(form.movedInDate)
      const monthlyRent = rentEnabled ? (parseFloat(form.monthlyRent) || 0) : 0
      const annualRentIncrease = rentEnabled ? (parseFloat(form.annualRentIncrease) || 0) : 0
      const propertyValue = parseFloat(form.propertyValue) || 0
      const totalMonths = monthsBetween(purchaseDate, valuationDate)
      if (totalMonths <= 0) throw new Error('Valuation date must be after purchase date.')
      const currentValue = form.valuationMode === 'appreciation'
        ? Math.round(propertyValue * Math.pow(1 + (parseFloat(form.annualAppreciation) || 0) / 100, totalMonths / 12))
        : parseFloat(form.currentValue) || 0

      // Resolve loan figures based on toggle
      let downPayment, monthlyEmi, outstandingLoan, loanAmount
      if (!loanEnabled) {
        downPayment = propertyValue
        monthlyEmi = 0
        outstandingLoan = 0
        loanAmount = 0
      } else {
        downPayment = parseFloat(form.downPayment) || 0
        loanAmount = parseFloat(form.loanAmount) || 0
        if (form.loanMode === 'roi') {
          const rAnnual = parseFloat(form.loanRate) || 0
          const n = parseInt(form.loanTenure) || 0
          if (rAnnual <= 0 || n <= 0) throw new Error('Please enter a valid interest rate and tenure.')
          const r = rAnnual / 1200
          const fn = Math.pow(1 + r, n)
          monthlyEmi = loanAmount * r * fn / (fn - 1)
          const fm = Math.pow(1 + r, totalMonths)
          outstandingLoan = Math.max(0, loanAmount * fm - monthlyEmi * (fm - 1) / r)
        } else {
          monthlyEmi = parseFloat(form.monthlyEmi) || 0
          outstandingLoan = parseFloat(form.outstandingLoan) || 0
        }
        if (monthlyEmi <= 0) throw new Error('Please fill in all required loan fields.')
      }

      const emiStartDate = new Date(purchaseDate)
      emiStartDate.setMonth(emiStartDate.getMonth() + 1)
      const netFromSale = currentValue - outstandingLoan

      const validEvents = events
        .filter(e => e.date && parseFloat(e.amount) > 0)
        .map(e => ({ label: e.label || 'Expense', date: new Date(e.date), amount: parseFloat(e.amount) }))

      // Build XIRR cash flows
      const cfVals = [-downPayment], cfDates = [new Date(purchaseDate)]
      let totalEmisPaid = 0, totalRentSaved = 0

      if (loanEnabled && monthlyEmi > 0) {
        for (let m = 0; m < totalMonths; m++) {
          const d = new Date(emiStartDate)
          d.setMonth(d.getMonth() + m)
          if (d >= valuationDate) break
          if (rentEnabled && d >= movedInDate) {
            const yearsElapsed = Math.floor(monthsBetween(movedInDate, d) / 12)
            const effectiveRent = monthlyRent * Math.pow(1 + annualRentIncrease / 100, yearsElapsed)
            cfVals.push(-(monthlyEmi - effectiveRent))
            totalRentSaved += effectiveRent
          } else {
            cfVals.push(-monthlyEmi)
          }
          cfDates.push(new Date(d))
          totalEmisPaid += monthlyEmi
        }
      }
      const emiMonthsCount = cfVals.length - 1
      validEvents.forEach(e => { cfVals.push(-e.amount); cfDates.push(new Date(e.date)) })
      cfVals.push(netFromSale); cfDates.push(new Date(valuationDate))

      const rawXirr = xirr(cfVals, cfDates)
      const xirrPct = (rawXirr * 100).toFixed(2)
      const totalExtraCost = validEvents.reduce((s, e) => s + e.amount, 0)
      const totalCashOut = downPayment + totalEmisPaid + totalExtraCost
      const netEmiOut = totalEmisPaid - totalRentSaved
      const effectiveCostOut = downPayment + netEmiOut + totalExtraCost
      const holdYears = (totalMonths / 12).toFixed(1)
      const simpleCagr = (Math.pow(currentValue / propertyValue, 1 / (totalMonths / 12)) - 1) * 100
      const rentMonthsCount = rentEnabled ? monthsBetween(movedInDate, valuationDate) : 0
      const principalRepaid = loanEnabled ? loanAmount - outstandingLoan : 0
      const totalInterestPaid = loanEnabled ? totalEmisPaid - principalRepaid : 0

      // Chart data
      const chartLabels = [], cumOutflow = [], propValue = []
      let runningOut = downPayment
      for (let m = 0; m <= totalMonths; m++) {
        const d = new Date(purchaseDate)
        d.setMonth(d.getMonth() + m)
        if (m > 0 && loanEnabled && monthlyEmi > 0) {
          const emiD = new Date(emiStartDate)
          emiD.setMonth(emiD.getMonth() + m - 1)
          if (emiD < valuationDate) {
            if (rentEnabled && emiD >= movedInDate) {
              const yearsElapsed = Math.floor(monthsBetween(movedInDate, emiD) / 12)
              const effectiveRent = monthlyRent * Math.pow(1 + annualRentIncrease / 100, yearsElapsed)
              runningOut += monthlyEmi - effectiveRent
            } else {
              runningOut += monthlyEmi
            }
          }
          validEvents.forEach(e => {
            if (Math.abs(monthsBetween(purchaseDate, e.date) - m) < 1) runningOut += e.amount
          })
        }
        if (m % 3 === 0 || m === totalMonths) {
          chartLabels.push(fmtDate(d))
          cumOutflow.push(Math.round(runningOut))
          propValue.push(Math.round(propertyValue + (currentValue - propertyValue) * m / totalMonths))
        }
      }

      // Ledger
      const ledger = [
        { date: fmtDate(purchaseDate), desc: loanEnabled ? 'Down payment' : 'Full purchase (cash)', type: 'out', amount: downPayment },
        ...validEvents.map(e => ({ date: fmtDate(e.date), desc: e.label, type: 'out', amount: e.amount })),
        ...(loanEnabled && emiMonthsCount > 0 ? [
          { date: `${fmtDate(emiStartDate)} – ${fmtDate(valuationDate)}`, desc: `EMIs (${emiMonthsCount} months × ${fmtINR(monthlyEmi)})`, type: 'out', amount: totalEmisPaid },
        ] : []),
        ...(rentEnabled && totalRentSaved > 0 ? [
          { date: `${fmtDate(movedInDate)} – ${fmtDate(valuationDate)}`, desc: `Rent saved (${rentMonthsCount} months, base ${fmtINR(monthlyRent)}${annualRentIncrease > 0 ? ` +${annualRentIncrease}%/yr` : ''}) — netted`, type: 'in', amount: totalRentSaved },
        ] : []),
        { date: fmtDate(valuationDate), desc: 'Sale proceeds', type: 'in', amount: currentValue },
        ...(loanEnabled && outstandingLoan > 0 ? [
          { date: fmtDate(valuationDate), desc: 'Loan balance repaid', type: 'out', amount: outstandingLoan },
        ] : []),
        { date: fmtDate(valuationDate), desc: 'Net in hand', type: 'net', amount: netFromSale },
      ]

      const rentDesc = rentEnabled
        ? `₹${(totalRentSaved / 100000).toFixed(1)}L rent savings netted in${annualRentIncrease > 0 ? ` (rent growing ${annualRentIncrease}%/yr)` : ''}`
        : 'rent savings excluded'

      setResults({
        xirrPct, netFromSale, totalCashOut, effectiveCostOut, simpleCagr,
        totalEmisPaid, totalRentSaved, outstandingLoan, emiMonthsCount, rentMonthsCount,
        monthlyEmi, monthlyRent, annualRentIncrease, loanAmount, principalRepaid, totalInterestPaid,
        holdYears, downPayment, extraEvents: validEvents, currentValue, propertyValue,
        chartData: { labels: chartLabels, cumOutflow, propValue },
        ledger,
        loanEnabled, rentEnabled,
        verdictSub: `True annualised return on your investment over ${holdYears} years${loanEnabled && emiMonthsCount > 0 ? ', with every EMI dated month-by-month' : ''} and ${rentDesc}.`,
        purchaseDate, valuationDate, emiStartDate, movedInDate,
      })

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)

    } catch (e) {
      setError(e.message || 'Something went wrong. Please check your inputs.')
    }
  }

  return (
    <div className="page">
      <Header onHome={activeTab !== 'home' ? () => navigate('home') : undefined} />

      {activeTab === 'home' && <HomePage onNavigate={navigate} />}

      {activeTab !== 'home' && (
        <nav className="tab-nav">
          <button
            className={`tab-btn${activeTab === 'housing' ? ' active' : ''}`}
            onClick={() => navigate('housing')}
          >
            House Investment
          </button>
          <button
            className={`tab-btn${activeTab === 'amortization' ? ' active' : ''}`}
            onClick={() => navigate('amortization')}
          >
            Loan Amortization
          </button>
          <button
            className={`tab-btn${activeTab === 'rent-invest' ? ' active' : ''}`}
            onClick={() => navigate('rent-invest')}
          >
            Rent &amp; Invest
          </button>
        </nav>
      )}

      {activeTab === 'housing' && (
        <>
          <PropertyDetails form={form} onChange={setField} computedValuation={computedValuation} />
          <LoanDetails form={form} onChange={setField} computedLoan={computedLoan} enabled={loanEnabled} onToggle={() => setLoanEnabled(v => !v)} />
          <RentSavings form={form} onChange={setField} enabled={rentEnabled} onToggle={() => setRentEnabled(v => !v)} />
          <ExtraExpenses events={events} onAdd={addEvent} onRemove={removeEvent} onChange={updateEvent} />
          <button className="calc-btn" onClick={calculate}>Calculate Returns</button>
          {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
          {results && <div id="results-section"><Results results={results} /></div>}
        </>
      )}

      {activeTab === 'amortization' && <AmortizationPage />}
      {activeTab === 'rent-invest' && <RentInvestmentPage />}
    </div>
  )
}
