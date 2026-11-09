import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // MapLibre alone is about 1 MB, so the default 500 kB warning always fires.
    chunkSizeWarningLimit: 1600,
  },
})
