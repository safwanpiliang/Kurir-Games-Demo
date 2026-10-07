import { defineConfig } from 'vite';

export default defineConfig({
  // Path relatif supaya hasil build bisa dibuka dari subfolder GitHub Pages / Netlify.
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
  },
});
