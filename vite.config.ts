import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        inbox: resolve(__dirname, 'src/inbox.html'),
        preview: resolve(__dirname, 'src/preview.html'),
        app: resolve(__dirname, 'src/app.html'),
      },
    },
  },

  server: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
