import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 允许 Next.js 优化来自以下域名的图片
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel.app' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.wp.com' }, // 常用图床
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    formats: ['image/avif', 'image/webp'], // 开启下一代格式压缩
  },
};

export default nextConfig;