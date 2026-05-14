import InfoTip from '../shared/InfoTip'
import CurrencyInput from '../shared/CurrencyInput'
import TenureInput from '../shared/TenureInput'
import { fmtCr, fmtDate } from '../../utils/format'

export default function PropertyDetails({ form, onChange, computedValuation, effectiveValuationDate }) {
  const isAppreciation = form.valuationMode === 'appreciation'

  return (
    <div className="input-section">
      <div className="section-label">Property details</div>
      <div className="grid-2" style={{ gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
        <div className="field">
          <label>Property purchase value <InfoTip tip="Original agreed price at time of purchase" /></label>
          <div className="input-wrap has-prefix">
            <span className="prefix">₹</span>
            <CurrencyInput value={form.propertyValue} onChange={v => onChange('propertyValue', v)} />
          </div>
        </div>
        <div className="field">
          <label>Purchase date</label>
          <input type="date" value={form.purchaseDate} onChange={e => onChange('purchaseDate', e.target.value)} />
        </div>
      </div>

      <div className="mode-toggle">
        <span className="mode-toggle-lbl">Valuation</span>
        <button
          className={`mode-btn${!isAppreciation ? ' active' : ''}`}
          onClick={() => onChange('valuationMode', 'actual')}
        >Actual value</button>
        <button
          className={`mode-btn${isAppreciation ? ' active' : ''}`}
          onClick={() => onChange('valuationMode', 'appreciation')}
        >Appreciation %</button>
      </div>

      <div className="grid-2" style={{ gap: '16px', alignItems: 'end' }}>
        {isAppreciation ? (
          <div className="field">
            <label>Annual appreciation <InfoTip tip="Expected yearly growth in property value — compounded from purchase date" /></label>
            <div className="input-wrap has-suffix">
              <input type="number" value={form.annualAppreciation} onChange={e => onChange('annualAppreciation', e.target.value)} step="0.5" min="0" />
              <span className="suffix">%</span>
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Current market value <InfoTip tip="Estimated value at valuation date — can be a future projection" /></label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <CurrencyInput value={form.currentValue} onChange={v => onChange('currentValue', v)} />
            </div>
          </div>
        )}

        {isAppreciation ? (
          <div className="field">
            <label>Holding tenure <InfoTip tip="How long you plan to hold the property — valuation date is computed from this" /></label>
            <TenureInput
              value={form.appreciationTenure}
              unit={form.appreciationTenureUnit}
              onChange={v => onChange('appreciationTenure', v)}
              onUnitChange={u => onChange('appreciationTenureUnit', u)}
            />
          </div>
        ) : (
          <div className="field">
            <label>Valuation date <InfoTip tip="Date at which market value and outstanding balance are measured — can be future" /></label>
            <input type="date" value={form.valuationDate} onChange={e => onChange('valuationDate', e.target.value)} />
          </div>
        )}
      </div>

      {isAppreciation && effectiveValuationDate && (
        <div className="computed-box" style={{ marginTop: '14px' }}>
          <div className="computed-item">
            <span className="computed-lbl">Valuation date</span>
            <span className="computed-val">{fmtDate(effectiveValuationDate)}</span>
          </div>
          {computedValuation && (
            <div className="computed-item">
              <span className="computed-lbl">Computed market value</span>
              <span className="computed-val">{fmtCr(computedValuation.value)}</span>
            </div>
          )}
        </div>
      )}
      {!isAppreciation && computedValuation && (
        <div className="computed-box" style={{ marginTop: '14px' }}>
          <div className="computed-item">
            <span className="computed-lbl">Computed market value</span>
            <span className="computed-val">{fmtCr(computedValuation.value)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
