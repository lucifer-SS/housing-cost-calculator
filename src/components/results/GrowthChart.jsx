import { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import { fmtCr, fmtDate } from '../../utils/format'

export default function GrowthChart({ chartData }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartData || !canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Cumulative outflow (net)',
            data: chartData.cumOutflow,
            borderColor: '#f06464',
            backgroundColor: 'rgba(240,100,100,0.06)',
            fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4,
            borderDash: [5, 3],
          },
          {
            label: 'Property value',
            data: chartData.propValue,
            borderColor: '#c8f064',
            backgroundColor: 'rgba(200,240,100,0.05)',
            fill: true, borderWidth: 2, pointRadius: 0, tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + fmtCr(ctx.raw) } },
        },
        scales: {
          x: { ticks: { color: '#555b6e', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { callback: v => fmtCr(v), color: '#555b6e', maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    })
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [chartData])

  return (
    <div className="chart-card fade-up-4">
      <div className="chart-title">Cumulative cash outflow vs property value over time</div>
      <div className="chart-inner">
        <canvas ref={canvasRef} role="img" aria-label="Chart showing cumulative investment vs property value growth over holding period" />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#8b90a0', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '20px', height: '2px', background: '#f06464', display: 'inline-block', borderBottom: '2px dashed #f06464' }} />
          Cumulative outflow (net of rent)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '20px', height: '2px', background: '#c8f064', display: 'inline-block' }} />
          Property value
        </span>
      </div>
    </div>
  )
}
