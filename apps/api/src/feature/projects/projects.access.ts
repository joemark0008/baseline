import { defineArea } from '../access/define-area.js'

/** Work inside a project is governed by the project role (Manager/Member), not by this grid. */
export const projectsArea = defineArea({
  key: 'projects',
  name: 'Projects',
  actions: {
    view: 'See and open the implementation projects you belong to',
    add: 'Create implementation projects',
    edit: 'Edit the standard implementation template',
  },
})
