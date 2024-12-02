import { defineConfig, loadEnv, Plugin, UserConfig, ConfigEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import * as esbuild from "esbuild";

function chromeExtensionPlugin(): Plugin {
  return {
    name: "chrome-extension",
    enforce: "post",
    generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk") {
          if (
            fileName.includes("background-worker") ||
            fileName.includes("content-script")
          ) {
            // Removed IIFE wrapping
          }
        }
      }
    },
  };
}

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd(), "");
  const isFirefox = env.VITE_BROWSER === "firefox";

  const manifestBase = {
    manifest_version: 3,
    name: "FocusButton",
    version: "1.0.0",
    description: "Track your focus time with a simple press and hold button",
    permissions: ["storage", "notifications", "alarms", "offscreen", "tabs"],
    host_permissions: [],
    content_scripts: [],
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
          "timer-end.mp3",
          "assets/*",
          "offscreen.html",
          "offscreen.js",
          "index.html",
        ],
        matches: ["chrome-extension://*/*", "moz-extension://*/*"],
      },
    ],
  };

  const manifest = isFirefox
    ? {
        ...manifestBase,
        browser_specific_settings: {
          gecko: {
            id: "focusbutton@example.com",
            strict_min_version: "109.0",
          },
        },
      }
    : manifestBase;

  return {
    plugins: [
      react(),
      chromeExtensionPlugin(),
      {
        name: "build-extension-scripts",
        enforce: "post",
        async writeBundle() {
          // Build background and content scripts separately
          await esbuild.build({
            entryPoints: {
              "background-worker": resolve(
                __dirname,
                "src/background-worker.js",
              ),
              "content-script": resolve(__dirname, "src/content-script.js"),
            },
            bundle: true,
            format: "esm",
            outdir: "dist",
            sourcemap: true,
            target: "chrome58",
            minify: false,
            define: {
              chrome: "chrome",
              browser: "browser",
            },
          });
        },
      },
      {
        name: "copy-offscreen",
        enforce: "post",
        async writeBundle() {
          // Copy offscreen files to dist root
          copyFileSync(
            resolve(__dirname, "src/offscreen.html"),
            resolve(__dirname, "dist/offscreen.html"),
          );
          copyFileSync(
            resolve(__dirname, "src/offscreen.js"),
            resolve(__dirname, "dist/offscreen.js"),
          );
        },
      },
      {
        name: "write-manifest",
        enforce: "post",
        closeBundle() {
          // Ensure dist directory exists
          if (!existsSync("dist")) {
            mkdirSync("dist", { recursive: true });
          }

          // Write manifest directly to dist folder
          writeFileSync(
            resolve(__dirname, "dist/manifest.json"),
            JSON.stringify(manifest, null, 2),
            "utf-8",
          );
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
        },
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          format: "es",
          dir: "dist",
        },
      },
      sourcemap: true,
      minify: false,
      outDir: "dist",
      emptyOutDir: true,
    },
    define: {
      "process.env.BROWSER": JSON.stringify(env.VITE_BROWSER || "chrome"),
    },
  };
});
