import { defineArea } from '../access/define-area.js'

export const rolesArea = defineArea({
  key: 'roles',
  name: 'Roles',
  actions: {
    view: 'See roles and the access history',
    add: 'Create roles',
    edit: 'Change roles and which role a person has',
    delete: 'Delete roles nobody uses',
  },
})
