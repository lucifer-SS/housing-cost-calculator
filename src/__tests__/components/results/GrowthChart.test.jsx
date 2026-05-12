import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock chart.js before importing the component.
// Must use a regular function (not arrow) so it works with `new Chart(...)`.
vi.mock('chart.js/auto', () => ({
  Chart: vi.fn(function () {
    this.destroy = vi.fn()
    this.update = vi.fn()
  }),
}))

import GrowthChart from '../../../components/results/GrowthChart'
import { Chart } from 'chart.js/auto'

const chartData = {
  labels: ['May 2019', 'Aug 2019', 'Nov 2019'],
  cumOutflow: [2100000, 2327000, 2554000],
  propValue:  [11000000, 11214285, 11428571],
}

describe('GrowthChart', () => {
  beforeEach(() => {
    Chart.mockClear()
  })

  it('renders a canvas element', () => {
    const { container } = render(<GrowthChart chartData={chartData} />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('instantiates Chart.js with the provided data', () => {
    render(<GrowthChart chartData={chartData} />)
    expect(Chart).toHaveBeenCalledOnce()
    const [, config] = Chart.mock.calls[0]
    expect(config.type).toBe('line')
    expect(config.data.labels).toEqual(chartData.labels)
    expect(config.data.datasets).toHaveLength(2)
  })

  it('destroys the chart instance on unmount', () => {
    const destroyMock = vi.fn()
    Chart.mockImplementationOnce(function () { this.destroy = destroyMock; this.update = vi.fn() })
    const { unmount } = render(<GrowthChart chartData={chartData} />)
    unmount()
    expect(destroyMock).toHaveBeenCalled()
  })

  it('renders nothing when chartData is null', () => {
    const { container } = render(<GrowthChart chartData={null} />)
    expect(Chart).not.toHaveBeenCalled()
    // canvas still in DOM but Chart not instantiated
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
