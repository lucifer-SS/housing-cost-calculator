import { fmtL, fmtCr, fmtINR, fmtDate } from '../../utils/format'
import GrowthChart from './GrowthChart'

export default function Results({ results }) {
  if (!results) return null
  const {
    xirrPct, netFromSale, totalCashOut, effectiveCostOut, simpleCagr,
    totalEmisPaid, totalRentSaved, outstandingLoan, emiMonthsCount, rentMonthsCount,
    monthlyEmi, monthlyRent, loanAmount, principalRepaid, totalInterestPaid,
    holdYears, downPayment, extraEvents, chartData, ledger, verdictSub,
    loanEnabled, rentEnabled,
  } = results

  return (
    <>
      <hr className="results-divider" />
      <div className="section-label" style={{ marginBottom: '20px' }}>Your returns</div>

      {/* Verdict */}
      <div className="verdict fade-up">
        <div className="verdict-icon">🏠</div>
        <div>
          <div className="verdict-title">XIRR: {xirrPct}% per annum</div>
          <div className="verdict-sub">{verdictSub}</div>
        </div>
      </div>

      {/* Metric grid */}
      <div className="metric-grid fade-up-2">
        <MetricCard label="XIRR (true return)" value={`${xirrPct}%`} sub="annualised, pre-tax" cls="accent" highlight />
        <MetricCard label="Net in hand after sale" value={fmtCr(netFromSale)} sub={loanEnabled && outstandingLoan > 0 ? `after closing ${fmtL(outstandingLoan)} loan` : 'no outstanding loan'} cls="green" />
        <MetricCard label="Total cash deployed" value={fmtCr(totalCashOut)} sub="gross, before rent savings" />
        <MetricCard label="Effective outflow" value={fmtCr(effectiveCostOut)} sub={rentEnabled && totalRentSaved > 0 ? `net of ${fmtL(totalRentSaved)} rent saved` : 'rent savings excluded'} cls="orange" />
        <MetricCard label="Property simple CAGR" value={`${simpleCagr.toFixed(2)}%`} sub="on purchase price alone" />
        {loanEnabled && <MetricCard label="Total EMIs paid" value={fmtCr(totalEmisPaid)} sub={`${emiMonthsCount} months × ${fmtINR(monthlyEmi)}`} />}
        {rentEnabled && <MetricCard label="Rent saved" value={fmtL(totalRentSaved)} sub={`${rentMonthsCount} months × ${fmtINR(monthlyRent)}`} cls="green" />}
        {loanEnabled && <MetricCard label="Outstanding loan" value={fmtL(outstandingLoan)} sub="to repay from sale" cls="red" />}
      </div>

      {/* Two-col summary */}
      <div className={`fade-up-3${loanEnabled ? ' results-2col' : ''}`}>
        <div className="result-card">
          <div className="result-card-title">Cash outflow breakdown</div>
          <Row k="Down payment" v={`- ${fmtL(downPayment)}`} vc="red" />
          {loanEnabled && <Row k={`EMIs (${emiMonthsCount} months full)`} v={`- ${fmtL(totalEmisPaid)}`} vc="red" />}
          {rentEnabled && totalRentSaved > 0 && <Row k={`Rent saved (${rentMonthsCount} months netted)`} v={`+ ${fmtL(totalRentSaved)}`} vc="green" />}
          {extraEvents.map((e, i) => <Row key={i} k={e.label} v={`- ${fmtL(e.amount)}`} vc="red" />)}
          <Row k="Net effective cash out" v={`- ${fmtCr(effectiveCostOut)}`} vc="bold" bold />
          <Row k="Sale proceeds" v={`+ ${fmtCr(netFromSale + outstandingLoan)}`} vc="green" />
          {loanEnabled && outstandingLoan > 0 && <Row k="Loan repaid from sale" v={`- ${fmtL(outstandingLoan)}`} vc="red" />}
          <Row k="Net in hand" v={`+ ${fmtCr(netFromSale)}`} vc="accent" bold />
          <Row k="Net profit" v={`${netFromSale - effectiveCostOut >= 0 ? '+' : '-'} ${fmtCr(Math.abs(netFromSale - effectiveCostOut))}`} vc={netFromSale - effectiveCostOut >= 0 ? 'green' : 'red'} bold />
        </div>
        {loanEnabled && (
          <div className="result-card">
            <div className="result-card-title">Loan snapshot</div>
            <Row k="Original loan" v={fmtCr(loanAmount)} />
            <Row k="Monthly EMI" v={fmtINR(monthlyEmi)} />
            <Row k="Principal repaid so far" v={fmtL(principalRepaid)} vc="green" />
            <Row k="Interest paid so far" v={fmtL(totalInterestPaid)} vc="red" />
            <Row k="Outstanding balance" v={fmtL(outstandingLoan)} vc="red" />
            <Row k="% loan repaid" v={`${((principalRepaid / loanAmount) * 100).toFixed(1)}%`} />
            <Row k="Holding period" v={`${holdYears} years`} />
            <Row k="Property appreciation" v={`+ ${fmtCr(results.currentValue - results.propertyValue)}`} vc="green" />
          </div>
        )}
        {!loanEnabled && (
          <div className="result-card">
            <div className="result-card-title">Property snapshot</div>
            <Row k="Holding period" v={`${holdYears} years`} />
            <Row k="Purchase price" v={fmtCr(results.propertyValue)} />
            <Row k="Current value" v={fmtCr(results.currentValue)} />
            <Row k="Property appreciation" v={`+ ${fmtCr(results.currentValue - results.propertyValue)}`} vc="green" />
            <Row k="Simple CAGR" v={`${simpleCagr.toFixed(2)}%`} />
          </div>
        )}
      </div>

      <GrowthChart chartData={chartData} />

      {/* Benchmarks */}
      <div className="section-label" style={{ marginBottom: '14px' }}>How you compare</div>
      <div className="bench-grid fade-up">
        <BenchCard lbl="Your XIRR" val={`${xirrPct}%`} desc="pre-tax, pre-costs" you />
        <BenchCard lbl="Nifty 50" val="12–14%" desc="7Y historical CAGR" color="#7dd6a8" />
        <BenchCard lbl="Fixed deposit" val="6.5–7%" desc="7Y average" color="#8b90a0" />
        <BenchCard lbl="CPI inflation" val="5–6%" desc="7Y average" color="#8b90a0" />
        <BenchCard lbl="Property CAGR" val={`${simpleCagr.toFixed(1)}%`} desc="price appreciation only" color="#f0a05a" />
      </div>

      {/* Ledger */}
      <div className="section-label" style={{ marginBottom: '14px' }}>Full cash flow ledger</div>
      <div className="result-card" style={{ overflowX: 'auto' }}>
        <table className="cf-table">
          <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>
            {ledger.map((r, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)' }}>{r.date}</td>
                <td>{r.desc}</td>
                <td><span className={`tag ${r.type}`}>{r.type === 'out' ? 'outflow' : r.type === 'in' ? 'inflow' : 'net'}</span></td>
                <td className={`rv ${r.type === 'out' ? 'red' : r.type === 'in' ? 'green' : 'accent'}`}>{r.type === 'out' ? '- ' : '+ '}{fmtCr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footnote">
        * XIRR computed with each EMI dated to its individual month. Rent savings are netted against EMI from the moved-in date — not shown as a separate inflow. LTCG tax (12.5% on gains, no indexation — post Jul 2024 budget) and broker commission (typically 1–2% of sale value) are not deducted here. Your actual net-in-hand will be lower after these. Consult a tax advisor for Section 54 exemptions if reinvesting in another property.
      </div>
    </>
  )
}

function MetricCard({ label, value, sub, cls, highlight }) {
  return (
    <div className={`metric-card${highlight ? ' highlight' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value${cls ? ' ' + cls : ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

function Row({ k, v, vc, bold }) {
  return (
    <div className="result-row">
      <span className="rk" style={bold ? { color: 'var(--text)', fontWeight: 500 } : {}}>{k}</span>
      <span className={`rv${vc ? ' ' + vc : ''}`}>{v}</span>
    </div>
  )
}

function BenchCard({ lbl, val, desc, you, color }) {
  return (
    <div className={`bench-card${you ? ' you' : ''}`}>
      <div className="bench-lbl">{lbl}</div>
      <div className={`bench-val${you ? ' you' : ''}`} style={color ? { color } : {}}>{val}</div>
      <div className="bench-desc">{desc}</div>
    </div>
  )
}
