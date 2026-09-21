import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    'process.env': {},
  },
  server: {
    port: 5173,
    host: true,
    cors: true,
  },
  preview: {
    port: 5173,
    host: true,
    cors: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          icons: ['lucide-react', 'framer-motion'],
          aws: ['@aws-sdk/client-s3'],
        },
      },
    },
  },
});
