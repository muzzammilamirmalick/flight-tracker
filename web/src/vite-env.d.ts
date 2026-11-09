/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_HOME_LAT?: string
  readonly VITE_HOME_LON?: string
  readonly VITE_HOME_ELEVATION_M?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
