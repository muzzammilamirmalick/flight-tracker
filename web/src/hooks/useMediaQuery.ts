import { useSyncExternalStore } from 'react'

// True while the media query matches, and updates when the window is resized.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

export const PHONE_QUERY = '(max-width: 899px)'
