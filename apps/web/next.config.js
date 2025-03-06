// next.config.js
const withPWA = require("next-pwa")

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  reactStrictMode: true,
  transpilePackages: ["@focusbutton/ui"],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    }
    return config
  },
}

module.exports = withPWA({
  ...nextConfig,
  dest: "public",
  // disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [
    // Exclude Next.js specific files
    /_next\/static\/.*/i,
    /app-build-manifest.json/,
    /build-manifest.json/,
    // Add other files to exclude if needed
  ],
  // Only include specific files
  include: ["/*", "/icons/*", "/timer-end.mp3"],
  // Disable workbox logging in production
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/focusbutton\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "focusbutton-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
})(nextConfig)
