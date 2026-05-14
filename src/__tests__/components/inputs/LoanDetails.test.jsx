import { render, screen, fireEvent } from '@testing-library/react'
import LoanDetails from '../../../components/inputs/LoanDetails'

const emiForm = {
  loanAmount: '8900000',
  downPayment: '2100000',
  loanMode: 'emi',
  monthlyEmi: '75500',
  outstandingLoan: '7263000',
  loanRate: '8.5',
  loanTenure: '240',
}

const roiForm = { ...emiForm, loanMode: 'roi' }

const baseProps = { enabled: true, onToggle: vi.fn() }

describe('LoanDetails — EMI mode', () => {
  it('renders EMI and outstanding inputs', () => {
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={null} {...baseProps} />)
    expect(screen.getByDisplayValue('75,500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('72,63,000')).toBeInTheDocument()
  })

  it('does not render rate/tenure inputs', () => {
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={null} {...baseProps} />)
    expect(screen.queryByDisplayValue('8.5')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('240')).not.toBeInTheDocument()
  })

  it('shows computed implied rate when computedLoan is provided', () => {
    const computed = { mode: 'emi', rAnnual: 8.228, nTotal: 242 }
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={computed} {...baseProps} />)
    expect(screen.getByText(/implied interest rate/i)).toBeInTheDocument()
    expect(screen.getByText('8.23%')).toBeInTheDocument()
  })

  it('shows error state in computed box', () => {
    const computed = { error: 'Could not solve for interest rate — check your inputs.' }
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={computed} {...baseProps} />)
    expect(screen.getByText(/could not solve/i)).toBeInTheDocument()
  })
})

describe('LoanDetails — Rate & Tenure mode', () => {
  it('renders rate and tenure inputs', () => {
    render(<LoanDetails form={roiForm} onChange={vi.fn()} computedLoan={null} {...baseProps} />)
    expect(screen.getByDisplayValue('8.5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('240')).toBeInTheDocument()
  })

  it('does not render EMI/outstanding inputs', () => {
    render(<LoanDetails form={roiForm} onChange={vi.fn()} computedLoan={null} {...baseProps} />)
    expect(screen.queryByDisplayValue('75,500')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('72,63,000')).not.toBeInTheDocument()
  })

  it('shows computed EMI and outstanding', () => {
    const computed = { mode: 'roi', emi: 77236, os: 7278344, label2: 'Computed outstanding (after 84m)' }
    render(<LoanDetails form={roiForm} onChange={vi.fn()} computedLoan={computed} {...baseProps} />)
    expect(screen.getByText(/computed monthly emi/i)).toBeInTheDocument()
    expect(screen.getByText(/computed outstanding/i)).toBeInTheDocument()
  })
})

describe('LoanDetails — mode toggle', () => {
  it('calls onChange with loanMode when toggling to Rate & Tenure', () => {
    const onChange = vi.fn()
    render(<LoanDetails form={emiForm} onChange={onChange} computedLoan={null} {...baseProps} />)
    fireEvent.click(screen.getByText('Rate & Tenure'))
    expect(onChange).toHaveBeenCalledWith('loanMode', 'roi')
  })

  it('calls onChange with loanMode when toggling back to EMI & Outstanding', () => {
    const onChange = vi.fn()
    render(<LoanDetails form={roiForm} onChange={onChange} computedLoan={null} {...baseProps} />)
    fireEvent.click(screen.getByText('EMI & Outstanding'))
    expect(onChange).toHaveBeenCalledWith('loanMode', 'emi')
  })
})

describe('LoanDetails — section toggle', () => {
  it('hides inputs and shows off-note when disabled', () => {
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={null} enabled={false} onToggle={vi.fn()} />)
    expect(screen.queryByDisplayValue('75,500')).not.toBeInTheDocument()
    expect(screen.getByText(/full cash purchase/i)).toBeInTheDocument()
  })

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn()
    render(<LoanDetails form={emiForm} onChange={vi.fn()} computedLoan={null} enabled={true} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('included'))
    expect(onToggle).toHaveBeenCalled()
  })
})
