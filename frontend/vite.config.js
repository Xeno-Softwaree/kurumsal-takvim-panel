import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  define: {
    global: 'globalThis',
  },

  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },

  optimizeDeps: {
    include: ['buffer'],
  },

  build: {
    // Raise chunk size warning to 600 kB (FullCalendar is legitimately large)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always cached
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // FullCalendar — large, rarely changes
          'vendor-fullcalendar': [
            '@fullcalendar/core',
            '@fullcalendar/daygrid',
            '@fullcalendar/list',
            '@fullcalendar/interaction',
            '@fullcalendar/react',
          ],

          // Charts — only needed on Dashboard
          'vendor-charts': ['recharts'],

          // PDF / Excel export — only needed on export actions
          'vendor-export': ['@react-pdf/renderer', 'exceljs'],

          // HTTP + icons
          'vendor-utils': ['axios', 'lucide-react'],
        },
      },
    },

    // Modern targets only — smaller output
    target: ['es2020', 'chrome90', 'firefox88', 'safari14'],

    // Minify with esbuild (default, fastest)
    minify: 'esbuild',

    // Source maps for production error tracking (optional — remove if not needed)
    sourcemap: false,
  },

  // Dev server proxy (keeps credentials out of frontend env vars)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
