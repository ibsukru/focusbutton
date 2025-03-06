// next.config.js
const withPWA = require("next-pwa")

/** @type {import('next').NextConfig} */
const nextConfig = {
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

const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/focusbutton\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "focusbutton-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60
        }
      }
    }
  ]
})

module.exports = {
  ...withPWAConfig(nextConfig),
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
  }
}


