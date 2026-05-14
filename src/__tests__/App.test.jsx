import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

// GrowthChart uses canvas which jsdom doesn't support — stub it out
vi.mock('../components/results/GrowthChart', () => ({
  default: () => <div data-testid="mock-chart" />,
}))

// App starts on the home page — navigate to House Investment before testing housing features
function renderAtHousing() {
  render(<App />)
  fireEvent.click(screen.getByText('House Investment'))
}

describe('App — rendering', () => {
  it('renders the header logo', () => {
    render(<App />)
    expect(screen.getByRole('img', { name: /housing cost calculator/i })).toBeInTheDocument()
  })

  it('renders home page tiles', () => {
    render(<App />)
    expect(screen.getByText('House Investment')).toBeInTheDocument()
    expect(screen.getByText('Loan Amortization')).toBeInTheDocument()
  })

  it('renders all four input sections', () => {
    renderAtHousing()
    expect(screen.getByText('Property details')).toBeInTheDocument()
    expect(screen.getByText('Loan details')).toBeInTheDocument()
    expect(screen.getByText('Rent savings')).toBeInTheDocument()
    expect(screen.getByText(/additional cash outflows/i)).toBeInTheDocument()
  })

  it('pre-fills default form values', () => {
    renderAtHousing()
    expect(screen.getByDisplayValue('1,10,00,000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('89,00,000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('75,500')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50,000')).toBeInTheDocument()
  })

  it('pre-fills the two default extra expense events', () => {
    renderAtHousing()
    expect(screen.getByDisplayValue('Registration + Legal fees')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Interiors')).toBeInTheDocument()
  })

  it('does not show results before Calculate is clicked', () => {
    renderAtHousing()
    expect(screen.queryByText(/XIRR:/)).not.toBeInTheDocument()
  })
})

describe('App — loan mode toggle', () => {
  it('switches to Rate & Tenure mode, hiding EMI inputs', async () => {
    renderAtHousing()
    expect(screen.getByDisplayValue('75,500')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Rate & Tenure'))
    expect(screen.queryByDisplayValue('75,500')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('8.5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('240')).toBeInTheDocument()
  })

  it('switches back to EMI mode, restoring EMI inputs', async () => {
    renderAtHousing()
    fireEvent.click(screen.getByText('Rate & Tenure'))
    fireEvent.click(screen.getByText('EMI & Outstanding'))
    expect(screen.getByDisplayValue('75,500')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('8.5')).not.toBeInTheDocument()
  })
})

describe('App — extra expenses', () => {
  it('adds a new blank expense row when Add expense is clicked', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    const removesBefore = screen.getAllByTitle('Remove').length
    await user.click(screen.getByText(/add expense/i))
    expect(screen.getAllByTitle('Remove')).toHaveLength(removesBefore + 1)
  })

  it('removes an expense row when its Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    const removesBefore = screen.getAllByTitle('Remove').length
    await user.click(screen.getAllByTitle('Remove')[0])
    expect(screen.getAllByTitle('Remove')).toHaveLength(removesBefore - 1)
  })
})

describe('App — calculate', () => {
  it('shows XIRR result after clicking Calculate with default values', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    // Default scenario with 10% annual rent increase yields ~6.75% XIRR
    expect(screen.getByText(/XIRR: 6\.\d+% per annum/)).toBeInTheDocument()
  })

  it('renders all key result sections', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    expect(screen.getByText('Your returns')).toBeInTheDocument()
    expect(screen.getByText('Cash outflow breakdown')).toBeInTheDocument()
    expect(screen.getByText('Loan snapshot')).toBeInTheDocument()
    expect(screen.getByText('How you compare')).toBeInTheDocument()
    expect(screen.getByText('Full cash flow ledger')).toBeInTheDocument()
  })

  it('shows Net profit row in cash outflow breakdown', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText('Net profit')).toBeInTheDocument())
  })

  it('shows error when valuation date is before purchase date', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    // Set valuation date to before purchase date
    fireEvent.change(screen.getByDisplayValue('2026-05-01'), { target: { value: '2018-01-01' } })
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() =>
      expect(screen.getByText(/valuation date must be after purchase date/i)).toBeInTheDocument()
    )
  })

  it('recalculates when called a second time, updating results', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    const firstXirr = screen.getByText(/XIRR: \d+\.\d+% per annum/).textContent

    // Change current value and recalculate
    fireEvent.change(screen.getByDisplayValue('1,80,00,000'), { target: { value: '22000000' } })
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => {
      const newXirr = screen.getByText(/XIRR: \d+\.\d+% per annum/).textContent
      expect(newXirr).not.toBe(firstXirr)
    })
  })

  it('Rate & Tenure mode: computes and uses EMI/outstanding in the calculation', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    fireEvent.click(screen.getByText('Rate & Tenure'))
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    // Should show a result (slightly different from EMI mode due to different defaults)
    expect(screen.getByText(/XIRR: \d+\.\d+% per annum/)).toBeInTheDocument()
  })
})
