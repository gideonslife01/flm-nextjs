export const GTS_BASE = process.env.GTS_URL!


// 세션에서 꺼낸 accessToken으로 타임라인 가져오기
// etrieve the timeline using the accessToken obtained from the session
export async function getHomeTimeline(accessToken: string) {
  const res = await fetch(`${GTS_BASE}/api/v1/timelines/home`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return res.json()
}
