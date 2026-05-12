import { render, screen } from '@testing-library/react'
import InfoTip from '../../../components/shared/InfoTip'

describe('InfoTip', () => {
  it('renders the i badge', () => {
    render(<InfoTip tip="Some tooltip text" />)
    expect(screen.getByText('i')).toBeInTheDocument()
  })

  it('carries the correct data-tip attribute', () => {
    render(<InfoTip tip="Loan balance as per bank statement at valuation date" />)
    expect(screen.getByText('i')).toHaveAttribute(
      'data-tip',
      'Loan balance as per bank statement at valuation date'
    )
  })

  it('applies the info-tip class', () => {
    render(<InfoTip tip="test" />)
    expect(screen.getByText('i')).toHaveClass('info-tip')
  })
})
