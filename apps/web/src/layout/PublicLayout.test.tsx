import { render, screen } from '@testing-library/react'
import { PublicLayout } from './PublicLayout'

vi.mock('@tanstack/react-router', () => ({ Outlet: () => <p>routed page</p> }))

describe('PublicLayout', () => {
  it('frames the routed page with the brand', () => {
    render(<PublicLayout />)
    expect(screen.getByTestId('brand-mark')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('routed page')
  })

  it('frames given children instead of the outlet', () => {
    render(<PublicLayout>a not-found message</PublicLayout>)
    expect(screen.getByRole('main')).toHaveTextContent('a not-found message')
  })
})
