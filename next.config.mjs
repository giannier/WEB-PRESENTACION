/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Logos are consumed as raw WebGL textures, never through next/image.
    unoptimized: true,
  },
};

export default nextConfig;
