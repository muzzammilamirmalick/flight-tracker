import { useEffect, useRef, useState } from 'react'

// Animates a number from where it was to `target`. With reduced motion it just shows the value.
export function useCountUp(target: number, reducedMotion: boolean, durationMs = 1200): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) return

    const from = fromRef.current
    const start = performance.now()
    let frame = 0

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      const current = Math.round(from + (target - from) * eased)
      fromRef.current = current
      setValue(current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reducedMotion, durationMs])

  return reducedMotion ? target : value
}
