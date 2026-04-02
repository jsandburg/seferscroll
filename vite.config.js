import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  // hearing-processor.js lives in public/ and is served as a static file.
  // Vite does not bundle public/ files — the worklet is loaded via
  // audioContext.audioWorklet.addModule('/hearing-processor.js?v=1')
  // which fetches it as a plain script in the audio worklet global scope.
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
