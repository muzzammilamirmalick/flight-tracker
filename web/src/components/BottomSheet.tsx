import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  // Always visible at the bottom of the screen.
  peek: ReactNode
  // Shown when the sheet is pulled up.
  children: ReactNode
  label: string
  reducedMotion: boolean
}

// How far (px) or how fast (px per second) you have to swipe before the sheet snaps open or closed.
const SNAP_DISTANCE = 60
const SNAP_SPEED = 500
// Movement smaller than this is a tap, not a swipe.
const TAP_SLOP = 6

interface DragState {
  pointerId: number
  startY: number
  startOffset: number
  lastY: number
  lastTime: number
  speed: number
  // Only true once the finger has really moved. Until then taps go to the buttons as normal.
  dragging: boolean
}

// A panel at the bottom of the phone screen. Swipe it up to see more, swipe down to tuck it away.
// Only the top part reacts to swipes, so the content inside can still scroll normally.
export function BottomSheet({ peek, children, label, reducedMotion }: BottomSheetProps) {
  const [open, setOpen] = useState(false)
  const [closedOffset, setClosedOffset] = useState(0)
  const sheetRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)

  // How far down the sheet is moved. 0 is fully open, closedOffset shows only the header.
  const y = useMotionValue(0)

  // When closed, only the header shows. Measure how far down that is, and again when sizes change.
  useLayoutEffect(() => {
    const sheet = sheetRef.current
    const header = headerRef.current
    if (!sheet || !header) return

    const measure = () => setClosedOffset(Math.max(0, sheet.offsetHeight - header.offsetHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sheet)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  const snapTo = useCallback(
    (shouldOpen: boolean) => {
      const target = shouldOpen ? 0 : closedOffset
      if (reducedMotion) {
        y.set(target)
      } else {
        animate(y, target, { type: 'spring', stiffness: 380, damping: 38 })
      }
    },
    [closedOffset, reducedMotion, y],
  )

  // Move to the right place when opened or closed, or when the size changes.
  useEffect(() => {
    if (!drag.current) snapTo(open)
  }, [open, snapTo])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: y.get(),
      lastY: event.clientY,
      lastTime: event.timeStamp,
      speed: 0,
      dragging: false,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return

    if (!current.dragging) {
      if (Math.abs(event.clientY - current.startY) < TAP_SLOP) return
      // Now it is a swipe. Keep getting the pointer even if the finger leaves the header.
      current.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    const next = current.startOffset + (event.clientY - current.startY)
    y.set(Math.min(Math.max(next, 0), closedOffset))

    const elapsed = event.timeStamp - current.lastTime
    if (elapsed > 0) current.speed = ((event.clientY - current.lastY) / elapsed) * 1000
    current.lastY = event.clientY
    current.lastTime = event.timeStamp
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.pointerId !== event.pointerId) return
    drag.current = null

    // A tap is left alone, so the buttons in the header still work.
    if (!current.dragging) return
    const moved = event.clientY - current.startY

    let shouldOpen = open
    if (moved < -SNAP_DISTANCE || current.speed < -SNAP_SPEED) shouldOpen = true
    else if (moved > SNAP_DISTANCE || current.speed > SNAP_SPEED) shouldOpen = false

    setOpen(shouldOpen)
    snapTo(shouldOpen)
  }

  return (
    <motion.section ref={sheetRef} className={styles.sheet} aria-label={label} style={{ y }}>
      <div
        ref={headerRef}
        className={styles.header}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <button
          type="button"
          className={styles.handle}
          aria-expanded={open}
          aria-label={open ? 'Hide nearest planes' : 'Show nearest planes'}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.grip} aria-hidden="true" />
        </button>
        {peek}
      </div>

      <div className={styles.body} inert={!open}>
        {children}
      </div>
    </motion.section>
  )
}
