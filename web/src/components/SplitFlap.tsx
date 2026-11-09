import { useState } from 'react'
import styles from './SplitFlap.module.css'

interface SplitFlapCharProps {
  char: string
  reducedMotion: boolean
}

// One character on the board. When it changes, the top half of the old character folds down
// and the bottom half of the new one swings into place, like an airport departure board.
function SplitFlapChar({ char, reducedMotion }: SplitFlapCharProps) {
  const [state, setState] = useState({ shown: char, previous: char, flips: 0 })

  // A new character arrived: start a flip (React's "adjust state on prop change" pattern).
  if (char !== state.shown) {
    setState({ shown: char, previous: reducedMotion ? char : state.shown, flips: state.flips + 1 })
  }

  const flipping = state.previous !== state.shown

  return (
    <span className={styles.char}>
      <span className={styles.top}>
        <span className={styles.glyph}>{state.shown}</span>
      </span>
      <span className={styles.bottom}>
        <span className={styles.glyph}>{flipping ? state.previous : state.shown}</span>
      </span>

      {flipping && (
        <>
          <span key={`top-${state.flips}`} className={`${styles.top} ${styles.flipTop}`}>
            <span className={styles.glyph}>{state.previous}</span>
          </span>
          <span
            key={`bottom-${state.flips}`}
            className={`${styles.bottom} ${styles.flipBottom}`}
            onAnimationEnd={() => setState((current) => ({ ...current, previous: current.shown }))}
          >
            <span className={styles.glyph}>{state.shown}</span>
          </span>
        </>
      )}
    </span>
  )
}

interface SplitFlapTextProps {
  text: string
  length: number
  align?: 'left' | 'right'
  reducedMotion: boolean
}

// A fixed-width row of flaps. Text is padded with spaces so the columns line up.
export function SplitFlapText({ text, length, align = 'left', reducedMotion }: SplitFlapTextProps) {
  const clipped = text.toUpperCase().slice(0, length)
  const padded = align === 'right' ? clipped.padStart(length) : clipped.padEnd(length)

  return (
    <span className={styles.text} aria-hidden="true">
      {Array.from(padded, (char, i) => (
        <SplitFlapChar key={i} char={char} reducedMotion={reducedMotion} />
      ))}
    </span>
  )
}
