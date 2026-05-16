import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RentInvestmentPage from '../../../components/rentinvestment/RentInvestmentPage'

// Chart.js canvas not supported in jsdom
vi.mock('../../../components/rentinvestment/RentInvestmentChart', () => ({
  default: () => <div data-testid="mock-ri-chart" />,
}))

// ── rendering ────────────────────────────────────────────────────────────────

describe('RentInvestmentPage — rendering', () => {
  it('renders all four section labels', () => {
    render(<RentInvestmentPage />)
    expect(screen.getByText(/investment setup/i)).toBeInTheDocument()
    expect(screen.getByText(/monthly flows/i)).toBeInTheDocument()
    expect(screen.getByText(/rent details/i)).toBeInTheDocument()
    expect(screen.getByText(/additional lump sums/i)).toBeInTheDocument()
  })

  it('pre-fills default form values', () => {
    render(<RentInvestmentPage />)
    expect(screen.getByDisplayValue('40,00,000')).toBeInTheDocument()   // down payment
    expect(screen.getByDisplayValue('1,25,976')).toBeInTheDocument()    // est. EMI
    expect(screen.getByDisplayValue('60,000')).toBeInTheDocument()      // monthly rent
    expect(screen.getByDisplayValue('20')).toBeInTheDocument()          // tenure
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()          // rent increase
  })

  it('renders the investment option select with Equity as default', () => {
    render(<RentInvestmentPage />)
    const select = screen.getAllByRole('combobox')[0]
    expect(select.value).toBe('equity-12')
  })

  it('renders the Calculate button', () => {
    render(<RentInvestmentPage />)
    expect(screen.getByText('Calculate Wealth Growth')).toBeInTheDocument()
  })

  it('does not show results before Calculate is clicked', () => {
    render(<RentInvestmentPage />)
    expect(screen.queryByText(/final corpus/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/xirr/i)).not.toBeInTheDocument()
  })
})

// ── live SIP/SWP preview ─────────────────────────────────────────────────────

describe('RentInvestmentPage — SIP/SWP preview', () => {
  it('shows Starting monthly SIP when EMI > rent', () => {
    render(<RentInvestmentPage />)
    // default: EMI 1,25,976 > rent 60,000 → SIP 65,976
    expect(screen.getByText(/starting monthly sip/i)).toBeInTheDocument()
    expect(screen.getByText('₹65,976')).toBeInTheDocument()
  })

  it('shows Starting monthly SWP when rent > EMI', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    // Change rent to 1,50,000 (> default EMI 1,25,976)
    const rentInput = screen.getByDisplayValue('60,000')
    await user.clear(rentInput)
    await user.type(rentInput, '150000')
    await waitFor(() => {
      expect(screen.getByText(/starting monthly swp/i)).toBeInTheDocument()
    })
  })
})

// ── lump sum rows ─────────────────────────────────────────────────────────────

describe('RentInvestmentPage — lump sum rows', () => {
  it('shows no remove buttons initially', () => {
    render(<RentInvestmentPage />)
    expect(screen.queryAllByTitle('Remove')).toHaveLength(0)
  })

  it('adds a lump sum row when + Add Lump Sum is clicked', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    await user.click(screen.getByText('+ Add Lump Sum'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })

  it('removes a row when its Remove button is clicked', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    await user.click(screen.getByText('+ Add Lump Sum'))
    await user.click(screen.getByText('+ Add Lump Sum'))
    expect(screen.getAllByTitle('Remove')).toHaveLength(2)
    await user.click(screen.getAllByTitle('Remove')[0])
    expect(screen.getAllByTitle('Remove')).toHaveLength(1)
  })
})

// ── validation errors ────────────────────────────────────────────────────────

