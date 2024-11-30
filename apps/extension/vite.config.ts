import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isFirefox = env.VITE_BROWSER === "firefox";

  const manifestBase = {
    manifest_version: 3,
    name: "FocusButton",
    version: "1.0.0",
    description: "Track your focus time with a simple press and hold button",
    permissions: [
      "storage",
      "notifications",
      "tabs",
      "alarms",
      "windows",
      "activeTab",
      "scripting",
    ],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content-script.js"],
      },
    ],
    action: {
      default_icon: {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png",
      },
    },
    background: isFirefox
      ? {
          scripts: ["background-worker.js"],
        }
      : {
          service_worker: "background-worker.js",
          type: "module",
        },
    icons: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
    web_accessible_resources: [
      {
        resources: ["timer-end.mp3", "assets/*"],
        matches: ["<all_urls>"],
      },
    ],
    browser_specific_settings: isFirefox
      ? {
          gecko: {
            id: "focusbutton@example.com",
            strict_min_version: "109.0",
          },
        }
      : undefined,
  };

  const manifest = manifestBase;

  return {
    plugins: [
      react(),
      {
        name: "copy-assets",
        writeBundle() {
          // Create dist directory if it doesn't exist
          if (!existsSync("dist")) {
            mkdirSync("dist");
          }

          // Create icons directory
          if (!existsSync("dist/icons")) {
            mkdirSync("dist/icons");
          }

          // Copy icon files
          const iconFiles = ["icon-16.png", "icon-48.png", "icon-128.png"];
          iconFiles.forEach((file) => {
            const sourcePath = resolve("src/icons", file);
            if (existsSync(sourcePath)) {
              copyFileSync(sourcePath, resolve("dist/icons", file));
            }
          });

          // Copy sound file
          const soundFile = resolve("src", "timer-end.mp3");
          if (existsSync(soundFile)) {
            copyFileSync(soundFile, resolve("dist", "timer-end.mp3"));
          }

          // Copy offscreen files
          const offscreenFiles = ["offscreen.html", "offscreen.js"];
          offscreenFiles.forEach((file) => {
            const sourcePath = resolve("src", file);
            if (existsSync(sourcePath)) {
              copyFileSync(sourcePath, resolve("dist", file));
            }
          });
        },
      },
      {
        name: "write-manifest",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "manifest.json",
            source: JSON.stringify(manifest, null, 2),
          });
        },
      },
    ],
    define: {
      "process.env.BROWSER": JSON.stringify(env.VITE_BROWSER || "chrome"),
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          "background-worker": resolve(__dirname, "src/background-worker.js"),
          "content-script": resolve(__dirname, "src/content-script.js"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[ext]",
        },
      },
    },
  };
});
