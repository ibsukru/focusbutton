import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, cpSync } from "fs";

// Custom plugin to copy assets after build
function copyAssets() {
  return {
    name: "copy-assets",
    closeBundle() {
      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, "manifest.json"),
        resolve(__dirname, "dist/manifest.json"),
      );

      // Copy icons
      cpSync(resolve(__dirname, "icons"), resolve(__dirname, "dist/icons"), {
        recursive: true,
      });

      // Copy background script directly without bundling

      copyFileSync(
        resolve(__dirname, "src/background-worker.js"),
        resolve(__dirname, "dist/background-worker.js"),
      );

      copyFileSync(
        resolve(__dirname, "src/content-script.js"),
        resolve(__dirname, "dist/content-script.js"),
      );

      // Copy offscreen files
      copyFileSync(
        resolve(__dirname, "src/offscreen.html"),
        resolve(__dirname, "dist/offscreen.html"),
      );

      copyFileSync(
        resolve(__dirname, "src/offscreen.js"),
        resolve(__dirname, "dist/offscreen.js"),
      );

      // Copy notification sound
      copyFileSync(
        resolve(__dirname, "../../packages/ui/public/timer-end.mp3"),
        resolve(__dirname, "dist/timer-end.mp3"),
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      // Disable React Strict Mode
    }),
    copyAssets(),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
