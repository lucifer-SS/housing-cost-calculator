import { render, screen } from '@testing-library/react'
import Header from '../../components/Header'

describe('Header', () => {
  it('renders the logo image with correct alt text', () => {
    render(<Header />)
    expect(screen.getByRole('img', { name: /housing cost calculator/i })).toBeInTheDocument()
  })

  it('renders the logo at the correct height', () => {
    render(<Header />)
    expect(screen.getByRole('img')).toHaveAttribute('height', '44')
  })

  it('renders the badge text', () => {
    render(<Header />)
    expect(screen.getByText('XIRR · CAGR · Amortisation')).toBeInTheDocument()
  })
})
