import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.5', '*.192.168.1.5'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow Supabase URLs. In prod be more specific.
      },
    ],
  },
};

export default nextConfig;
