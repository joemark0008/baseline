import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReadabilityProvider, useReadability } from './readability'
import { readViewPreference, writeViewPreference } from './view-preferences'

function Probe() {
  const r = useReadability()
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({
          showDone: r.showDone,
          layout: r.layout,
          ph1: r.isCollapsed('ph1'),
          ph2: r.isCollapsed('ph2'),
        })}
      </output>
      <button onClick={() => r.toggle('ph1')}>toggle</button>
      <button onClick={() => r.collapseAll(['ph1', 'ph2'])}>all</button>
      <button onClick={() => r.expandAll()}>none</button>
      <button onClick={() => r.setShowDone(!r.showDone)}>done</button>
      <button onClick={() => r.setLayout(r.layout === 'lanes' ? 'columns' : 'lanes')}>lanes</button>
    </div>
  )
}

const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const mount = (projectId: string) =>
  render(
    <ReadabilityProvider key={projectId} projectId={projectId} phaseIds={['ph1', 'ph2']}>
      <Probe />
    </ReadabilityProvider>,
  )

describe('useReadability (feature 011)', () => {
  beforeEach(() => localStorage.clear())

  it('reads the stored preference on mount and writes every change through', async () => {
    writeViewPreference('p1', { showDone: true, collapsed: ['ph2'] })
    mount('p1')
    expect(state()).toEqual({ showDone: true, layout: 'columns', ph1: false, ph2: true })
    const user = userEvent.setup()
    await user.click(screen.getByText('toggle'))
    expect(state().ph1).toBe(true)
    await user.click(screen.getByText('toggle'))
    expect(state().ph1).toBe(false)
    await user.click(screen.getByText('all'))
    expect(state()).toMatchObject({ ph1: true, ph2: true })
    await user.click(screen.getByText('none'))
    expect(state()).toMatchObject({ ph1: false, ph2: false })
    await user.click(screen.getByText('done'))
    await user.click(screen.getByText('lanes'))
    expect(readViewPreference('p1')).toMatchObject({
      showDone: false,
      collapsed: [],
      boardLayout: 'lanes',
    })
  })

  it('keeps each project on its own stored values and survives a remount', async () => {
    const first = mount('p1')
    await userEvent.setup().click(screen.getByText('toggle'))
    expect(state().ph1).toBe(true)
    first.unmount()
    mount('p2')
    expect(state().ph1).toBe(false)
    act(() => {})
    screen.getByTestId('state').remove()
    mount('p1')
    expect(state().ph1).toBe(true)
  })

  it('drops folded phases that left the plan', () => {
    writeViewPreference('p1', { collapsed: ['ph1', 'gone'] })
    mount('p1')
    expect(state().ph1).toBe(true)
    expect(readViewPreference('p1')).toMatchObject({ collapsed: ['ph1', 'gone'] })
    act(() => screen.getByText('toggle').click())
    expect(readViewPreference('p1')).toMatchObject({ collapsed: [] })
  })

  it('is inert without a provider', () => {
    render(<Probe />)
    expect(state()).toEqual({ showDone: false, layout: 'columns', ph1: false, ph2: false })
  })
})