describe('RentInvestmentPage — validation', () => {
  it('shows an error when down payment is cleared', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    const dpInput = screen.getByDisplayValue('40,00,000')
    await user.clear(dpInput)
    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getByText(/valid down payment/i)).toBeInTheDocument()
    })
  })

  it('shows an error when EMI is cleared', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    const emiInput = screen.getByDisplayValue('1,25,976')
    await user.clear(emiInput)
    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getByText(/valid estimated monthly emi/i)).toBeInTheDocument()
    })
  })

  it('shows an error when tenure is 0', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    const tenureInput = screen.getByDisplayValue('20')
    fireEvent.change(tenureInput, { target: { value: '0' } })
    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getByText(/valid tenure/i)).toBeInTheDocument()
    })
  })

  it('requires start date when a lump sum with a date is added', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    // Clear the pre-filled start date so validation triggers
    const startDateInput = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
    fireEvent.change(startDateInput, { target: { value: '' } })
    await user.click(screen.getByText('+ Add Lump Sum'))
    // Now the only empty date input is the lump sum date
    const lsDateInput = screen.getAllByDisplayValue('').find(el => el.type === 'date' && el !== startDateInput)
    fireEvent.change(lsDateInput, { target: { value: '2026-06-01' } })
    const amtInputs = screen.getAllByRole('textbox').filter(el => el.placeholder === '1,00,000')
    if (amtInputs.length > 0) fireEvent.change(amtInputs[0], { target: { value: '100000' } })
    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getByText(/please set a start date/i)).toBeInTheDocument()
    })
  })
})

// ── results after calculate ───────────────────────────────────────────────────

describe('RentInvestmentPage — results', () => {
  async function calculate() {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getByText(/final corpus/i)).toBeInTheDocument()
    })
    return user
  }

  it('shows all four primary metric card labels', async () => {
    await calculate()
    expect(screen.getByText('Starting Monthly SIP')).toBeInTheDocument()
    expect(screen.getByText(/final corpus/i)).toBeInTheDocument()
    expect(screen.getByText(/total invested/i)).toBeInTheDocument()
    expect(screen.getByText(/xirr/i)).toBeInTheDocument()
  })

  it('shows second-row metric cards (rent, sip, profit)', async () => {
    await calculate()
    expect(screen.getByText(/total rent paid/i)).toBeInTheDocument()
    expect(screen.getByText(/total sip in/i)).toBeInTheDocument()
    expect(screen.getByText(/profit \/ loss/i)).toBeInTheDocument()
  })

  it('renders the chart component', async () => {
    await calculate()
    expect(screen.getByTestId('mock-ri-chart')).toBeInTheDocument()
  })

  it('shows the yearly schedule table by default', async () => {
    await calculate()
    expect(screen.getByText(/wealth schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/opening corpus/i)).toBeInTheDocument()
    expect(screen.getByText(/closing corpus/i)).toBeInTheDocument()
  })

  it('switches to monthly table when Monthly button is clicked', async () => {
    const user = await calculate()
    await user.click(screen.getByRole('button', { name: /monthly/i }))
    await waitFor(() => {
      expect(screen.getByText(/^#$/)).toBeInTheDocument()
    })
  })

  it('XIRR is a finite percentage', async () => {
    await calculate()
    const xirrEl = screen.getByText(/\d+\.\d+%/)
    expect(xirrEl).toBeInTheDocument()
  })

  it('does not show depletion warning in default SIP scenario', async () => {
    await calculate()
    expect(screen.queryByText(/corpus fully depleted/i)).not.toBeInTheDocument()
  })
})

// ── depletion warning ─────────────────────────────────────────────────────────

describe('RentInvestmentPage — depletion warning', () => {
  it('shows depletion warning when corpus runs out (tiny DP, huge rent)', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)

    // Set tiny down payment
    const dpInput = screen.getByDisplayValue('40,00,000')
    await user.clear(dpInput)
    await user.type(dpInput, '1000')

    // Set rent far above EMI
    const rentInput = screen.getByDisplayValue('60,000')
    await user.clear(rentInput)
    await user.type(rentInput, '500000')

    await user.click(screen.getByText('Calculate Wealth Growth'))
    await waitFor(() => {
      expect(screen.getAllByText(/corpus fully depleted/i)[0]).toBeInTheDocument()
    })
  })
})

// ── tenure toggle ─────────────────────────────────────────────────────────────

describe('RentInvestmentPage — tenure toggle', () => {
  it('switches tenure unit to months', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    await user.click(screen.getByRole('button', { name: 'Mo' }))
    const tenureInput = screen.getByDisplayValue('20')
    expect(tenureInput.placeholder).toBe('240')
  })

  it('switches back to years', async () => {
    const user = userEvent.setup()
    render(<RentInvestmentPage />)
    await user.click(screen.getByRole('button', { name: 'Mo' }))
    await user.click(screen.getByRole('button', { name: 'Yrs' }))
    const tenureInput = screen.getByDisplayValue('20')
    expect(tenureInput.placeholder).toBe('20')
  })
})
