import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// MapLibre finds its web worker with a path Vite cannot see, so the worker goes missing
// in both the dev server and the build. Tell MapLibre exactly where Vite put it.
setWorkerUrl(workerUrl)
