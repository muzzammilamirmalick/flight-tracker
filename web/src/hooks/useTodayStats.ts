import { useEffect, useState } from 'react'
import { fetchTodayStats } from '../api/client'
import type { TodayStats } from '../api/types'

const REFRESH_MS = 60_000

export interface TodayStatsState {
  stats: TodayStats | null
  failed: boolean
}

// Today's numbers, refreshed once a minute while the page is open.
export function useTodayStats(): TodayStatsState {
  const [state, setState] = useState<TodayStatsState>({ stats: null, failed: false })

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const controller = new AbortController()

    async function load() {
      try {
        const stats = await fetchTodayStats(controller.signal)
        if (!stopped) setState({ stats, failed: false })
      } catch {
        if (!stopped) setState((previous) => ({ ...previous, failed: true }))
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

  return state
}
