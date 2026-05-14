import { useState, useMemo } from 'react'
import CurrencyInput from '../shared/CurrencyInput'
import MetricCard from '../shared/MetricCard'
import TenureInput from '../shared/TenureInput'
import RentInvestmentChart from './RentInvestmentChart'
import { buildRentInvestSchedule, getInvestRate } from '../../utils/rentInvestment'
import { xirr, monthsBetween } from '../../utils/finance'
import { fmtCr, fmtINR, fmtDate } from '../../utils/format'
import { RI_INVEST_OPTIONS } from '../../constants/investmentOptions'

const TODAY = new Date().toISOString().slice(0, 10)

const DEFAULT_FORM = {
  downPayment: '5000000',
  investType: 'equity-12',
  estEmi: '75000',
  tenure: '20',
  tenureUnit: 'years',
  monthlyRent: '30000',
  annualRentIncrease: '10',
  startDate: TODAY,
}

let nextLsId = 1

export default function RentInvestmentPage() {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [lumpsums, setLumpsums] = useState([])
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

  function addLumpsum() {
    setLumpsums(ls => [...ls, { id: nextLsId++, date: '', amount: '', investType: 'equity-12', note: '' }])
  }
  function removeLumpsum(id) { setLumpsums(ls => ls.filter(l => l.id !== id)) }
  function updateLumpsum(id, key, value) {
    setLumpsums(ls => ls.map(l => l.id === id ? { ...l, [key]: value } : l))
  }

  function calculate() {
    setError('')
    try {
      const downPayment = parseFloat(form.downPayment) || 0
      const estEmi = parseFloat(form.estEmi) || 0
      const monthlyRent = parseFloat(form.monthlyRent) || 0
      const annualRentIncrease = parseFloat(form.annualRentIncrease) || 0
      const investRate = getInvestRate(form.investType)

      if (downPayment <= 0) throw new Error('Please enter a valid down payment / lump sum amount.')
      if (estEmi <= 0) throw new Error('Please enter a valid estimated monthly EMI.')
      if (tenureMonths <= 0) throw new Error('Please enter a valid tenure.')
      if (monthlyRent <= 0) throw new Error('Please enter a valid monthly rent.')

      const startDate = form.startDate ? new Date(form.startDate) : null

      const hasDateLumpsums = lumpsums.some(l => l.date && l.amount)
      if (hasDateLumpsums && !startDate) {
        throw new Error('Please set a Start Date to use additional lump sums.')
      }

      const additionalLumpsums = lumpsums
        .filter(l => l.date && l.amount)
        .map(l => {
          const month = monthsBetween(startDate, new Date(l.date)) + 1
          if (month < 1) throw new Error('A lump sum date is before the start date.')
          if (month > tenureMonths) throw new Error('A lump sum date is beyond the investment tenure.')
          return { month, amount: parseFloat(l.amount) || 0, rate: getInvestRate(l.investType) }
        })

      const res = buildRentInvestSchedule({
        downPayment, estEmi, tenureMonths, monthlyRent, annualRentIncrease,
        startDate, investRate, additionalLumpsums,
      })

      const baseDate = startDate || new Date()
      const actualMonths = res.depleted ? res.depletedAt : tenureMonths
      const cfVals = [-downPayment]
      const cfDates = [new Date(baseDate)]

      const lsByMonth = {}
      additionalLumpsums.forEach(ls => {
        lsByMonth[ls.month] = (lsByMonth[ls.month] || 0) + ls.amount
      })

      for (let m = 1; m <= actualMonths; m++) {
        const d = new Date(baseDate)
        d.setMonth(d.getMonth() + m)
        const cf = m === actualMonths
          ? (res.finalCorpus - estEmi - (lsByMonth[m] || 0))
          : (-estEmi - (lsByMonth[m] || 0))
        cfVals.push(cf)
        cfDates.push(d)
      }

      let xirrVal = 0
      try { xirrVal = xirr(cfVals, cfDates) } catch { xirrVal = NaN }
      const xirrPct = isFinite(xirrVal) && !isNaN(xirrVal) ? xirrVal * 100 : null

      setResults({
        ...res,
        xirrPct,
        investRate,
        startDate,
        estEmi,
        monthlyRent,
        downPayment,
        tenureMonths: actualMonths,
      })

      setTimeout(() => {
        document.getElementById('ri-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        openingCorpus: rows[0].openingCorpus,
        totalRent: rows.reduce((s, r) => s + r.currentRent, 0),
        totalSip: rows.reduce((s, r) => s + r.sipAmount, 0),
        totalSwp: rows.reduce((s, r) => s + r.swpAmount, 0),
        totalLumpsum: rows.reduce((s, r) => s + r.lumpsumThisMonth, 0),
        closingCorpus: rows[rows.length - 1].corpus,
      })
      y++
    }
    return years
  }, [results])

  const hasStartDate = !!form.startDate
  const hasLumpsums = results && results.totalLumpsumInvested > 0
  const hasSwp = results && results.totalSwpOut > 0
  const netSipStart = parseFloat(form.estEmi) - parseFloat(form.monthlyRent)

  return (
    <div>
      {/* ── Investment Setup ── */}
      <div className="input-section">
        <div className="section-label">Investment Setup</div>
        <div className="grid-2">
          <div className="field">
            <label>Down Payment / Lump Sum</label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <CurrencyInput value={form.downPayment} onChange={v => setField('downPayment', v)} placeholder="50,00,000" />
            </div>
          </div>
          <div className="field">
            <label>Investment Option</label>
            <select className="amort-select" value={form.investType} onChange={e => setField('investType', e.target.value)}>
              {RI_INVEST_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Monthly Flows ── */}
      <div className="input-section">
        <div className="section-label">Monthly Flows</div>
        <div className="grid-3">
          <div className="field">
            <label>Est. Monthly EMI</label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <CurrencyInput value={form.estEmi} onChange={v => setField('estEmi', v)} placeholder="75,000" />
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
          <div className="field">
            <label>
              Start Date
              <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10px', marginLeft: '6px' }}>
                optional
              </span>
            </label>
            <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Rent Details ── */}
      <div className="input-section">
        <div className="section-label">Rent Details</div>
        <div className="grid-2">
          <div className="field">
            <label>Monthly Rent</label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <CurrencyInput value={form.monthlyRent} onChange={v => setField('monthlyRent', v)} placeholder="30,000" />
            </div>
          </div>
          <div className="field">
            <label>Annual Rent Increase</label>
            <div className="input-wrap has-suffix">
              <input type="number" value={form.annualRentIncrease} onChange={e => setField('annualRentIncrease', e.target.value)} placeholder="10" step="1" min="0" max="100" />
              <span className="suffix">%</span>
            </div>
          </div>
        </div>

        {/* Live preview of starting SIP/SWP */}
        {parseFloat(form.estEmi) > 0 && parseFloat(form.monthlyRent) > 0 && (
          <div className="computed-box" style={{ marginTop: '14px' }}>
            <div className="computed-item">
              <span className="computed-lbl">{netSipStart >= 0 ? 'Starting monthly SIP' : 'Starting monthly SWP'}</span>
              <span className="computed-val" style={{ color: netSipStart >= 0 ? 'var(--accent2)' : 'var(--accent3)' }}>
                {fmtINR(Math.abs(netSipStart))}
              </span>
            </div>
            <div className="computed-item">
              <span className="computed-lbl">{netSipStart >= 0 ? 'EMI − Rent invested each month' : 'Rent − EMI funded by corpus'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Additional Lump Sums ── */}
      <div className="input-section">
        <div className="section-label">
          Additional Lump Sums
          <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            — bonus, savings, etc. (requires Start Date)
          </span>
        </div>
        {lumpsums.length > 0 && (
          <div className="events-list" style={{ marginBottom: '12px' }}>
            {lumpsums.map(ls => (
              <div key={ls.id} className="event-row event-row--pp">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={ls.date} onChange={e => updateLumpsum(ls.id, 'date', e.target.value)} />
                </div>
                <div className="field">
                  <label>Amount</label>
                  <div className="input-wrap has-prefix">
                    <span className="prefix">₹</span>
                    <CurrencyInput value={ls.amount} onChange={v => updateLumpsum(ls.id, 'amount', v)} placeholder="1,00,000" />
                  </div>
                </div>
                <div className="field">
                  <label>Option</label>
                  <select className="amort-select" value={ls.investType} onChange={e => updateLumpsum(ls.id, 'investType', e.target.value)}>
                    {RI_INVEST_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Note (optional)</label>
                  <input type="text" value={ls.note} onChange={e => updateLumpsum(ls.id, 'note', e.target.value)} placeholder="e.g. Annual bonus" className="amort-text-input" />
                </div>
                <button className="remove-btn" onClick={() => removeLumpsum(ls.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
        <button className="add-btn" onClick={addLumpsum}>+ Add Lump Sum</button>
      </div>

      <button className="calc-btn" onClick={calculate}>Calculate Wealth Growth</button>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {results && (
        <div id="ri-results">
          <hr className="results-divider" />

          {results.depleted && (
            <div style={{
              background: 'rgba(240,160,90,0.08)',
              border: '1px solid rgba(240,160,90,0.35)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 18px',
              marginBottom: '24px',
              color: 'var(--accent3)',
              fontSize: '13px',
            }}>
              ⚠ Corpus fully depleted at month {results.depletedAt}
              {results.startDate
                ? `  - ${fmtDate(new Date(results.startDate.getTime()).setMonth ? (() => { const d = new Date(results.startDate); d.setMonth(d.getMonth() + results.depletedAt - 1); return d })() : results.startDate)}`
                : ''
              }. Results shown up to this point.
            </div>
          )}

          {/* ── Summary metrics — row 1 ── */}
          <div className="metric-grid fade-up">
            <MetricCard
              label={netSipStart >= 0 ? 'Starting Monthly SIP' : 'Starting Monthly SWP'}
              value={fmtINR(Math.abs(results.estEmi - results.monthlyRent))}
              sub={netSipStart >= 0 ? 'EMI surplus invested monthly' : 'corpus funds rent shortfall'}
              cls="accent"
              highlight
            />
            <MetricCard
              label="Final Corpus"
              value={fmtCr(results.finalCorpus)}
              sub={results.depleted ? 'corpus depleted' : `after ${results.tenureMonths} months`}
              cls={results.finalCorpus > results.totalInvested ? 'green' : 'red'}
            />
            <MetricCard
              label="Total Invested"
              value={fmtCr(results.totalInvested)}
              sub={`DP + SIPs${results.totalLumpsumInvested > 0 ? ` + ${fmtCr(results.totalLumpsumInvested)} lump sums` : ''}`}
            />
            <MetricCard
              label="XIRR"
              value={results.xirrPct === null ? '—' : `${results.xirrPct.toFixed(2)}%`}
              sub="annualised return on all outflows"
              cls={results.xirrPct === null ? 'red' : results.xirrPct >= 8 ? 'accent' : results.xirrPct >= 0 ? 'orange' : 'red'}
              highlight
            />
          </div>

          {/* ── Summary metrics — row 2 ── */}
          <div className="metric-grid fade-up" style={{ marginTop: '12px' }}>
            <MetricCard
              label="Total Rent Paid"
              value={fmtCr(results.totalRentPaid)}
              sub="money paid to landlord"
              valueStyle={{ color: 'var(--red)' }}
            />
            <MetricCard
              label="Total SIP In"
              value={fmtCr(results.totalSipIn)}
              sub="EMI surplus invested"
              valueStyle={{ color: 'var(--accent2)' }}
            />
            {hasSwp ? (
              <MetricCard
                label="Total SWP Out"
                value={fmtCr(results.totalSwpOut)}
                sub="corpus drawn to cover rent"
                cls="orange"
              />
            ) : (
              <MetricCard
                label="Total Money Out"
                value={fmtCr(results.totalMoneyOut)}
                sub="rent + DP + lump sums"
              />
            )}
            <MetricCard
              label="Profit / Loss"
              value={fmtCr(Math.abs(results.finalCorpus - results.downPayment))}
              sub={results.finalCorpus >= results.downPayment ? 'gain on lump sum invested' : 'loss on lump sum invested'}
              cls={results.finalCorpus - results.downPayment >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* ── Chart ── */}
          <RentInvestmentChart schedule={results.schedule} hasSwp={hasSwp} />

          {/* ── Schedule table ── */}
          <div className="chart-card fade-up-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="chart-title" style={{ margin: 0 }}>Wealth Schedule</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className={`mode-btn${tableView === 'yearly' ? ' active' : ''}`} onClick={() => setTableView('yearly')}>Yearly</button>
                <button className={`mode-btn${tableView === 'monthly' ? ' active' : ''}`} onClick={() => setTableView('monthly')}>Monthly</button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              {tableView === 'yearly' ? (
                <table className="amort-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {hasStartDate && <th>Period</th>}
                      <th className="num">Opening Corpus</th>
                      <th className="num" style={{ color: 'var(--red)' }}>Rent</th>
                      <th className="num principal">SIP</th>
                      {hasSwp && <th className="num" style={{ color: 'var(--accent3)' }}>SWP</th>}
                      {hasLumpsums && <th className="num accent-col">Lump Sum</th>}
                      <th className="num">Closing Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlySchedule.map(y => (
                      <tr key={y.year}>
                        <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{y.year}</td>
                        {hasStartDate && (
                          <td style={{ color: 'var(--text3)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            {y.startDate ? fmtDate(y.startDate) : ''}
                            {' – '}
                            {y.endDate ? fmtDate(y.endDate) : ''}
                          </td>
                        )}
                        <td className="num">{fmtCr(y.openingCorpus)}</td>
                        <td className="num" style={{ color: 'var(--red)' }}>{fmtCr(y.totalRent)}</td>
                        <td className="num principal">{y.totalSip > 0 ? fmtCr(y.totalSip) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        {hasSwp && <td className="num" style={{ color: 'var(--accent3)' }}>{y.totalSwp > 0 ? fmtCr(y.totalSwp) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>}
                        {hasLumpsums && <td className="num accent-col">{y.totalLumpsum > 0 ? fmtCr(y.totalLumpsum) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>}
                        <td className="num" style={{ color: 'var(--text)' }}>{fmtCr(y.closingCorpus)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={hasStartDate ? 2 : 1} style={{ color: 'var(--text2)', fontWeight: 600 }}>Total</td>
                      <td />
                      <td className="num" style={{ color: 'var(--red)' }}>{fmtCr(results.totalRentPaid)}</td>
                      <td className="num principal">{fmtCr(results.totalSipIn)}</td>
                      {hasSwp && <td className="num" style={{ color: 'var(--accent3)' }}>{fmtCr(results.totalSwpOut)}</td>}
                      {hasLumpsums && <td className="num accent-col">{fmtCr(results.totalLumpsumInvested)}</td>}
                      <td className="num" style={{ color: 'var(--accent2)' }}>{fmtCr(results.finalCorpus)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="amort-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {hasStartDate && <th>Date</th>}
                      <th className="num" style={{ color: 'var(--red)' }}>Rent</th>
                      <th className="num principal">SIP</th>
                      {hasSwp && <th className="num" style={{ color: 'var(--accent3)' }}>SWP</th>}
                      {hasLumpsums && <th className="num accent-col">Lump Sum</th>}
                      <th className="num">Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.schedule.map(row => (
                      <tr key={row.month}>
                        <td style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{row.month}</td>
                        {hasStartDate && (
                          <td style={{ color: 'var(--text3)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            {row.date ? fmtDate(row.date) : ''}
                          </td>
                        )}
                        <td className="num" style={{ color: 'var(--red)' }}>{fmtINR(row.currentRent)}</td>
                        <td className="num principal">{row.sipAmount > 0 ? fmtINR(row.sipAmount) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                        {hasSwp && <td className="num" style={{ color: 'var(--accent3)' }}>{row.swpAmount > 0 ? fmtINR(row.swpAmount) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>}
                        {hasLumpsums && <td className="num accent-col">{row.lumpsumThisMonth > 0 ? fmtINR(row.lumpsumThisMonth) : <span style={{ color: 'var(--text3)' }}>—</span>}</td>}
                        <td className="num" style={{ color: 'var(--text)' }}>{fmtCr(row.corpus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="footnote" style={{ marginTop: '16px' }}>
              Lump sum and SIP grow at {results.investRate}% p.a. (compounded monthly). Rent increases {form.annualRentIncrease}% each year.
              {hasSwp && ' SWP months: corpus funds the rent shortfall (Rent − EMI), withdrawn proportionally.'}
              {results.depleted && ' ⚠ Corpus fully depleted before tenure ended.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
