import InfoTip from '../shared/InfoTip'

export default function RentSavings({ form, onChange }) {
  return (
    <div className="input-section">
      <div className="section-label">Rent savings</div>
      <div className="grid-2" style={{ gap: '16px', alignItems: 'end' }}>
        <div className="field">
          <label>Monthly rent saved <InfoTip tip="What you'd have paid as rent — netted against EMI from moved-in date" /></label>
          <div className="input-wrap has-prefix">
            <span className="prefix">₹</span>
            <input type="number" value={form.monthlyRent} onChange={e => onChange('monthlyRent', e.target.value)} step="1000" />
          </div>
        </div>
        <div className="field">
          <label>Moved-in date</label>
          <input type="date" value={form.movedInDate} onChange={e => onChange('movedInDate', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
