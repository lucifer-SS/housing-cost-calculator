import InfoTip from '../shared/InfoTip'
import { fmtCr } from '../../utils/format'

export default function PropertyDetails({ form, onChange, computedValuation }) {
  return (
    <div className="input-section">
      <div className="section-label">Property details</div>
      <div className="grid-2" style={{ gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
        <div className="field">
          <label>Property purchase value <InfoTip tip="Original agreed price at time of purchase" /></label>
          <div className="input-wrap has-prefix">
            <span className="prefix">₹</span>
            <input type="number" value={form.propertyValue} onChange={e => onChange('propertyValue', e.target.value)} step="100000" />
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
          className={`mode-btn${form.valuationMode === 'actual' ? ' active' : ''}`}
          onClick={() => onChange('valuationMode', 'actual')}
        >Actual value</button>
        <button
          className={`mode-btn${form.valuationMode === 'appreciation' ? ' active' : ''}`}
          onClick={() => onChange('valuationMode', 'appreciation')}
        >Appreciation %</button>
      </div>

      <div className="grid-2" style={{ gap: '16px', alignItems: 'end' }}>
        {form.valuationMode === 'actual' ? (
          <div className="field">
            <label>Current market value <InfoTip tip="Estimated value at valuation date — can be a future projection" /></label>
            <div className="input-wrap has-prefix">
              <span className="prefix">₹</span>
              <input type="number" value={form.currentValue} onChange={e => onChange('currentValue', e.target.value)} step="100000" />
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Annual appreciation <InfoTip tip="Expected yearly growth in property value — compounded from purchase date to valuation date" /></label>
            <div className="input-wrap has-suffix">
              <input type="number" value={form.annualAppreciation} onChange={e => onChange('annualAppreciation', e.target.value)} step="0.5" min="0" />
              <span className="suffix">%</span>
            </div>
          </div>
        )}
        <div className="field">
          <label>Valuation date <InfoTip tip="Date at which market value and outstanding balance are measured — can be future" /></label>
          <input type="date" value={form.valuationDate} onChange={e => onChange('valuationDate', e.target.value)} />
        </div>
      </div>

      {computedValuation && (
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
