import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI upload logs
  silent: true,
  // Don't widen Next.js source maps (keeps deploys fast)
  widenClientFileUpload: false,
  // Tree-shake Sentry logger statements
  disableLogger: true,
  // Automatically instrument Next.js data fetching
  automaticVercelMonitors: false,
});
