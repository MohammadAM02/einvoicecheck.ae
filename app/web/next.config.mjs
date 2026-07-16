/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output keeps the Railway image small (no node_modules copy needed).
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
