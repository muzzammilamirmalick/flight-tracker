import { useEffect, useRef, useState } from 'react'

// Returns `value`, but changes at most once every `intervalMs`. The latest value always shows up in the end.
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [shown, setShown] = useState(value)
  const lastUpdate = useRef(0)

  useEffect(() => {
    const wait = Math.max(0, lastUpdate.current + intervalMs - Date.now())
    const timer = window.setTimeout(() => {
      lastUpdate.current = Date.now()
      setShown(value)
    }, wait)
    return () => window.clearTimeout(timer)
  }, [value, intervalMs])

  return shown
}
