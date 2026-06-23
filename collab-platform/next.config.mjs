/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow server components to use the Node.js Prisma client.
    serverComponentsExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
  },
};

export default nextConfig;
