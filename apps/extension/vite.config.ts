import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isFirefox = mode === "firefox";

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
    background: {
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
        resources: [
          "index.html",
          "assets/*",
          "timer-end.mp3",
          "notification.html",
        ],
        matches: ["<all_urls>"],
      },
    ],
  };

  const manifest = isFirefox
    ? {
        ...manifestBase,
        browser_specific_settings: {
          gecko: {
            id: "focusbutton@ibsukru.com",
            strict_min_version: "109.0",
          },
        },
      }
    : manifestBase;

  return {
    plugins: [
      react(),
      {
        name: "copy-files",
        writeBundle() {
          if (!existsSync("dist")) {
            mkdirSync("dist");
          }

          const files = [
            "manifest.json",
            "icons/icon-16.png",
            "icons/icon-48.png",
            "icons/icon-128.png",
            "timer-end.mp3",
          ];

          // Copy static files
          files.forEach((file) => {
            if (existsSync(file)) {
              const dir = resolve("dist", file.split("/")[0]);
              if (!existsSync(dir) && file.includes("/")) {
                mkdirSync(dir);
              }
              copyFileSync(file, resolve("dist", file));
            }
          });

          // Copy source HTML files
          const sourceFiles = [
            "offscreen.html",
            "offscreen.js",
            "notification.html",
            "notification.js",
            "sound.html",
          ];

          sourceFiles.forEach((file) => {
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
          offscreenJs: resolve(__dirname, "src/offscreen.js"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "assets/[name].[hash].js",
          assetFileNames: "assets/[name].[ext]",
        },
      },
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
  };
});
