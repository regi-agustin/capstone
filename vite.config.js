import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    open: true,
    proxy: {
      '/fleetops/api': {
        target: 'http://localhost',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/fleetops/api')
      }
    }
  }
})
