import { render, screen } from '@testing-library/react'
import { BrandMark } from './BrandMark'

describe('BrandMark', () => {
  it('renders the wordmark', () => {
    render(<BrandMark />)
    expect(screen.getByTestId('brand-mark')).toHaveTextContent('his-project-planner')
  })
})
