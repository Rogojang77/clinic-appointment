import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    MONGO_URI: process.env.MONGO_URI,
    SECRET: process.env.SECRET,
  },
};

export default nextConfig;
