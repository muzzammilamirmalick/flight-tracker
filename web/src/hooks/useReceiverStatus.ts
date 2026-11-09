import { useEffect, useState } from 'react'
import { fetchReceiverStatus } from '../api/client'
import type { ReceiverStatus } from '../api/types'

const REFRESH_MS = 5000

// How the antenna is doing. Null until the first answer, or if the API cannot be reached.
export function useReceiverStatus(): ReceiverStatus | null {
  const [status, setStatus] = useState<ReceiverStatus | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const controller = new AbortController()

    async function load() {
      try {
        const result = await fetchReceiverStatus(controller.signal)
        if (!stopped) setStatus(result)
      } catch {
        if (!stopped) setStatus(null)
      }
      if (!stopped) timer = window.setTimeout(load, REFRESH_MS)
    }

    load()
    return () => {
      stopped = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  return status
}
