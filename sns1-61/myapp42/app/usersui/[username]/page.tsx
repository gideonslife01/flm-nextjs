// ✅ app/usersui/[username]/page.tsx - only server

import { notFound } from 'next/navigation';
import db from '@/lib/db';
import ClientPage from './ClientPage'; 

// daynamic과 runtime은 nextjs가 읽는 값 / `dynamic` and `runtime` are values ​​read by Next.js.
// force-dynamic : 캐시 적용하지 않음 / Do not use cache
// runtime : DB사용하기 위한 설정 / Configuration for Using the Database

export const dynamic = 'force-dynamic'; // no cache
export const runtime = 'nodejs'; // fot db

type Props = {
  params: Promise<{ username: string }>;
};

export default async function Page({ params }: Props) {
  const { username } = await params;

  // DB 체크 / Check DB
  const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username) as { username: string } | undefined;

  // 404
  if (!user) {
    notFound(); 
  }

  // - 이전의 page.tsx였던 ClientPage.tsx파일 불러오기 , 기존의 params없애고 username 직접 입력
  // call client
  return <ClientPage username={username} />;
}