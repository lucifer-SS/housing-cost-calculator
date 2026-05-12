export const fmtL = v => '₹' + (Math.abs(v) / 100000).toFixed(2) + 'L'
export const fmtCr = v => {
  const c = Math.abs(v) / 10000000
  return c >= 1 ? '₹' + c.toFixed(2) + 'Cr' : fmtL(v)
}
export const fmtINR = v => '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN')
export const fmtDate = d => d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
