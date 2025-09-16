/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mmevnmwnbptcmozlhtny.supabase.co',
        pathname: '/storage/v1/object/public/uploads/**',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);