import { ApolloProvider } from '@apollo/client/react'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getAccess } from './feature/access/my-access'
import { getSetupComplete } from './feature/setup/setup-status'
import { getSession } from './lib/auth-client'
import { gqlClient } from './lib/gql-client'
import { routeTree } from './routeTree.gen'
import './styles/app.css'

const router = createRouter({
  routeTree,
  context: { getSession, getSetupComplete, getAccess },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={gqlClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </StrictMode>,
)
