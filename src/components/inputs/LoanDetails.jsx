import InfoTip from '../shared/InfoTip'
import CurrencyInput from '../shared/CurrencyInput'
import { fmtINR, fmtL } from '../../utils/format'

export default function LoanDetails({ form, onChange, computedLoan, enabled, onToggle }) {
  return (
    <div className="input-section">
      <div className="section-label">
        Loan details
        <button className={`section-toggle${enabled ? ' on' : ' off'}`} onClick={onToggle}>
          {enabled ? 'included' : 'excluded'}
        </button>
      </div>

      {!enabled && (
        <p className="section-off-note">Treated as a full cash purchase — no EMI outflows in the calculation.</p>
      )}

      {enabled && (
        <>
          <div className="mode-toggle">
            <span className="mode-toggle-lbl">Input mode</span>
            <button
              className={`mode-btn${form.loanMode === 'emi' ? ' active' : ''}`}
              onClick={() => onChange('loanMode', 'emi')}
            >EMI &amp; Outstanding</button>
            <button
              className={`mode-btn${form.loanMode === 'roi' ? ' active' : ''}`}
              onClick={() => onChange('loanMode', 'roi')}
            >Rate &amp; Tenure</button>
          </div>
          <div className="grid-2" style={{ gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
            <div className="field">
              <label>Loan amount</label>
              <div className="input-wrap has-prefix">
                <span className="prefix">₹</span>
                <CurrencyInput value={form.loanAmount} onChange={v => onChange('loanAmount', v)} />
              </div>
            </div>
            <div className="field">
              <label>Down payment paid <InfoTip tip="Upfront amount paid at purchase, excluding loan" /></label>
              <div className="input-wrap has-prefix">
                <span className="prefix">₹</span>
                <CurrencyInput value={form.downPayment} onChange={v => onChange('downPayment', v)} />
              </div>
            </div>
          </div>

          {form.loanMode === 'emi' && (
            <div className="grid-2" style={{ gap: '16px', marginBottom: '4px', alignItems: 'end' }}>
              <div className="field">
                <label>Monthly EMI</label>
                <div className="input-wrap has-prefix">
                  <span className="prefix">₹</span>
                  <CurrencyInput value={form.monthlyEmi} onChange={v => onChange('monthlyEmi', v)} />
                </div>
              </div>
              <div className="field">
                <label>Current outstanding balance <InfoTip tip="Loan balance as per bank statement at valuation date" /></label>
                <div className="input-wrap has-prefix">
                  <span className="prefix">₹</span>
                  <CurrencyInput value={form.outstandingLoan} onChange={v => onChange('outstandingLoan', v)} />
                </div>
              </div>
            </div>
          )}

          {form.loanMode === 'roi' && (
            <div className="grid-2" style={{ gap: '16px', marginBottom: '4px', alignItems: 'end' }}>
              <div className="field">
                <label>Interest rate (p.a.)</label>
                <div className="input-wrap has-suffix">
                  <input type="number" value={form.loanRate} onChange={e => onChange('loanRate', e.target.value)} step="0.05" />
                  <span className="suffix">%</span>
                </div>
              </div>
              <div className="field">
                <label>Tenure (months)</label>
                <input type="number" value={form.loanTenure} onChange={e => onChange('loanTenure', e.target.value)} step="12" />
              </div>
            </div>
          )}

          {computedLoan && !computedLoan.error && (
            <div className="computed-box">
              {computedLoan.mode === 'roi' ? (
                <>
                  <div className="computed-item">
                    <span className="computed-lbl">Computed monthly EMI</span>
                    <span className="computed-val">{fmtINR(computedLoan.emi)}</span>
                  </div>
                  <div className="computed-item">
                    <span className="computed-lbl">{computedLoan.label2}</span>
                    <span className="computed-val">{fmtL(computedLoan.os)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="computed-item">
                    <span className="computed-lbl">Implied interest rate (p.a.)</span>
                    <span className="computed-val">{computedLoan.rAnnual.toFixed(2)}%</span>
                  </div>
                  <div className="computed-item">
                    <span className="computed-lbl">Implied total tenure</span>
                    <span className="computed-val">{Math.round(computedLoan.nTotal)} months</span>
                    <span className="computed-sub">{(computedLoan.nTotal / 12).toFixed(1)} years</span>
                  </div>
                </>
              )}
            </div>
          )}
          {computedLoan?.error && (
            <div className="computed-box err">
              <span style={{ color: 'var(--red)', fontSize: '13px' }}>{computedLoan.error}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
