import db from '@/lib/db';
export async function POST(req: Request) {
  const body = await req.json();
  console.log('INBOX에 도착한 우주선:', body.type, body.actor);

  if (body.type === 'Follow') {
    // 팔로우 왔으니까 저장
    const followerInbox = body.actor + '/inbox'; // 실제로는 actor 객체에서 가져와야 함, 단순화
    db.prepare('INSERT OR IGNORE INTO followers (id, actor, inbox) VALUES (?,?,?)')
      .run(body.id, body.actor, body.actor); // 실제로는 inbox url 파싱 필요

    // TODO: Accept를 돌려줘야 팔로우 성립 - 이게 HTTP Signature 때문에 제일 어려움
    // 일단은 로그만 찍고 다음 단계에서 서명 구현
    console.log(`${body.actor}가 나를 팔로우함!`);
  }

  return new Response('', { status: 202 }); // 202 Accepted
}
