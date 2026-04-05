import { defineConfig } from 'vite';

export default defineConfig({
  base: '/RiverKingdom/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
