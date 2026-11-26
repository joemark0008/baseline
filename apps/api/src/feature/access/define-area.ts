import { ACTIONS, type Action } from './actions.js'

/**
 * A protectable part of the app, declared by the feature that owns it (`<feature>.access.ts`).
 * `actions` maps each action the area offers to a one-line description shown in the roles grid;
 * an action left out is "not used" for this area.
 */
export interface AreaDef<K extends string = string> {
  key: K
  name: string
  actions: Partial<Record<Action, string>>
}

const KEY_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export function defineArea<const K extends string>(def: AreaDef<K>): Readonly<AreaDef<K>> {
  if (!KEY_PATTERN.test(def.key)) throw new Error(`Area key "${def.key}" must be kebab-case`)
  const offered = ACTIONS.filter((a) => def.actions[a] !== undefined)
  if (offered.length === 0) throw new Error(`Area "${def.key}" must offer at least one action`)
  for (const a of offered) {
    if (!def.actions[a]?.trim()) throw new Error(`Area "${def.key}" needs a description for ${a}`)
  }
  return Object.freeze({ ...def, actions: Object.freeze({ ...def.actions }) })
}
