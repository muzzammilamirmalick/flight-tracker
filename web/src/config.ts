// Settings come from Vite env variables (see .env.example), with defaults for my setup.

const env = import.meta.env

// In development the API runs on its own port. In the built app (on the Pi) the API serves the page,
// so requests go to the same address and the base URL is empty.
export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5158' : '')

// My home point. The Look Up card measures directions and angles from here.
export const HOME = {
  latitude: Number(env.VITE_HOME_LAT ?? 43.25),
  longitude: Number(env.VITE_HOME_LON ?? -79.87),
  elevationMeters: Number(env.VITE_HOME_ELEVATION_M ?? 100),
}

// How often to ask the API for planes.
export const POLL_INTERVAL_MS = 4000

// A free dark map style, no API key needed. https://openfreemap.org
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
