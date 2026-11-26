import { defineArea } from '../access/define-area.js'

export const invitesArea = defineArea({
  key: 'invites',
  name: 'Invites',
  actions: {
    view: 'See pending invites',
    add: 'Send invites',
    delete: 'Revoke a pending invite',
  },
})
