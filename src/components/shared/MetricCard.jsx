export default function MetricCard({ label, value, sub, cls, highlight, valueStyle }) {
  return (
    <div className={`metric-card${highlight ? ' highlight' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value${cls ? ' ' + cls : ''}`} style={valueStyle}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}
