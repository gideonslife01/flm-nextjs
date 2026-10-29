import type { NextConfig } from "next";

const nextConfig: NextConfig = {

/**
 * nextjs를 AI agent로 자동업데이트하기를 원하시면 아래의 주석을 해제하세요
 * If you would like to automatically update Next.js using an AI agent, please uncomment the lines below.
 *
 * nextjs를 수동 업데이트하려면 npm install next@16.4.2 처럼 버전을 직접 입력하면됩니다.
 * To update Next.js manually, you can specify the version directly, for example by running `npm install next@16.4.2`.
 *
*/
  // ✅ myapp61+
  /* Allow auto securiy upgrade for AI Agent */
  // experimental: {
  //   agentUpgrade: "security"
  // },

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
      { source: '/@:username/notifications', // ✅ myapp44 - initialView for notifications
        destination: '/usersui/:username?view=notifications'
      },
    ]
  },

};

export default nextConfig;
