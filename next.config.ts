import type { NextConfig } from "next";

// Every page in this app shows live data from Supabase, so pages are rendered
// on each request (no Cache Components / partial prefetching).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
