/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the native Prisma client out of the bundler's module graph.
  serverExternalPackages: ["@prisma/client", "@auth/prisma-adapter"],
};

export default nextConfig;
