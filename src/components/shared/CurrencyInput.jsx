export default function CurrencyInput({ value, onChange, ...props }) {
  const n = parseInt(value, 10)
  return (
    <input
      type="text"
      inputMode="numeric"
      value={isNaN(n) ? '' : n.toLocaleString('en-IN')}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      {...props}
    />
  )
}
