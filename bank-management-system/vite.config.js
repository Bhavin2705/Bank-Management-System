import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // lower the warning threshold slightly and split vendor chunks to reduce oversized chunks
    chunkSizeWarningLimit: 600,
    // NOTE: manualChunks removed temporarily to avoid potential chunk execution order
    // issues that can cause 'createContext' to be undefined in production bundles.
    // If this fixes the runtime error, consider reintroducing controlled chunking.
  }
})
