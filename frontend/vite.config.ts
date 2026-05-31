import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/practice': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/api/profile': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/cv': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      '/tailor': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
      '/generation': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      }
    }
  }
})
