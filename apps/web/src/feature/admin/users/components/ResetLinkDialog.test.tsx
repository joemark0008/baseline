import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetLinkDialog } from './ResetLinkDialog'

describe('ResetLinkDialog', () => {
  const link = {
    name: 'Bo',
    url: 'https://app.example.com/reset-password?token=abc',
    expiresAt: '2026-01-02T15:00:00.000Z',
  }

  it('shows the link once, with its expiry and a copy button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const onClose = vi.fn()
    render(<ResetLinkDialog link={link} onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'Password reset link for Bo' })).toBeTruthy()
    expect(screen.getByDisplayValue(link.url)).toBeTruthy()
    expect(screen.getByText(/Works once, until/)).toBeTruthy()
    expect(screen.getByText(/won't be shown again/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith(link.url)
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalled()
  })
})
