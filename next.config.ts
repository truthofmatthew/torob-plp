import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The first deploy served results at /?q=…; keep those links working.
      {
        source: "/",
        has: [{ type: "query", key: "q", value: "(?<q>.+)" }],
        destination: "/search?query=:q",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
