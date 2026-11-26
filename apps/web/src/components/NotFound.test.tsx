import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NotFound } from './NotFound'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

describe('NotFound', () => {
  it('explains what happened and links back to the start', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', '/')
  })
})
