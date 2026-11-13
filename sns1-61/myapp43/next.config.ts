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
      {
        source: '/@:username/following',
        destination: '/usersui/:username?view=following', // ✅ myapp43 - initialView
      },
      {
        source: '/@:username/followers',
        destination: '/usersui/:username?view=followers',
      },
    ]
  },
  
};

export default nextConfig;
