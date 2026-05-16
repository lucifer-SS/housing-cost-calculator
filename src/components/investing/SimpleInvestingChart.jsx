import { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import { fmtCr } from '../../utils/format'

export default function SimpleInvestingChart({ schedule, mode }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!schedule?.length || !canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    // Aggregate by year
    const yearlyData = []
    let y = 1
    while (true) {
      const idx = y * 12 - 1  // last month of year y (0-indexed)
      if (idx >= schedule.length) break
      const row = schedule[idx]
      yearlyData.push({
        label: `Y${y}`,
        principal: row.totalInvested,
        interest: row.interest,
        corpus: row.corpus,
      })
      y++
    }
    // Include partial last year if not already covered
    const lastRow = schedule[schedule.length - 1]
    const lastFullYear = Math.floor((schedule.length - 1) / 12)
    if (schedule.length % 12 !== 0 && lastFullYear < y) {
      yearlyData.push({
        label: `Y${y}`,
        principal: lastRow.totalInvested,
        interest: lastRow.interest,
        corpus: lastRow.corpus,
      })
    }

    const labels = yearlyData.map(d => d.label)

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Principal Invested',
            data: yearlyData.map(d => d.principal),
            backgroundColor: 'rgba(125,214,168,0.75)',
            borderWidth: 0,
            stack: 'corpus',
            order: 2,
          },
          {
            label: 'Interest Earned',
            data: yearlyData.map(d => d.interest),
            backgroundColor: 'rgba(200,240,100,0.65)',
            borderWidth: 0,
            stack: 'corpus',
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmtCr(ctx.raw)}`,
              footer: items => ` Total Corpus: ${fmtCr(items[0] ? yearlyData[items[0].dataIndex].corpus : 0)}`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#555b6e', maxTicksLimit: 15 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            stacked: true,
            ticks: { callback: v => fmtCr(v), color: '#555b6e', maxTicksLimit: 6 },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [schedule, mode])

  return (
    <div className="chart-card fade-up-2">
      <div className="chart-title">Corpus growth — principal vs interest</div>
      <div className="chart-inner" style={{ height: '280px' }}>
        <canvas ref={canvasRef} aria-label="Chart showing principal invested vs interest earned year by year" />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#8b90a0', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(125,214,168,0.75)', display: 'inline-block', borderRadius: '2px' }} />
          Principal Invested
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(200,240,100,0.65)', display: 'inline-block', borderRadius: '2px' }} />
          Interest Earned
        </span>
      </div>
    </div>
  )
}
