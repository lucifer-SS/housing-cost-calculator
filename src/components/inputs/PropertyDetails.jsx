import InfoTip from '../shared/InfoTip'

export default function PropertyDetails({ form, onChange }) {
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
      <div className="grid-2" style={{ gap: '16px', alignItems: 'end' }}>
        <div className="field">
          <label>Current market value <InfoTip tip="Estimated value at valuation date — can be a future projection" /></label>
          <div className="input-wrap has-prefix">
            <span className="prefix">₹</span>
            <input type="number" value={form.currentValue} onChange={e => onChange('currentValue', e.target.value)} step="100000" />
          </div>
        </div>
        <div className="field">
          <label>Valuation date <InfoTip tip="Date at which market value and outstanding balance are measured — can be future" /></label>
          <input type="date" value={form.valuationDate} onChange={e => onChange('valuationDate', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
