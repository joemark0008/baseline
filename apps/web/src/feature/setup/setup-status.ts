import type { ApolloClient } from '@apollo/client'
import { gqlClient } from '@/lib/gql-client'
import { SETUP_STATUS } from './operations'

/** Setup never reopens, so once it is complete we stop asking. */
let knownComplete = false

/**
 * For route guards: is first-run setup done? A failed lookup counts as done, so an unreachable
 * API sends people to /login (which shows the real error) instead of looping on /setup.
 */
export async function getSetupComplete(
  client: Pick<ApolloClient, 'query'> = gqlClient,
): Promise<boolean> {
  if (knownComplete) return true
  try {
    const { data } = await client.query({ query: SETUP_STATUS, fetchPolicy: 'network-only' })
    knownComplete = data?.setupStatus.setupComplete ?? true
  } catch {
    return true
  }
  return knownComplete
}
