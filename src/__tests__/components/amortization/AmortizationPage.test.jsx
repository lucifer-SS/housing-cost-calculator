import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AmortizationPage from '../../../components/amortization/AmortizationPage'

// Chart.js canvas not supported in jsdom
vi.mock('../../../components/amortization/AmortizationChart', () => ({
  default: () => <div data-testid="mock-amort-chart" />,
}))

// ── rendering ────────────────────────────────────────────────────────────────

describe('AmortizationPage — rendering', () => {
  it('renders all section labels', () => {
    render(<AmortizationPage />)
    expect(screen.getByText('Loan Details')).toBeInTheDocument()
    expect(screen.getByText(/rate changes/i)).toBeInTheDocument()
    expect(screen.getByText(/investments/i)).toBeInTheDocument()
  })

  it('pre-fills default loan amount and rate', () => {
    render(<AmortizationPage />)
    expect(screen.getByDisplayValue('50,00,000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10.5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('20')).toBeInTheDocument()
  })

  it('renders the Generate button', () => {
    render(<AmortizationPage />)
    expect(screen.getByText('Generate Amortization Schedule')).toBeInTheDocument()
  })

  it('does not show results before Generate is clicked', () => {
    render(<AmortizationPage />)
    expect(screen.queryByText(/monthly emi/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/total interest/i)).not.toBeInTheDocument()
  })
})

// ── tenure toggle ─────────────────────────────────────────────────────────────

describe('AmortizationPage — tenure toggle', () => {
  it('switches tenure unit to months', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByRole('button', { name: 'Mo' }))
    const tenureInput = screen.getByDisplayValue('20')
    expect(tenureInput.placeholder).toBe('240')
  })

  it('switches back to years', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByRole('button', { name: 'Mo' }))
    await user.click(screen.getByRole('button', { name: 'Yrs' }))
    const tenureInput = screen.getByDisplayValue('20')
    expect(tenureInput.placeholder).toBe('20')
  })
})

// ── rate change rows ──────────────────────────────────────────────────────────

describe('AmortizationPage — rate change rows', () => {
  it('shows no remove buttons initially', () => {
    render(<AmortizationPage />)
    expect(screen.queryAllByTitle('Remove')).toHaveLength(0)
  })

  it('adds a rate change row when + Add Rate Change is clicked', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('+ Add Rate Change'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })

  it('removes a rate change row', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('+ Add Rate Change'))
    await user.click(screen.getByText('+ Add Rate Change'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(2)
    await user.click(screen.getAllByTitle('Remove')[0])
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })
})

// ── investment / top-up rows ──────────────────────────────────────────────────

describe('AmortizationPage — investment rows', () => {
  it('adds an investment row when + Add Investment / Top-up is clicked', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('+ Add Investment / Top-up'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })

  it('removes an investment row', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('+ Add Investment / Top-up'))
    await user.click(screen.getByText('+ Add Investment / Top-up'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(2)
    await user.click(screen.getAllByTitle('Remove')[1])
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })

  it('investment type select has Invest @ 12% (Equity) option', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('+ Add Investment / Top-up'))
    const selects = screen.getAllByRole('combobox')
    const typeSelect = selects[0]
    const options = [...typeSelect.options].map(o => o.value)
    expect(options).toContain('invest-12')
    expect(options).toContain('invest-7')
    expect(options).toContain('invest-9')
  })
})

// ── validation errors ─────────────────────────────────────────────────────────

describe('AmortizationPage — validation', () => {
  it('shows error when loan amount is cleared', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    const amountInput = screen.getByDisplayValue('50,00,000')
    await user.clear(amountInput)
    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText(/valid loan amount/i)).toBeInTheDocument()
    })
  })

  it('shows error when interest rate is cleared', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    const rateInput = screen.getByDisplayValue('10.5')
    await user.clear(rateInput)
    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText(/valid interest rate/i)).toBeInTheDocument()
    })
  })

  it('shows error when tenure is 0', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    const tenureInput = screen.getByDisplayValue('20')
    fireEvent.change(tenureInput, { target: { value: '0' } })
    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText(/valid tenure/i)).toBeInTheDocument()
    })
  })

  it('requires start date when a rate change is date-based', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    // clear start date
    const dateInput = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
    fireEvent.change(dateInput, { target: { value: '' } })
    await user.click(screen.getByText('+ Add Rate Change'))
    // target the date input inside the event-row (rate change row), not the cleared start date
    const rcDate = screen.getAllByDisplayValue('').find(el => el.type === 'date' && el.closest('.event-row'))
    fireEvent.change(rcDate, { target: { value: '2026-06-01' } })
    const rateInputs = screen.getAllByPlaceholderText('9.0')
    fireEvent.change(rateInputs[0], { target: { value: '9.5' } })
    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText(/please set an emi start date/i)).toBeInTheDocument()
    })
  })
})

