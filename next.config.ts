import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@douyinfe/semi-ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.wp.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },

      // ✅ 加这一行（Cloudinary）
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
