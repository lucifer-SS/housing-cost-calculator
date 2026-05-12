import InfoTip from '../shared/InfoTip'
import CurrencyInput from '../shared/CurrencyInput'

export default function RentSavings({ form, onChange }) {
  return (
    <div className="input-section">
      <div className="section-label">Rent savings</div>
      <div className="grid-3" style={{ gap: '16px', alignItems: 'end' }}>
        <div className="field">
          <label>Monthly rent saved <InfoTip tip="What you'd have paid as rent — netted against EMI from moved-in date" /></label>
          <div className="input-wrap has-prefix">
            <span className="prefix">₹</span>
            <CurrencyInput value={form.monthlyRent} onChange={v => onChange('monthlyRent', v)} />
          </div>
        </div>
        <div className="field">
          <label>Annual rent increase <InfoTip tip="Estimated yearly percentage by which rent grows — compounded annually from moved-in date" /></label>
          <div className="input-wrap has-suffix">
            <input type="number" value={form.annualRentIncrease} onChange={e => onChange('annualRentIncrease', e.target.value)} step="1" min="0" max="100" />
            <span className="suffix">%</span>
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
