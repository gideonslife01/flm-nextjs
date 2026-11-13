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
        destination: '/usersui/:username/following',
      },
      {
        source: '/@:username/followers',
        destination: '/usersui/:username/followers',
      },
    ]
  },
  
};

export default nextConfig;
