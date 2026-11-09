import { useEffect, useState } from 'react'

export type Route = 'live' | 'today'

function readRoute(): Route {
  return window.location.hash === '#/today' ? 'today' : 'live'
}

// Two pages, picked by the part of the address after #. Hash links work on the Pi
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
