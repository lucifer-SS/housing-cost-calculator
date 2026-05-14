import CurrencyInput from '../shared/CurrencyInput'

export default function ExtraExpenses({ events, onAdd, onRemove, onChange, enabled, onToggle }) {
  return (
    <div className="input-section">
      <div className="section-label">
        Additional cash outflows (registration, interiors, repairs, etc.)
        <div className="section-toggle-pill">
          <button className={`section-toggle-btn${enabled ? ' active' : ''}`} onClick={() => !enabled && onToggle()}>Included</button>
          <button className={`section-toggle-btn${!enabled ? ' active' : ''}`} onClick={() => enabled && onToggle()}>Excluded</button>
        </div>
      </div>

      {!enabled && (
        <p className="section-off-note">Extra expenses excluded — only down payment and EMIs counted as outflows.</p>
      )}

      {enabled && (
        <>
          <div className="events-list">
            {events.map(ev => (
              <div key={ev.id} className="event-row event-row--expense">
                <div className="field">
                  <label>Description</label>
                  <input
                    type="text"
                    value={ev.label}
                    placeholder="e.g. Renovation"
                    onChange={e => onChange(ev.id, 'label', e.target.value)}
                    style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '13px', padding: '9px 11px', outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={ev.date} onChange={e => onChange(ev.id, 'date', e.target.value)} />
                </div>
                <div className="field">
                  <label>Amount (₹)</label>
                  <div className="input-wrap has-prefix">
                    <span className="prefix">₹</span>
                    <CurrencyInput value={ev.amount} onChange={v => onChange(ev.id, 'amount', v)} />
                  </div>
                </div>
                <button className="remove-btn" onClick={() => onRemove(ev.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={onAdd}>＋ Add expense</button>
        </>
      )}
    </div>
  )
}
