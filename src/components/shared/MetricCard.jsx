export default function MetricCard({ label, value, sub, cls, highlight, valueStyle, tooltip }) {
  return (
    <div className={`metric-card${highlight ? ' highlight' : ''}`} title={tooltip || undefined}>
      <div className="metric-label">
        {label}
        {tooltip && <span className="metric-tooltip-icon" aria-label="info"> ⓘ</span>}
      </div>
      <div className={`metric-value${cls ? ' ' + cls : ''}`} style={valueStyle}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}
