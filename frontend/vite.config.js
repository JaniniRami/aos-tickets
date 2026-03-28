import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/aos/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/aos/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aos\/api/, ''),
      },
    },
  },
})
