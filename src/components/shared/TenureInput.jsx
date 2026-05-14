export default function TenureInput({ value, unit, onChange, onUnitChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <div className="input-wrap" style={{ flex: 1 }}>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={unit === 'years' ? '20' : '240'}
          min="1"
        />
      </div>
      <button
        className={`mode-btn${unit === 'years' ? ' active' : ''}`}
        style={{ padding: '7px 12px' }}
        onClick={() => onUnitChange('years')}
      >Yrs</button>
      <button
        className={`mode-btn${unit === 'months' ? ' active' : ''}`}
        style={{ padding: '7px 12px' }}
        onClick={() => onUnitChange('months')}
      >Mo</button>
    </div>
  )
}
