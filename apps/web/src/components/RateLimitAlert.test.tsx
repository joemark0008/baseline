import { render, screen } from '@testing-library/react'
import { RateLimitAlert } from './RateLimitAlert'

describe('RateLimitAlert', () => {
  it('tells the person how long to wait', () => {
    render(<RateLimitAlert seconds={30} />)
    expect(screen.getByRole('alert').textContent).toContain('Try again in 30 seconds.')
  })
})
