/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Next build artifacts in `dist` to match current Vercel output directory setting.
  distDir: 'dist',
};

module.exports = nextConfig;
