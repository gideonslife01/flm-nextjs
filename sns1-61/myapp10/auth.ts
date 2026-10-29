// auth.ts (프로젝트 루트에 생성)
// auth.ts (Created in the project root)
import NextAuth from "next-auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "gotosocial",
      name: "freelifemakers",
      type: "oauth",
      authorization: {
        url: "https://freelifemakers.com/oauth/authorize",
        params: { scope: "read write follow push" }
      },
      token: "https://freelifemakers.com/oauth/token",
      userinfo: "https://freelifemakers.com/api/v1/accounts/verify_credentials",

      // .env.local과 변수명 일치시키기
      // Match with variable names in .env.local
      clientId: process.env.AUTH_GOTOSOCIAL_ID,
      clientSecret: process.env.AUTH_GOTOSOCIAL_SECRET,

      // GTS 토큰 발급 에러(400 Bad Request) 해결 절대 조건
      // Essential condition to resolve GTS token issuance error (400 Bad Request)
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.display_name || profile.username,
          image: profile.avatar,
          email: profile.acct.includes('@') ? profile.acct : `${profile.acct}@freelifemakers.com`,
        }
      },
    }
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) token.accessToken = account.access_token
      return token
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken
      return session
    }
  }
})
