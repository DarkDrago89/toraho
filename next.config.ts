import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default Server Action hanya 1 MB; foto bukti transfer dari HP biasanya 2–4 MB.
    // Batas aplikasi 4 MB (lihat lib/storage/constants.ts) + ruang untuk overhead multipart.
    serverActions: { bodySizeLimit: "4.4mb" },
  },
};

export default nextConfig;
