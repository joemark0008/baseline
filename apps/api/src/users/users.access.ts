import { defineArea } from '../access/define-area.js'

/** People join by invite, so Users offers no "add". */
export const usersArea = defineArea({
  key: 'users',
  name: 'Users',
  actions: {
    view: 'See the user list',
    edit: "Change a person's name and username",
    delete: 'Deactivate a person (signs them out and blocks sign-in)',
  },
})
