import { AuthPasswords, type AuthContextLike } from './auth-passwords.js'

type Account = { id: string; userId: string; providerId: string; password?: string | null }

/** A stand-in for Better Auth's `$context`: a reversible "hasher" and in-memory tables. */
function fakeContext(accounts: Account[], sessions: { token: string; userId: string }[]) {
  const ctx = {
    password: {
      hash: vi.fn(async (pw: string) => `hashed:${pw}`),
      verify: vi.fn(
        async ({ hash, password }: { hash: string; password: string }) =>
          hash === `hashed:${password}`,
      ),
    },
    internalAdapter: {
      findAccounts: vi.fn(async (userId: string) => accounts.filter((a) => a.userId === userId)),
      updatePassword: vi.fn(async (userId: string, password: string) => {
        for (const a of accounts)
          if (a.userId === userId && a.providerId === 'credential') a.password = password
      }),
      linkAccount: vi.fn(async (a: Omit<Account, 'id'>) => {
        const row = { ...a, id: `acc-${accounts.length}` }
        accounts.push(row)
        return row
      }),
      deleteUserSessions: vi.fn(async (userId: string) => {
        sessions.splice(0, sessions.length, ...sessions.filter((s) => s.userId !== userId))
      }),
      listSessions: vi.fn(async (userId: string) => sessions.filter((s) => s.userId === userId)),
      deleteSessions: vi.fn(async (tokens: string[]) => {
        sessions.splice(0, sessions.length, ...sessions.filter((s) => !tokens.includes(s.token)))
      }),
    },
  }
  return ctx
}

describe('AuthPasswords', () => {
  const make = (accounts: Account[] = [], sessions: { token: string; userId: string }[] = []) => {
    const ctx = fakeContext(accounts, sessions)
    return {
      ctx,
      accounts,
      sessions,
      port: new AuthPasswords(Promise.resolve(ctx as unknown as AuthContextLike)),
    }
  }

  it("sets a password with Better Auth's hasher on the credential account", async () => {
    const t = make([{ id: 'a1', userId: 'u1', providerId: 'credential', password: 'hashed:old' }])
    await t.port.setPassword('u1', 'new-password')
    expect(t.ctx.password.hash).toHaveBeenCalledWith('new-password')
    expect(t.ctx.internalAdapter.updatePassword).toHaveBeenCalledWith('u1', 'hashed:new-password')
    expect(t.ctx.internalAdapter.linkAccount).not.toHaveBeenCalled()
  })

  it('links a credential account for someone who only signs in with Google', async () => {
    const t = make([{ id: 'g1', userId: 'u1', providerId: 'google' }])
    expect(await t.port.hasPassword('u1')).toBe(false)
    await t.port.setPassword('u1', 'first-password')
    expect(t.ctx.internalAdapter.linkAccount).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'u1',
      providerId: 'credential',
      password: 'hashed:first-password',
    })
    expect(await t.port.hasPassword('u1')).toBe(true)
  })

  it('verifies a password, and refuses a wrong one or a missing one', async () => {
    const t = make([
      { id: 'a1', userId: 'u1', providerId: 'credential', password: 'hashed:right' },
      { id: 'g2', userId: 'u2', providerId: 'google' },
    ])
    expect(await t.port.verify('u1', 'right')).toBe(true)
    expect(await t.port.verify('u1', 'wrong')).toBe(false)
    expect(await t.port.verify('u2', 'anything')).toBe(false)
  })

  it("signs a person out everywhere through Better Auth's session store", async () => {
    const t = make(
      [],
      [
        { token: 's1', userId: 'u1' },
        { token: 's2', userId: 'u1' },
        { token: 's3', userId: 'u2' },
      ],
    )
    await t.port.signOutEverywhere('u1')
    expect(t.ctx.internalAdapter.deleteUserSessions).toHaveBeenCalledWith('u1')
    expect(t.sessions.map((s) => s.token)).toEqual(['s3'])
  })

  it('signs a person out everywhere except the session they are using', async () => {
    const t = make(
      [],
      [
        { token: 's1', userId: 'u1' },
        { token: 'keep', userId: 'u1' },
        { token: 's3', userId: 'u2' },
      ],
    )
    await t.port.signOutOthers('u1', 'keep')
    expect(t.sessions.map((s) => s.token)).toEqual(['keep', 's3'])
  })
})
