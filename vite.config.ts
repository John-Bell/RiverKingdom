import { defineConfig } from 'vite';

export default defineConfig({
  // The dot makes it a relative path!
  base: './',
  
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
