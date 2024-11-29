import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, copyFileSync, cpSync } from 'fs';

// Custom plugin to copy manifest and handle assets
const copyAssets = () => ({
  name: 'copy-assets',
  closeBundle() {
    // Copy manifest.json to dist
    try {
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      console.log('✓ Copied manifest.json');
    } catch (err) {
      console.error('Failed to copy manifest.json:', err);
    }

    // Copy public directory to dist
    try {
      cpSync(
        resolve(__dirname, 'public'),
        resolve(__dirname, 'dist'),
        { recursive: true }
      );
      console.log('✓ Copied public directory');
    } catch (err) {
      console.error('Failed to copy public directory:', err);
    }
  }
});

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
