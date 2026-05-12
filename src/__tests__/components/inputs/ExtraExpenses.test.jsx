import { render, screen, fireEvent } from '@testing-library/react'
import ExtraExpenses from '../../../components/inputs/ExtraExpenses'

const defaultEvents = [
  { id: 1, label: 'Registration + Legal fees', date: '2021-05-01', amount: '800000' },
  { id: 2, label: 'Interiors', date: '2022-12-01', amount: '1300000' },
]

describe('ExtraExpenses', () => {
  it('renders all existing event rows', () => {
    render(<ExtraExpenses events={defaultEvents} onAdd={vi.fn()} onRemove={vi.fn()} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Registration + Legal fees')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Interiors')).toBeInTheDocument()
  })

  it('renders the correct number of remove buttons', () => {
    render(<ExtraExpenses events={defaultEvents} onAdd={vi.fn()} onRemove={vi.fn()} onChange={vi.fn()} />)
    expect(screen.getAllByTitle('Remove')).toHaveLength(2)
  })

  it('calls onAdd when the Add expense button is clicked', () => {
    const onAdd = vi.fn()
    render(<ExtraExpenses events={[]} onAdd={onAdd} onRemove={vi.fn()} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText(/add expense/i))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('calls onRemove with the correct id when a remove button is clicked', () => {
    const onRemove = vi.fn()
    render(<ExtraExpenses events={defaultEvents} onAdd={vi.fn()} onRemove={onRemove} onChange={vi.fn()} />)
    fireEvent.click(screen.getAllByTitle('Remove')[0])
    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('calls onChange when a label input changes', () => {
    const onChange = vi.fn()
    render(<ExtraExpenses events={defaultEvents} onAdd={vi.fn()} onRemove={vi.fn()} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('Interiors'), { target: { value: 'Renovation' } })
    expect(onChange).toHaveBeenCalledWith(2, 'label', 'Renovation')
  })

  it('calls onChange when an amount input changes', () => {
    const onChange = vi.fn()
    render(<ExtraExpenses events={defaultEvents} onAdd={vi.fn()} onRemove={vi.fn()} onChange={onChange} />)
    fireEvent.change(screen.getByDisplayValue('1300000'), { target: { value: '1500000' } })
    expect(onChange).toHaveBeenCalledWith(2, 'amount', '1500000')
  })

  it('renders empty state with just the add button', () => {
    render(<ExtraExpenses events={[]} onAdd={vi.fn()} onRemove={vi.fn()} onChange={vi.fn()} />)
    expect(screen.queryAllByTitle('Remove')).toHaveLength(0)
    expect(screen.getByText(/add expense/i)).toBeInTheDocument()
  })
})
