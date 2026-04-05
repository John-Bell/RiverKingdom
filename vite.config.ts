import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // THIS IS THE CRITICAL ADDITION:
  // Tells Vite we are hosted in a sub-folder on GitHub Pages
  base: '/RiverKingdom/',
  
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/scripts/index.html')
      }
    }
  }
});
