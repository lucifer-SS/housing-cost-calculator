import { render, screen, fireEvent } from '@testing-library/react'
import PropertyDetails from '../../../components/inputs/PropertyDetails'

const form = {
  propertyValue: '11000000',
  valuationMode: 'actual',
  currentValue: '18000000',
  annualAppreciation: '8',
  purchaseDate: '2019-05-01',
  valuationDate: '2026-05-01',
}

describe('PropertyDetails', () => {
  it('renders all four inputs with correct initial values', () => {
    render(<PropertyDetails form={form} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('1,10,00,000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1,80,00,000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2019-05-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument()
  })

  it('calls onChange with correct key and value for property value', () => {
    const onChange = vi.fn()
    render(<PropertyDetails form={form} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('1,10,00,000'), { target: { value: '12000000' } })
    expect(onChange).toHaveBeenCalledWith('propertyValue', '12000000')
  })

  it('calls onChange for purchase date', () => {
    const onChange = vi.fn()
    render(<PropertyDetails form={form} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('2019-05-01'), { target: { value: '2020-01-01' } })
    expect(onChange).toHaveBeenCalledWith('purchaseDate', '2020-01-01')
  })

  it('calls onChange for valuation date', () => {
    const onChange = vi.fn()
    render(<PropertyDetails form={form} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('2026-05-01'), { target: { value: '2028-01-01' } })
    expect(onChange).toHaveBeenCalledWith('valuationDate', '2028-01-01')
  })

  it('renders info tips on value fields', () => {
    render(<PropertyDetails form={form} onChange={vi.fn()} />)
    const tips = screen.getAllByText('i')
    expect(tips.length).toBeGreaterThanOrEqual(2)
  })

  it('switches to Appreciation % mode and shows appreciation input', () => {
    const onChange = vi.fn()
    render(<PropertyDetails form={{ ...form, valuationMode: 'appreciation' }} onChange={onChange} />)
    expect(screen.queryByDisplayValue('1,80,00,000')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('8')).toBeInTheDocument()
  })

  it('shows computed valuation box when computedValuation is provided', () => {
    render(<PropertyDetails form={{ ...form, valuationMode: 'appreciation' }} onChange={vi.fn()} computedValuation={{ value: 18897000 }} />)
    expect(screen.getByText('Computed market value')).toBeInTheDocument()
  })

  it('clicking Appreciation % calls onChange with valuationMode', () => {
    const onChange = vi.fn()
    render(<PropertyDetails form={form} onChange={onChange} />)
    fireEvent.click(screen.getByText('Appreciation %'))
    expect(onChange).toHaveBeenCalledWith('valuationMode', 'appreciation')
  })
})
