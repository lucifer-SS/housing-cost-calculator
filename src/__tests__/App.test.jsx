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

// Click every "Included" toggle to expand sections (loan, rent, extra expenses — all excluded by default)
function enableAllSections() {
  screen.getAllByText('Included').forEach(btn => fireEvent.click(btn))
}

// Expand only loan and rent (for tests that don't need extra expenses)
function enableLoanAndRent() {
  enableAllSections()
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
    enableLoanAndRent()
    expect(screen.getByDisplayValue('2,00,00,000')).toBeInTheDocument()  // property value
    expect(screen.getByDisplayValue('1,60,00,000')).toBeInTheDocument()  // loan amount
    expect(screen.getByDisplayValue('7.2')).toBeInTheDocument()           // rate (ROI mode default)
    expect(screen.getByDisplayValue('60,000')).toBeInTheDocument()        // monthly rent
  })

  it('pre-fills the two default extra expense events', () => {
    renderAtHousing()
    enableAllSections()
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
    enableLoanAndRent()
    // Default is Rate & Tenure mode — switch to EMI mode first
    fireEvent.click(screen.getByText('EMI & Outstanding'))
    expect(screen.getByDisplayValue('1,26,000')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('7.2')).not.toBeInTheDocument()
    // Switch back to Rate & Tenure
    fireEvent.click(screen.getByText('Rate & Tenure'))
    expect(screen.queryByDisplayValue('1,26,000')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('7.2')).toBeInTheDocument()
  })

  it('switches back to EMI mode, restoring EMI inputs', async () => {
    renderAtHousing()
    enableLoanAndRent()
    // Default is Rate & Tenure mode — switch to EMI & Outstanding
    fireEvent.click(screen.getByText('EMI & Outstanding'))
    expect(screen.getByDisplayValue('1,26,000')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('7.2')).not.toBeInTheDocument()
  })
})

describe('App — extra expenses', () => {
  it('adds a new blank expense row when Add expense is clicked', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableAllSections()
    const removesBefore = screen.getAllByTitle('Remove').length
    await user.click(screen.getByText(/add expense/i))
    expect(screen.getAllByTitle('Remove')).toHaveLength(removesBefore + 1)
  })

  it('removes an expense row when its Remove button is clicked', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableAllSections()
    const removesBefore = screen.getAllByTitle('Remove').length
    await user.click(screen.getAllByTitle('Remove')[0])
    expect(screen.getAllByTitle('Remove')).toHaveLength(removesBefore - 1)
  })
})

describe('App — calculate', () => {
  it('shows XIRR result after clicking Calculate with default values', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableLoanAndRent()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    expect(screen.getByText(/XIRR: \d+\.\d+% per annum/)).toBeInTheDocument()
  })

  it('renders all key result sections', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableLoanAndRent()
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
    // Switch to Actual value mode to expose the valuation date input
    fireEvent.click(screen.getByText('Actual value'))
    // Set valuation date to before purchase date
    const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
    const valuationDateInput = dateInputs[dateInputs.length - 1]
    fireEvent.change(valuationDateInput, { target: { value: '2018-01-01' } })
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() =>
      expect(screen.getByText(/valuation date must be after purchase date/i)).toBeInTheDocument()
    )
  })

  it('recalculates when called a second time, updating results', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableLoanAndRent()
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    const firstXirr = screen.getByText(/XIRR: \d+\.\d+% per annum/).textContent

    // Change annual appreciation and recalculate — triggers a different sale value and XIRR
    fireEvent.change(screen.getByDisplayValue('6'), { target: { value: '12' } })
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => {
      const newXirr = screen.getByText(/XIRR: \d+\.\d+% per annum/).textContent
      expect(newXirr).not.toBe(firstXirr)
    })
  })

  it('Rate & Tenure mode: computes and uses EMI/outstanding in the calculation', async () => {
    const user = userEvent.setup()
    renderAtHousing()
    enableLoanAndRent()
    fireEvent.click(screen.getByText('Rate & Tenure'))
    await user.click(screen.getByText('Calculate Returns'))
    await waitFor(() => expect(screen.getByText(/XIRR:/)).toBeInTheDocument())
    // Should show a result (slightly different from EMI mode due to different defaults)
    expect(screen.getByText(/XIRR: \d+\.\d+% per annum/)).toBeInTheDocument()
  })
})
