import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    server: {
      proxy: { '/api': { target: process.env.VITE_API_PROXY || env.VITE_API_PROXY || 'http://localhost:8787', changeOrigin: true } },
    },
    build: { chunkSizeWarningLimit: 600 },
  }
})
