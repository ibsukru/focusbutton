import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, copyFileSync, cpSync } from 'fs';

// Custom plugin to copy assets after build
function copyAssets() {
  return {
    name: 'copy-assets',
    closeBundle() {
      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
      
      // Copy icons
      cpSync(
        resolve(__dirname, 'icons'),
        resolve(__dirname, 'dist/icons'),
        { recursive: true }
      );

      // Copy background script directly without bundling
      copyFileSync(
        resolve(__dirname, 'src/background.js'),
        resolve(__dirname, 'dist/background.js')
      );
    }
  };
}

export default defineConfig({
  plugins: [
    react({
      // Disable React Strict Mode
      strict: false
    }), 
    copyAssets()
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html')
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
