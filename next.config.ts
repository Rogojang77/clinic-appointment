import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do NOT inline MONGO_URI/SECRET here - they are runtime-only (set by Docker)
  // Inlining would bake build-time values (undefined) into the bundle
  env: {},
};

export default nextConfig;
