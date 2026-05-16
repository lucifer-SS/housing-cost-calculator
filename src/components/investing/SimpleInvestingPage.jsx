import { useState, useMemo } from 'react'
import CurrencyInput from '../shared/CurrencyInput'
import MetricCard from '../shared/MetricCard'
import TenureInput from '../shared/TenureInput'
import SimpleInvestingChart from './SimpleInvestingChart'
import { buildSipSchedule, buildLumpsumSchedule } from '../../utils/investing'
import { fmtCr, fmtINR } from '../../utils/format'
import { RI_INVEST_OPTIONS } from '../../constants/investmentOptions'
import { getInvestRate } from '../../constants/investmentOptions'

const DEFAULT_SIP = {
  monthlyAmount: '60000',
  investType: 'equity-12',
  tenure: '20',
  tenureUnit: 'years',
}

const DEFAULT_LUMPSUM = {
  amount: '4000000',
  investType: 'equity-12',
  tenure: '20',
  tenureUnit: 'years',
}

export default function SimpleInvestingPage() {
  const [mode, setMode] = useState('sip')
  const [sipForm, setSipForm] = useState(DEFAULT_SIP)
  const [lsForm, setLsForm] = useState(DEFAULT_LUMPSUM)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [tableView, setTableView] = useState('yearly')

  function setSipField(k, v) { setSipForm(f => ({ ...f, [k]: v })); setResults(null) }
  function setLsField(k, v) { setLsForm(f => ({ ...f, [k]: v })); setResults(null) }

  const tenureMonths = useMemo(() => {
    const form = mode === 'sip' ? sipForm : lsForm
    const t = parseInt(form.tenure) || 0
    return form.tenureUnit === 'years' ? t * 12 : t
  }, [mode, sipForm, lsForm])

  function calculate() {
    setError('')
    try {
      if (tenureMonths <= 0) throw new Error('Please enter a valid tenure.')
      const annualRate = getInvestRate(mode === 'sip' ? sipForm.investType : lsForm.investType)

      if (mode === 'sip') {
        const monthlyAmount = parseFloat(sipForm.monthlyAmount) || 0
        if (monthlyAmount <= 0) throw new Error('Please enter a valid monthly SIP amount.')
        const res = buildSipSchedule({ monthlyAmount, annualRate, tenureMonths })
        setResults({ ...res, mode: 'sip', monthlyAmount, annualRate, tenureMonths })
      } else {
        const amount = parseFloat(lsForm.amount) || 0
        if (amount <= 0) throw new Error('Please enter a valid investment amount.')
        const res = buildLumpsumSchedule({ amount, annualRate, tenureMonths })
        setResults({ ...res, mode: 'lumpsum', amount, annualRate, tenureMonths })
      }

      setTimeout(() => {
        document.getElementById('si-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      const endIdx = y * 12 - 1
      if (endIdx >= results.schedule.length) {
        // partial last year
        const rows = results.schedule.filter(r => r.month > (y - 1) * 12)
        if (rows.length) {
          const last = rows[rows.length - 1]
          years.push({ year: y, months: rows.length, corpus: last.corpus, totalInvested: last.totalInvested, interest: last.interest })
        }
        break
      }
      const row = results.schedule[endIdx]
      years.push({ year: y, months: 12, corpus: row.corpus, totalInvested: row.totalInvested, interest: row.interest })
      y++
    }
    return years
  }, [results])

  const form = mode === 'sip' ? sipForm : lsForm

  return (
    <div>
      {/* ── Mode toggle ── */}
      <div className="input-section">
        <div className="section-label">Investment Mode</div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className={`mode-btn${mode === 'sip' ? ' active' : ''}`}
            onClick={() => { setMode('sip'); setResults(null) }}
          >
            SIP (Monthly)
          </button>
          <button
            className={`mode-btn${mode === 'lumpsum' ? ' active' : ''}`}
            onClick={() => { setMode('lumpsum'); setResults(null) }}
          >
            Lump Sum
          </button>
        </div>
      </div>

      {/* ── Inputs ── */}
      <div className="input-section">
        <div className="section-label">
          {mode === 'sip' ? 'SIP Details' : 'Lump Sum Details'}
        </div>
        <div className="grid-3">
          <div className="field">
            <label>{mode === 'sip' ? 'Monthly SIP Amount' : 'Investment Amount'}</label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              {mode === 'sip' ? (
                <CurrencyInput value={sipForm.monthlyAmount} onChange={v => setSipField('monthlyAmount', v)} placeholder="60,000" />
              ) : (
                <CurrencyInput value={lsForm.amount} onChange={v => setLsField('amount', v)} placeholder="40,00,000" />
              )}
            </div>
          </div>

          <div className="field">
            <label>Investment Option</label>
            <select
              className="amort-select"
              value={form.investType}
              onChange={e => mode === 'sip' ? setSipField('investType', e.target.value) : setLsField('investType', e.target.value)}
            >
              {RI_INVEST_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tenure</label>
            <TenureInput
              value={form.tenure}
              unit={form.tenureUnit}
              onChange={v => mode === 'sip' ? setSipField('tenure', v) : setLsField('tenure', v)}
              onUnitChange={u => mode === 'sip' ? setSipField('tenureUnit', u) : setLsField('tenureUnit', u)}
            />
          </div>
        </div>

        {/* Live preview */}
        {tenureMonths > 0 && (
          <div className="computed-box" style={{ marginTop: '14px' }}>
            <div className="computed-item">
              <span className="computed-lbl">Investment tenure</span>
              <span className="computed-val">{tenureMonths} months ({(tenureMonths / 12).toFixed(1)} years)</span>
            </div>
            <div className="computed-item">
              <span className="computed-lbl">Annual return rate</span>
              <span className="computed-val">{getInvestRate(form.investType)}% p.a. (CAGR)</span>
            </div>
          </div>
        )}
      </div>

      <button className="calc-btn" onClick={calculate}>Calculate Returns</button>
      {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

      {results && (
        <div id="si-results">
          <hr className="results-divider" />

          {/* ── Summary metrics ── */}
          <div className="metric-grid fade-up">
            <MetricCard
              label={results.mode === 'sip' ? 'Monthly SIP' : 'Amount Invested'}
              value={results.mode === 'sip' ? fmtINR(results.monthlyAmount) : fmtCr(results.totalInvested)}
              sub={results.mode === 'sip' ? `${results.tenureMonths} months · total ${fmtCr(results.totalInvested)}` : `one-time investment`}
              cls="accent"
              highlight
            />
            <MetricCard
              label="Total Corpus"
              value={fmtCr(results.finalCorpus)}
              sub={`after ${results.tenureMonths} months`}
              cls="green"
              highlight
            />
            <MetricCard
              label="Interest Earned"
              value={fmtCr(results.interestEarned)}
              sub={`${((results.interestEarned / results.totalInvested) * 100).toFixed(1)}% gain on principal`}
              cls="accent"
            />
            <MetricCard
              label="Return Rate"
              value={`${results.annualRate}% p.a.`}
              sub="CAGR · annual compounding"
            />
          </div>

          {/* ── Chart ── */}
          <SimpleInvestingChart schedule={results.schedule} mode={results.mode} />

          {/* ── Schedule table ── */}
          <div className="chart-card fade-up-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div className="chart-title" style={{ margin: 0 }}>Investment Schedule</div>
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
                      <th className="num">Principal Invested</th>
                      <th className="num principal">Interest Earned</th>
                      <th className="num">Total Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlySchedule.map(y => (
                      <tr key={y.year}>
                        <td style={{ color: 'var(--text2)', fontWeight: 500 }}>{y.year}</td>
                        <td className="num" style={{ color: 'var(--accent2)' }}>{fmtCr(y.totalInvested)}</td>
                        <td className="num principal">{fmtCr(y.interest)}</td>
                        <td className="num">{fmtCr(y.corpus)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ color: 'var(--text2)', fontWeight: 600 }}>Total</td>
                      <td className="num" style={{ color: 'var(--accent2)' }}>{fmtCr(results.totalInvested)}</td>
                      <td className="num principal">{fmtCr(results.interestEarned)}</td>
                      <td className="num" style={{ color: 'var(--accent2)' }}>{fmtCr(results.finalCorpus)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="amort-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th className="num">Principal Invested</th>
                      <th className="num principal">Interest Earned</th>
                      <th className="num">Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.schedule.map(row => (
                      <tr key={row.month}>
                        <td style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{row.month}</td>
                        <td className="num" style={{ color: 'var(--accent2)' }}>{fmtCr(row.totalInvested)}</td>
                        <td className="num principal">{fmtCr(row.interest)}</td>
                        <td className="num">{fmtCr(row.corpus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="footnote" style={{ marginTop: '16px' }}>
              {results.mode === 'sip'
                ? `Monthly SIP of ${fmtINR(results.monthlyAmount)} growing at ${results.annualRate}% p.a. (CAGR). Annuity-due formula — each payment compounds from start of period.`
                : `Lump sum of ${fmtCr(results.totalInvested)} growing at ${results.annualRate}% p.a. (CAGR). Compounding is annual — consistent with standard SIP calculators.`
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
