/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Logos are consumed as raw WebGL textures, never through next/image.
    unoptimized: true,
  },
  // Emits `.next/standalone`: a `server.js` plus the trimmed `node_modules` it actually
  // needs. That is what shared hosts run (cPanel's Node.js Selector / LiteSpeed spawn it
  // as the app's startup file), and it is how the site is deployed to cPanel today. Vercel
  // ignores this and uses its own build output.
  output: 'standalone',
};

export default nextConfig;
