import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('scheduler') ||
                id.includes('motion')
              ) {
                return 'vendor-core';
              }
              if (id.includes('katex')) {
                return 'vendor-katex';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
                return 'vendor-charts';
              }
              if (id.includes('mammoth') || id.includes('jszip')) {
                return 'vendor-docs';
              }
              if (id.includes('@supabase') || id.includes('@google/genai')) {
                return 'vendor-services';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
