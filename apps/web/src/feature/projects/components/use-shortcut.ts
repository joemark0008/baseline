import { useEffect } from 'react'

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** True while the person is typing or a dialog is open, when shortcuts must stay silent (FR-017). */
export function shortcutsSuspended(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null
  if (el && (EDITABLE.has(el.tagName) || el.isContentEditable)) return true
  return (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    ) !== null
  )
}

/** A single-key shortcut (no modifiers) on the document, e.g. `n` to focus quick-add. */
export function useShortcut(key: string, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (shortcutsSuspended(e.target)) return
      e.preventDefault()
      handler()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}
