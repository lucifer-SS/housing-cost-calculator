import { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import { fmtCr } from '../../utils/format'

export default function AmortizationChart({ schedule, hasPartPayments }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!schedule?.length || !canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    // Aggregate by year
    const yearlyData = []
    let y = 1
    while (true) {
      const start = (y - 1) * 12 + 1
      const rows = schedule.filter(r => r.month >= start && r.month < start + 12)
      if (!rows.length) break
      const last = rows[rows.length - 1]
      yearlyData.push({
        label: `Y${y}`,
        interest: rows.reduce((s, r) => s + r.interest, 0),
        principal: rows.reduce((s, r) => s + r.principal, 0),
        partPayment: rows.reduce((s, r) => s + Math.max(0, r.partPayment), 0),
        closingBalance: last.closingBalance,
      })
      y++
    }

    const labels = yearlyData.map(d => d.label)
    const datasets = [
      {
        label: 'Interest',
        data: yearlyData.map(d => d.interest),
        backgroundColor: 'rgba(240,160,90,0.75)',
        borderWidth: 0,
        stack: 'payments',
        order: 2,
      },
      {
        label: 'Principal',
        data: yearlyData.map(d => d.principal),
        backgroundColor: 'rgba(125,214,168,0.75)',
        borderWidth: 0,
        stack: 'payments',
        order: 2,
      },
    ]

    if (hasPartPayments) {
      datasets.push({
        label: 'Part Payment',
        data: yearlyData.map(d => d.partPayment),
        backgroundColor: 'rgba(200,240,100,0.65)',
        borderWidth: 0,
        stack: 'payments',
        order: 2,
      })
    }

    datasets.push({
      label: 'Outstanding Balance',
      data: yearlyData.map(d => d.closingBalance),
      type: 'line',
      borderColor: '#f06464',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: yearlyData.length > 20 ? 0 : 3,
      pointBackgroundColor: '#f06464',
      tension: 0.3,
      yAxisID: 'yBalance',
      order: 1,
    })

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtCr(ctx.raw)}` },
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
            title: { display: true, text: 'Annual payments', color: '#555b6e', font: { size: 10 } },
          },
          yBalance: {
            position: 'right',
            ticks: { callback: v => fmtCr(v), color: '#f06464', maxTicksLimit: 6 },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Outstanding balance', color: '#f06464', font: { size: 10 } },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [schedule, hasPartPayments])

  return (
    <div className="chart-card fade-up-2">
      <div className="chart-title">Annual interest vs principal breakdown & outstanding balance</div>
      <div className="chart-inner" style={{ height: '280px' }}>
        <canvas ref={canvasRef} aria-label="Amortization chart showing annual interest and principal breakdown with outstanding balance" />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#8b90a0', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(240,160,90,0.75)', display: 'inline-block', borderRadius: '2px' }} />
          Interest
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(125,214,168,0.75)', display: 'inline-block', borderRadius: '2px' }} />
          Principal
        </span>
        {hasPartPayments && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'rgba(200,240,100,0.65)', display: 'inline-block', borderRadius: '2px' }} />
            Part Payment
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '20px', height: '2px', background: '#f06464', display: 'inline-block' }} />
          Outstanding Balance
        </span>
      </div>
    </div>
  )
}
