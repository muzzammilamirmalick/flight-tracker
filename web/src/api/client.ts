import { API_BASE_URL } from '../config'
import type { LivePlane, ReceiverStatus, TodayStats, Trail } from './types'

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal })
  if (!response.ok) {
    throw new Error(`API returned ${response.status} for ${path}`)
  }
  return (await response.json()) as T
}

export function fetchLivePlanes(signal?: AbortSignal): Promise<LivePlane[]> {
  return getJson<LivePlane[]>('/api/planes/live', signal)
}

export function fetchTrails(minutes: number, signal?: AbortSignal): Promise<Trail[]> {
  return getJson<Trail[]>(`/api/planes/trails?minutes=${minutes}`, signal)
}

export function fetchReceiverStatus(signal?: AbortSignal): Promise<ReceiverStatus> {
  return getJson<ReceiverStatus>('/api/receiver', signal)
}

export function fetchTodayStats(signal?: AbortSignal): Promise<TodayStats> {
  return getJson<TodayStats>('/api/stats', signal)
}
