import { useMutation, useQuery } from '@apollo/client/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from './ChangePasswordForm'
import { CHANGE_PASSWORD, MY_ACCOUNT } from './operations'

/** Shown only when the server says you have a password to change. */
export function ChangePasswordCard() {
  const { data } = useQuery(MY_ACCOUNT)
  const [changePassword] = useMutation(CHANGE_PASSWORD)
  if (!data?.me.can.changePassword) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>You stay signed in here; other devices are signed out.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm
          policy={data.passwordPolicy}
          onSubmit={async (currentPassword, newPassword) => {
            try {
              await changePassword({ variables: { input: { currentPassword, newPassword } } })
              return null
            } catch (e) {
              return e instanceof Error ? e.message : 'Could not change the password'
            }
          }}
        />
      </CardContent>
    </Card>
  )
}
