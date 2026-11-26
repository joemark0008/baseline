type Client = { query: ReturnType<typeof vi.fn> }

/** Fresh module per test: the "complete" cache is module state. */
async function load() {
  vi.resetModules()
  return import('./setup-status')
}

const statusResponse = (setupComplete: boolean) => ({
  data: { setupStatus: { setupComplete, minPasswordLength: 8 } },
})

describe('getSetupComplete', () => {
  it('returns the server flag', async () => {
    const { getSetupComplete } = await load()
    const client: Client = { query: vi.fn().mockResolvedValue(statusResponse(false)) }
    expect(await getSetupComplete(client as never)).toBe(false)
  })

  it('treats a failed lookup as complete', async () => {
    const { getSetupComplete } = await load()
    const client: Client = { query: vi.fn().mockRejectedValue(new Error('offline')) }
    expect(await getSetupComplete(client as never)).toBe(true)
  })

  it('caches complete once seen', async () => {
    const { getSetupComplete } = await load()
    const client: Client = { query: vi.fn().mockResolvedValue(statusResponse(true)) }
    expect(await getSetupComplete(client as never)).toBe(true)
    expect(await getSetupComplete(client as never)).toBe(true)
    expect(client.query).toHaveBeenCalledTimes(1)
  })
})
