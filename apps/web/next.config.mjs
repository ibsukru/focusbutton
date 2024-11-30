/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  headers: async () => {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Add handling for web workers
    if (!isServer) {
      config.output.globalObject = "self";
    }
    return config;
  },
};

export default nextConfig;