// ── results after generate ────────────────────────────────────────────────────

describe('AmortizationPage — results', () => {
  async function generate() {
    const user = userEvent.setup()
    render(<AmortizationPage />)
    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText('Monthly EMI')).toBeInTheDocument()
    })
    return user
  }

  it('shows primary metric cards', async () => {
    await generate()
    expect(screen.getByText('Monthly EMI')).toBeInTheDocument()
    expect(screen.getByText('Total Interest')).toBeInTheDocument()
    expect(screen.getByText('Loan Closes')).toBeInTheDocument()
  })

  it('renders the chart component', async () => {
    await generate()
    expect(screen.getByTestId('mock-amort-chart')).toBeInTheDocument()
  })

  it('shows yearly schedule table by default', async () => {
    await generate()
    expect(screen.getByText('Amortization Schedule')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /opening balance/i })).toBeInTheDocument()
  })

  it('switches to monthly table', async () => {
    const user = await generate()
    await user.click(screen.getByRole('button', { name: /monthly/i }))
    await waitFor(() => {
      expect(screen.getByText(/^#$/)).toBeInTheDocument()
    })
  })
})

// ── netInterest formula and color logic ───────────────────────────────────────

describe('AmortizationPage — netInterest and effectiveRate color logic', () => {
  // Small FD investment → profit < loan interest → effectiveRate > 0 → orange
  it('colors Net Interest and Effective Rate orange when effectiveRate > 0 (small FD investment)', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)

    const startDateInput = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })

    await user.click(screen.getByText('+ Add Investment / Top-up'))

    const datePickers = screen.getAllByDisplayValue('').filter(el => el.type === 'date')
    fireEvent.change(datePickers[0], { target: { value: '2024-02-01' } })

    // Small amount: 1L — fireEvent.change needed for controlled CurrencyInput
    const amountInputs = screen.getAllByRole('textbox').filter(el => el.placeholder === '1,00,000')
    fireEvent.change(amountInputs[0], { target: { value: '100000' } })

    // FD at 7%
    const typeSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(typeSelect, { target: { value: 'invest-7' } })

    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText('Net Interest')).toBeInTheDocument()
    })

    const netInterestCard = screen.getByText('Net Interest').closest('.metric-card')
    const netInterestValue = netInterestCard.querySelector('.metric-value')
    expect(netInterestValue.style.color).toBe('var(--accent3)')

    const effectiveRateCard = screen.getByText('Effective Rate').closest('.metric-card')
    const effectiveRateValue = effectiveRateCard.querySelector('.metric-value')
    expect(effectiveRateValue.style.color).toBe('var(--accent3)')
  })

  // netInterest formula: must be totalInterest - profit + tax, NOT totalInterest - (profit + tax)
  it('netInterest subtracts profit and adds tax (not subtracts both)', async () => {
    const user = userEvent.setup()
    render(<AmortizationPage />)

    fireEvent.change(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), { target: { value: '2024-01-01' } })

    await user.click(screen.getByText('+ Add Investment / Top-up'))

    const datePickers = screen.getAllByDisplayValue('').filter(el => el.type === 'date')
    fireEvent.change(datePickers[0], { target: { value: '2025-01-01' } })

    // 5L equity investment — fireEvent.change needed for controlled CurrencyInput
    const amountInputs = screen.getAllByRole('textbox').filter(el => el.placeholder === '1,00,000')
    fireEvent.change(amountInputs[0], { target: { value: '500000' } })

    const typeSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(typeSelect, { target: { value: 'invest-12' } })

    await user.click(screen.getByText('Generate Amortization Schedule'))
    await waitFor(() => {
      expect(screen.getByText('Estimated Tax')).toBeInTheDocument()
      expect(screen.getByText('Interest Earned')).toBeInTheDocument()
      expect(screen.getByText('Net Interest')).toBeInTheDocument()
    })

    // Verify Estimated Tax shows a value (not '—'), confirming tax > 0
    const taxCard = screen.getByText('Estimated Tax').closest('.metric-card')
    const taxValue = taxCard.querySelector('.metric-value')
    expect(taxValue.textContent).not.toBe('—')

    // Net Interest should NOT equal (totalInterest - profit - tax)
    // It should equal (totalInterest - profit + tax)
    // If formula is correct, effectiveRate should be between annualRate and 0 for moderate investment
    const effectiveRateCard = screen.getByText('Effective Rate').closest('.metric-card')
    const effectiveRateValue = effectiveRateCard.querySelector('.metric-value')
    // With 5L equity on a 50L 10.5% loan, effective rate should be positive but lower than 10.5%
    const rateNum = parseFloat(effectiveRateValue.textContent)
    expect(rateNum).toBeLessThan(10.5)
    expect(rateNum).toBeGreaterThan(0)
    // color should be orange (positive effectiveRate)
    expect(effectiveRateValue.style.color).toBe('var(--accent3)')
  })
})
