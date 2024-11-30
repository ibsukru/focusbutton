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

      // Copy HTML files
      ["index.html", "offscreen.html", "notification.html"].forEach((file) => {
        if (file === "index.html") {
          copyFileSync(
            resolve(__dirname, file),
            resolve(__dirname, `dist/${file}`),
          );
        } else {
          copyFileSync(
            resolve(__dirname, `src/${file}`),
            resolve(__dirname, `dist/${file}`),
          );
        }
      });

      // Copy background and content scripts
      ["background-worker.js", "content-script.js"].forEach((file) => {
        copyFileSync(
          resolve(__dirname, `src/${file}`),
          resolve(__dirname, `dist/${file}`),
        );
      });

      // Copy offscreen.js
      copyFileSync(
        resolve(__dirname, "src/offscreen.js"),
        resolve(__dirname, "dist/offscreen.js"),
      );

      // Copy notification sound
      copyFileSync(
        resolve(__dirname, "timer-end.mp3"),
        resolve(__dirname, "dist/timer-end.mp3"),
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), copyAssets()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.tsx"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "style.css";
          return "[name].[hash].[ext]";
        },
      },
    },
    sourcemap: true,
    minify: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
