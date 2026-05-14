import { useState, useMemo } from 'react'
import CurrencyInput from '../shared/CurrencyInput'
import MetricCard from '../shared/MetricCard'
import TenureInput from '../shared/TenureInput'
import AmortizationChart from './AmortizationChart'
import { buildSchedule, calcEmi } from '../../utils/amortization'
import { fmtINR, fmtCr, fmtDate } from '../../utils/format'
import { monthsBetween, monthToDate } from '../../utils/finance'
import { AMORT_INVEST_OPTIONS, AMORT_INVEST_RATES, AMORT_TAX_RATES } from '../../constants/investmentOptions'

const TODAY = new Date().toISOString().slice(0, 10)

const DEFAULT_FORM = {
  loanAmount: '5000000',
  annualRate: '10.5',
  tenure: '20',
  tenureUnit: 'years',
  startDate: TODAY,
  partPaymentMode: 'reduce-tenure',
}

let nextPPId = 1
let nextRCId = 1

export default function AmortizationPage() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [partPayments, setPartPayments] = useState([])
  const [rateChanges, setRateChanges] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [tableView, setTableView] = useState('yearly')

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setResults(null)
  }

  const tenureMonths = useMemo(() => {
    const t = parseInt(form.tenure) || 0
    return form.tenureUnit === 'years' ? t * 12 : t
  }, [form.tenure, form.tenureUnit])

  const liveComputed = useMemo(() => {
    const principal = parseFloat(form.loanAmount) || 0
    const rate = parseFloat(form.annualRate) || 0
    if (principal <= 0 || rate <= 0 || tenureMonths <= 0) return null
    const emi = calcEmi(principal, rate / 1200, tenureMonths)
    return { emi, totalInterest: emi * tenureMonths - principal, totalPayment: emi * tenureMonths }
  }, [form.loanAmount, form.annualRate, tenureMonths])

  // Part payment handlers
  function addPartPayment() {
    setPartPayments(pp => [...pp, { id: nextPPId++, date: '', amount: '', type: 'prepayment', note: '' }])
  }
  function removePartPayment(id) { setPartPayments(pp => pp.filter(p => p.id !== id)) }
  function updatePartPayment(id, key, value) {
    setPartPayments(pp => pp.map(p => p.id === id ? { ...p, [key]: value } : p))
  }

  // Rate change handlers
  function addRateChange() {
    setRateChanges(rc => [...rc, { id: nextRCId++, fromDate: '', newRate: '' }])
  }
  function removeRateChange(id) { setRateChanges(rc => rc.filter(r => r.id !== id)) }
  function updateRateChange(id, key, value) {
    setRateChanges(rc => rc.map(r => r.id === id ? { ...r, [key]: value } : r))
  }

  const isInvest = type => type in AMORT_INVEST_RATES

  function generate() {
    setError('')
    try {
      const principal = parseFloat(form.loanAmount) || 0
      const rate = parseFloat(form.annualRate) || 0
      if (principal <= 0) throw new Error('Please enter a valid loan amount.')
      if (rate <= 0) throw new Error('Please enter a valid interest rate.')
      if (tenureMonths <= 0) throw new Error('Please enter a valid tenure.')

      const startDate = form.startDate ? new Date(form.startDate) : null

      const hasDateEntries =
        partPayments.some(p => p.date && p.amount) ||
        rateChanges.some(r => r.fromDate && r.newRate)
      if (hasDateEntries && !startDate) {
        throw new Error('Please set an EMI Start Date to use date-based rate changes and part payments.')
      }

      const ppInput = partPayments
        .filter(p => p.date && p.amount && !isInvest(p.type))
        .map(p => {
          const month = monthsBetween(startDate, new Date(p.date)) + 1
          if (month < 1) throw new Error('A part payment date is before the EMI start date.')
          return {
            month,
            amount: p.type === 'topup'
              ? -(parseFloat(p.amount) || 0)
              : (parseFloat(p.amount) || 0),
          }
        })

      const rcInput = rateChanges
        .filter(r => r.fromDate && r.newRate)
        .map(r => {
          const fromMonth = monthsBetween(startDate, new Date(r.fromDate)) + 1
          if (fromMonth < 1) throw new Error('A rate change date is before the EMI start date.')
          return { fromMonth, newRate: parseFloat(r.newRate) }
        })

      const res = buildSchedule({
        loanAmount: principal,
        annualRate: rate,
        tenureMonths,
        startDate,
        partPayments: ppInput,
        rateChanges: rcInput,
        partPaymentMode: form.partPaymentMode,
      })

      const investments = partPayments
        .filter(p => isInvest(p.type) && p.date && p.amount)
        .map(p => {
          const amount = parseFloat(p.amount) || 0
          const investIdx = monthsBetween(startDate, new Date(p.date)) + 1
          if (investIdx < 1) throw new Error('An investment date is before the EMI start date.')
          if (investIdx >= res.completedAt) throw new Error('An investment date must be before the loan closes.')
          const durationMonths = res.completedAt - investIdx
          const investRate = AMORT_INVEST_RATES[p.type]
          const maturityValue = amount * Math.pow(1 + investRate / 100, durationMonths / 12)
          const profit = maturityValue - amount
          const tax = profit * AMORT_TAX_RATES[p.type]
          return { amount, maturityValue, profit, tax }
        })

      const totalInvestedAmount = investments.reduce((s, inv) => s + inv.amount, 0)
      const totalInvestmentProfit = investments.reduce((s, inv) => s + inv.profit, 0)
      const totalTax = investments.reduce((s, inv) => s + inv.tax, 0)
      const netInterest = res.totalInterest - totalInvestmentProfit + totalTax
      const effectiveEmi = (netInterest + principal) / tenureMonths
      let er = (2 * netInterest) / (principal * (tenureMonths + 1))
      for (let i = 0; i < 300; i++) {
        const fn = Math.pow(1 + er, tenureMonths)
        const f = principal * er * fn - effectiveEmi * (fn - 1)
        const df = principal * (fn + er * tenureMonths * Math.pow(1 + er, tenureMonths - 1)) - effectiveEmi * tenureMonths * Math.pow(1 + er, tenureMonths - 1)
        if (!df) break
        const rn = er - f / df
        if (Math.abs(rn - er) < 1e-10) { er = rn; break }
        er = rn > 0 ? rn : er / 2
      }
      const effectiveRate = er * 12 * 100

      setResults({ ...res, tenureMonths, startDate, loanAmount: principal, annualRate: rate, effectiveRate, totalInvestedAmount, totalInvestmentProfit, totalTax, netInterest, hasInvestments: investments.length > 0 })

      setTimeout(() => {
        document.getElementById('amort-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    }
  }

  const yearlySchedule = useMemo(() => {
    if (!results?.schedule?.length) return []
    const years = []
    let y = 1
    while (true) {
      const start = (y - 1) * 12 + 1
      const rows = results.schedule.filter(r => r.month >= start && r.month < start + 12)
      if (!rows.length) break
      years.push({
        year: y,
        startDate: rows[0].date,
        endDate: rows[rows.length - 1].date,
        openingBalance: rows[0].openingBalance,
        totalEmi: rows.reduce((s, r) => s + r.emi, 0),
        totalInterest: rows.reduce((s, r) => s + r.interest, 0),
        totalPrincipal: rows.reduce((s, r) => s + r.principal, 0),
        totalPartPayment: rows.reduce((s, r) => s + r.partPayment, 0),
        closingBalance: rows[rows.length - 1].closingBalance,
      })
      y++
    }
    return years
  }, [results])

  const hasStartDate = !!form.startDate

  const interestSaved = useMemo(() => {
    if (!results || !liveComputed) return 0
    const noPrep = liveComputed.emi * results.tenureMonths
    const actual = results.totalInterest + results.totalPrincipal + Math.max(0, results.totalPartPayments)
    return Math.max(0, noPrep - actual)
  }, [results, liveComputed])

  return (
    <div>
      {/* ── Loan Details ── */}
      <div className="input-section">
        <div className="section-label">Loan Details</div>

        <div className="grid-3" style={{ marginBottom: '16px' }}>
          <div className="field">
            <label>Loan Amount</label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <CurrencyInput
                value={form.loanAmount}
                onChange={v => setField('loanAmount', v)}
                placeholder="50,00,000"
              />
            </div>
          </div>
          <div className="field">
            <label>Annual Interest Rate</label>
            <div className="input-wrap has-suffix">
              <input
                type="number"
                value={form.annualRate}
                onChange={e => setField('annualRate', e.target.value)}
                placeholder="10.5"
                step="0.25"
                min="0"
              />
              <span className="suffix">% p.a.</span>
            </div>
          </div>
          <div className="field">
            <label>Tenure</label>
            <TenureInput
              value={form.tenure}
              unit={form.tenureUnit}
              onChange={v => setField('tenure', v)}
              onUnitChange={u => setField('tenureUnit', u)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>
              EMI Start Date
              <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px', marginLeft: '6px' }}>
                optional — for date labels
              </span>
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setField('startDate', e.target.value)}
            />
          </div>
          <div className="field">
            <label>On Prepayment</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                className={`mode-btn${form.partPaymentMode === 'reduce-tenure' ? ' active' : ''}`}
                onClick={() => setField('partPaymentMode', 'reduce-tenure')}
              >Reduce Tenure</button>
              <button
                className={`mode-btn${form.partPaymentMode === 'reduce-emi' ? ' active' : ''}`}
                onClick={() => setField('partPaymentMode', 'reduce-emi')}
              >Reduce EMI</button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Rate Changes ── */}
      <div className="input-section">
        <div className="section-label">
          Rate Changes
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            — floating rate adjustments
          </span>
        </div>
        {rateChanges.length > 0 && (
          <div className="events-list" style={{ marginBottom: '12px' }}>
            {rateChanges.map(rc => (
              <div key={rc.id} className="event-row">
                <div className="field">
                  <label>Effective From</label>
                  <div>
                    <input
                      type="date"
                      value={rc.fromDate}
                      onChange={e => updateRateChange(rc.id, 'fromDate', e.target.value)}
                    />
                    {rc.fromDate && form.startDate && monthsBetween(new Date(form.startDate), new Date(rc.fromDate)) + 1 >= 1 && (
                      <span style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                        EMI #{monthsBetween(new Date(form.startDate), new Date(rc.fromDate)) + 1}
                      </span>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label>New Rate</label>
                  <div className="input-wrap has-suffix">
                    <input
                      type="number"
                      value={rc.newRate}
                      onChange={e => updateRateChange(rc.id, 'newRate', e.target.value)}
                      placeholder="9.0"
                      step="0.25"
                      min="0"
                    />
                    <span className="suffix">% p.a.</span>
                  </div>
                </div>
                <button className="remove-btn" onClick={() => removeRateChange(rc.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
        <button className="add-btn" onClick={addRateChange}>+ Add Rate Change</button>
      </div>

      {/* ── Investments & Top-ups ── */}
      <div className="input-section">
        <div className="section-label">Investments &amp; Top-ups</div>
        {partPayments.length > 0 && (
          <div className="events-list" style={{ marginBottom: '12px' }}>
            {partPayments.map(pp => {
              const invest = pp.type.startsWith('invest-')
              return (
                <div key={pp.id} className="event-row event-row--pp">
                  <div className="field">
                    <label>{invest ? 'Investment Date' : 'Date'}</label>
                    <input
                      type="date"
                      value={pp.date}
                      onChange={e => updatePartPayment(pp.id, 'date', e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Amount</label>
                    <div className="input-wrap has-prefix">
                      <span className="prefix">₹</span>
                      <CurrencyInput
                        value={pp.amount}
                        onChange={v => updatePartPayment(pp.id, 'amount', v)}
                        placeholder="1,00,000"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label>Type</label>
                    <select
                      className="amort-select"
                      value={pp.type}
                      onChange={e => updatePartPayment(pp.id, 'type', e.target.value)}
                    >
                      <option value="prepayment">Prepayment ↓</option>
                      <option value="topup">Top-up ↑</option>
                      <optgroup label="Invest instead">
                        {AMORT_INVEST_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="field">
                    <label>Note (optional)</label>
                    <input
                      type="text"
                      value={pp.note}
                      onChange={e => updatePartPayment(pp.id, 'note', e.target.value)}
                      placeholder="e.g. Annual bonus"
                      className="amort-text-input"
                    />
                  </div>
                  <button className="remove-btn" onClick={() => removePartPayment(pp.id)} title="Remove">×</button>
                </div>
              )
            })}
          </div>
        )}
        <button className="add-btn" onClick={addPartPayment}>+ Add Investment / Top-up</button>
      </div>

      <button className="calc-btn" onClick={generate}>Generate Amortization Schedule</button>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {results && (
        <div id="amort-results">
          <hr className="results-divider" />

          {/* Summary metrics — row 1 */}
          <div className="metric-grid fade-up">
            <MetricCard
              label="Monthly EMI"
              value={fmtINR(results.originalEmi)}
              sub={`at ${results.annualRate}% p.a.`}
              cls="accent"
              highlight
            />
            <MetricCard
              label="Total Interest"
              value={fmtCr(results.totalInterest)}
              sub={`${((results.totalInterest / results.loanAmount) * 100).toFixed(0)}% of principal`}
              cls="orange"
            />
            <MetricCard
              label="Loan Closes"
              value={results.startDate
                ? fmtDate(monthToDate(results.startDate, results.completedAt))
                : `Month ${results.completedAt}`}
              sub={`${results.completedAt} EMIs paid`}
              valueStyle={{ fontSize: results.startDate ? '16px' : '20px' }}
            />
            <MetricCard
              label={results.tenureSaved > 0 ? 'Tenure Saved' : 'Full Tenure'}
              value={results.tenureSaved > 0
                ? (results.tenureSaved >= 12
                  ? `${Math.floor(results.tenureSaved / 12)}y ${results.tenureSaved % 12 > 0 ? results.tenureSaved % 12 + 'm' : ''}`
                  : `${results.tenureSaved}m`)
                : `${Math.floor(results.tenureMonths / 12)}y`}
              sub={results.tenureSaved > 0
                ? `${fmtCr(interestSaved)} interest saved`
                : 'no prepayments'}
              cls={results.tenureSaved > 0 ? 'green' : ''}
              highlight={results.tenureSaved > 0}
            />
          </div>

          {/* Summary metrics — row 2: shown when any part payment, top-up, or investment exists */}
          {(results.hasPartPayments || results.hasInvestments) && (
            <div className="metric-grid fade-up" style={{ marginTop: '12px' }}>
              <MetricCard
                label="Estimated Tax"
                value={results.totalTax > 0 ? fmtCr(results.totalTax) : '—'}
                sub={results.totalTax > 0 ? 'on investment profits (FD/Debt 35%, Equity 12.5%)' : 'no investments'}
                valueStyle={{ color: results.totalTax > 0 ? 'var(--red)' : 'var(--text3)' }}
              />
              <MetricCard
                label="Interest Earned"
                value={results.totalInvestmentProfit > 0 ? fmtCr(results.totalInvestmentProfit) : '—'}
                sub={results.totalInvestmentProfit > 0 ? 'from invest-instead entries' : ''}
                cls="green"
              />
              <MetricCard
                label="Net Interest"
                value={results.hasInvestments ? fmtCr(results.netInterest) : '—'}
                sub={results.hasInvestments ? 'interest − returns + tax' : ''}
                valueStyle={{ color: results.hasInvestments ? (results.totalInvestmentProfit > 0 ? 'var(--accent2)' : 'var(--accent3)') : 'var(--text3)' }}
              />
              <MetricCard
                label="Effective Rate"
                value={`${results.effectiveRate.toFixed(2)}%`}
                sub="implied rate on net interest paid"
                valueStyle={{ color: 'var(--accent3)' }}
              />
            </div>
          )}

          {/* Chart */}
          <AmortizationChart schedule={results.schedule} hasPartPayments={results.hasPartPayments} />

          {/* Schedule Table */}
          <div className="chart-card fade-up-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="chart-title" style={{ margin: 0 }}>Amortization Schedule</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`mode-btn${tableView === 'yearly' ? ' active' : ''}`}
                  onClick={() => setTableView('yearly')}
                >Yearly</button>
                <button
                  className={`mode-btn${tableView === 'monthly' ? ' active' : ''}`}
                  onClick={() => setTableView('monthly')}
                >Monthly</button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {tableView === 'yearly' ? (
                <table className="amort-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {hasStartDate && <th>Period</th>}
                      <th className="num">Opening Balance</th>
                      <th className="num">EMI Paid</th>
                      <th className="num interest">Interest</th>
                      <th className="num principal">Principal</th>
                      {results.hasPartPayments && <th className="num accent-col">Part Payment</th>}
                      <th className="num">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlySchedule.map(y => (
                      <tr key={y.year} className={y.totalPartPayment !== 0 ? 'has-pp' : ''}>
                        <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{y.year}</td>
                        {hasStartDate && (
                          <td style={{ color: 'var(--text3)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            {y.startDate ? fmtDate(y.startDate) : ''}
                            {' – '}
                            {y.endDate ? fmtDate(y.endDate) : ''}
                          </td>
                        )}
                        <td className="num">{fmtCr(y.openingBalance)}</td>
                        <td className="num">{fmtCr(y.totalEmi)}</td>
                        <td className="num interest">{fmtCr(y.totalInterest)}</td>
                        <td className="num principal">{fmtCr(y.totalPrincipal)}</td>
                        {results.hasPartPayments && (
                          <td className="num">
                            {y.totalPartPayment > 0
                              ? <span style={{ color: 'var(--accent)' }}>{fmtCr(y.totalPartPayment)}</span>
                              : y.totalPartPayment < 0
                                ? <span style={{ color: 'var(--red)' }}>+{fmtCr(-y.totalPartPayment)}</span>
                                : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                        )}
                        <td className="num" style={{ color: 'var(--text)' }}>{fmtCr(y.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={hasStartDate ? 2 : 1} style={{ color: 'var(--text2)', fontWeight: 600 }}>Total</td>
                      <td />
                      <td className="num">{fmtCr(results.totalInterest + results.totalPrincipal + Math.max(0, results.totalPartPayments))}</td>
                      <td className="num interest">{fmtCr(results.totalInterest)}</td>
                      <td className="num principal">{fmtCr(results.totalPrincipal)}</td>
                      {results.hasPartPayments && (
                        <td className="num" style={{ color: 'var(--accent)' }}>
                          {results.totalPartPayments > 0 ? fmtCr(results.totalPartPayments) : '—'}
                        </td>
                      )}
                      <td className="num" style={{ color: 'var(--accent2)' }}>₹0</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="amort-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {hasStartDate && <th>Date</th>}
                      {results.hasRateChanges && <th>Rate</th>}
                      <th className="num">Opening Balance</th>
                      <th className="num">EMI</th>
                      <th className="num interest">Interest</th>
                      <th className="num principal">Principal</th>
                      {results.hasPartPayments && <th className="num accent-col">Part Pymt</th>}
                      <th className="num">Closing Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.schedule.map(row => (
                      <tr key={row.month} className={row.partPayment !== 0 ? 'has-pp' : ''}>
                        <td style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{row.month}</td>
                        {hasStartDate && (
                          <td style={{ color: 'var(--text3)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            {row.date ? fmtDate(row.date) : ''}
                          </td>
                        )}
                        {results.hasRateChanges && (
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: row.annualRate !== results.initialRate ? 'var(--accent3)' : 'var(--text3)' }}>
                            {row.annualRate}%
                          </td>
                        )}
                        <td className="num">{fmtCr(row.openingBalance)}</td>
                        <td className="num">{fmtINR(row.emi)}</td>
                        <td className="num interest">{fmtINR(row.interest)}</td>
                        <td className="num principal">{fmtINR(row.principal)}</td>
                        {results.hasPartPayments && (
                          <td className="num">
                            {row.partPayment > 0
                              ? <span style={{ color: 'var(--accent)' }}>{fmtINR(row.partPayment)}</span>
                              : row.partPayment < 0
                                ? <span style={{ color: 'var(--red)' }}>+{fmtINR(-row.partPayment)}</span>
                                : <span style={{ color: 'var(--text3)' }}>—</span>}
                          </td>
                        )}
                        <td className="num" style={{ color: 'var(--text)' }}>{fmtCr(row.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="footnote" style={{ marginTop: '16px' }}>
              Interest = Opening Balance × (Rate ÷ 1200). Principal = EMI − Interest.
              {form.partPaymentMode === 'reduce-tenure'
                ? ' Reduce-tenure: EMI stays fixed after prepayments; loan ends earlier.'
                : ' Reduce-EMI: EMI is recalculated after each prepayment for remaining tenure.'}
              {results.hasRateChanges && ' Highlighted rate cells indicate a rate change at that month.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
