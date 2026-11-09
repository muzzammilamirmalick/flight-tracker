import { useState } from 'react'
import { nearestAngle } from '../lib/geo'

// Turns a compass angle (0 to 360) into one that never jumps, so a CSS or Motion
// rotation from 350 to 10 turns 20 degrees forward instead of 340 degrees back.
export function useContinuousAngle(angle: number | null): number {
  const [state, setState] = useState({ input: angle, output: angle ?? 0 })

  // Update during render when the input changes (React's "adjust state on prop change" pattern).
  if (angle !== null && angle !== state.input) {
    setState({ input: angle, output: nearestAngle(state.output, angle) })
  }

  return state.output
}
