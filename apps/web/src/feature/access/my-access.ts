import type { ApolloClient } from '@apollo/client'
import type { Access } from '@/lib/access'
import { gqlClient } from '@/lib/gql-client'
import { MY_ACCESS } from './operations'

/** For route guards: read fresh on every navigation so role changes apply on the next page. */
export async function getAccess(
  client: Pick<ApolloClient, 'query'> = gqlClient,
): Promise<Access | null> {
  try {
    const { data } = await client.query({ query: MY_ACCESS, fetchPolicy: 'network-only' })
    return data?.myAccess ?? null
  } catch {
    return null
  }
}
