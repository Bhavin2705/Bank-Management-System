import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor'
          }

          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'maps-vendor'
          }

          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-vendor'
          }

          if (id.includes('socket.io-client')) {
            return 'realtime-vendor'
          }

          return 'vendor'
        }
      }
    }
  }
})
