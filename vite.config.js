import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/sefaria-api': {
        target: 'https://www.sefaria.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sefaria-api/, '/api'),
      },
    },
  },
})
