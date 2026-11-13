import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* allow domain*/
  allowedDevOrigins: ['aloy-horizon.duckdns.org', '*.duckdns.org'],

  /* host.domain.org/@userid */
  async rewrites() {
    return [
      {
        source: '/@:username',
        destination: '/usersui/:username',
      },
    ]
  }
};

export default nextConfig;
