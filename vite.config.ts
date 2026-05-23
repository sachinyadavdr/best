import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';

const backendUrl = process.env.VITE_BACKEND_URL || 'https://best-backend.onrender.com';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
