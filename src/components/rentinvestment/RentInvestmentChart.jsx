import { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import { fmtCr } from '../../utils/format'

export default function RentInvestmentChart({ schedule, hasSwp }) {
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
      yearlyData.push({
        label: `Y${y}`,
        totalRent: rows.reduce((s, r) => s + r.currentRent, 0),
        totalSip: rows.reduce((s, r) => s + r.sipAmount, 0),
        totalSwp: rows.reduce((s, r) => s + r.swpAmount, 0),
        corpus: rows[rows.length - 1].corpus,
      })
      y++
    }

    const labels = yearlyData.map(d => d.label)
    const datasets = [
      {
        label: 'Rent Paid',
        data: yearlyData.map(d => d.totalRent),
        backgroundColor: 'rgba(240,100,100,0.65)',
        borderWidth: 0,
        stack: 'flows',
        order: 2,
      },
      {
        label: 'SIP Invested',
        data: yearlyData.map(d => d.totalSip),
        backgroundColor: 'rgba(125,214,168,0.75)',
        borderWidth: 0,
        stack: 'flows',
        order: 2,
      },
    ]

    if (hasSwp) {
      datasets.push({
        label: 'SWP Withdrawn',
        data: yearlyData.map(d => d.totalSwp),
        backgroundColor: 'rgba(240,160,90,0.65)',
        borderWidth: 0,
        stack: 'flows',
        order: 2,
      })
    }

    datasets.push({
      label: 'Corpus Value',
      data: yearlyData.map(d => d.corpus),
      type: 'line',
      borderColor: '#c8f064',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: yearlyData.length > 20 ? 0 : 3,
      pointBackgroundColor: '#c8f064',
      tension: 0.3,
      yAxisID: 'yCorpus',
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
            title: { display: true, text: 'Annual cash flows', color: '#555b6e', font: { size: 10 } },
          },
          yCorpus: {
            position: 'right',
            ticks: { callback: v => fmtCr(v), color: '#c8f064', maxTicksLimit: 6 },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Corpus value', color: '#c8f064', font: { size: 10 } },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [schedule, hasSwp])

  return (
    <div className="chart-card fade-up-2">
      <div className="chart-title">Wealth growth — annual cash flows vs corpus</div>
      <div className="chart-inner" style={{ height: '280px' }}>
        <canvas ref={canvasRef} aria-label="Chart showing annual rent, SIP, and corpus growth over time" />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#8b90a0', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(240,100,100,0.65)', display: 'inline-block', borderRadius: '2px' }} />
          Rent Paid
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: 'rgba(125,214,168,0.75)', display: 'inline-block', borderRadius: '2px' }} />
          SIP Invested
        </span>
        {hasSwp && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'rgba(240,160,90,0.65)', display: 'inline-block', borderRadius: '2px' }} />
            SWP Withdrawn
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '20px', height: '2px', background: '#c8f064', display: 'inline-block' }} />
          Corpus Value
        </span>
      </div>
    </div>
  )
}
