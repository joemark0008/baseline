import { render, screen } from '@testing-library/react'
import { ResetLinkDialog } from './ResetLinkDialog'

const link = {
  name: 'Bo',
  url: 'https://app/reset-password?token=t',
  expiresAt: '2026-01-02T00:00:00Z',
}

describe('ResetLinkDialog', () => {
  it('says the link was emailed and still shows it once', () => {
    render(<ResetLinkDialog link={{ ...link, emailSent: true }} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Password reset link for Bo' })).toBeInTheDocument()
    expect(screen.getByText(/emailed this link to Bo/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Reset link')).toHaveValue('https://app/reset-password?token=t')
  })

  it('asks the admin to deliver the link when it was not emailed', () => {
    render(<ResetLinkDialog link={{ ...link, emailSent: false }} onClose={vi.fn()} />)
    expect(screen.getByText(/send it to Bo yourself/i)).toBeInTheDocument()
    expect(screen.queryByText(/emailed this link/i)).toBeNull()
  })
})
