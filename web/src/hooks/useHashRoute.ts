import { useEffect, useState } from 'react'

export type Route = 'live' | 'today' | 'history'

function readRoute(): Route {
  if (window.location.hash === '#/today') return 'today'
  if (window.location.hash === '#/history') return 'history'
  return 'live'
}

// The pages, picked by the part of the address after #. Hash links work on the Pi
// without any server setup, and the back button works too.
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  return route
}
