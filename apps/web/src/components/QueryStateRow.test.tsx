import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { QueryStateRow } from './QueryStateRow'

const base: ComponentProps<typeof QueryStateRow> = {
  colSpan: 3,
  loading: false,
  error: null,
  isEmpty: false,
  emptyMessage: 'Nothing here yet.',
}

function renderRow(props: Partial<ComponentProps<typeof QueryStateRow>>) {
  return render(
    <table>
      <tbody>
        <QueryStateRow {...base} {...props} />
      </tbody>
    </table>,
  )
}

describe('QueryStateRow', () => {
  it('shows the error as an alert, ahead of loading and empty', () => {
    renderRow({ error: 'Network down', loading: true, isEmpty: true })
    expect(screen.getByRole('alert').textContent).toContain('Network down')
    expect(screen.queryByText('Loading…')).toBeNull()
    expect(screen.queryByText('Nothing here yet.')).toBeNull()
  })

  it('shows loading ahead of empty', () => {
    renderRow({ loading: true, isEmpty: true })
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(screen.queryByText('Nothing here yet.')).toBeNull()
  })

  it('shows the empty message when the data has no rows', () => {
    renderRow({ isEmpty: true })
    expect(screen.getByText('Nothing here yet.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('spans the given number of columns', () => {
    renderRow({ isEmpty: true, colSpan: 5 })
    expect(screen.getByRole('cell').getAttribute('colspan')).toBe('5')
  })

  it('renders nothing when there is data to show', () => {
    renderRow({})
    expect(screen.queryByRole('row')).toBeNull()
  })
})
