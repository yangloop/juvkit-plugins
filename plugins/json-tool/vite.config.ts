import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {},
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'JuvkitPlugin',
      formats: ['iife'],
      fileName: () => 'index.iife.js',
    },
    outDir: 'dist',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some(name => name.endsWith('.css'))) {
            return 'style.[ext]';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
