import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prisma client is server-only; keep it external to the server bundle.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
