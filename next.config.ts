import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    // Next 16 defaults optimized images to `attachment`, which stops some
    // browsers from decoding them inline and leaves empty image frames.
    contentDispositionType: "inline",
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
