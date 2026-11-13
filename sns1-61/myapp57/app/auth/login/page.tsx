// ✅ myapp40 - app/auth/login/page.tsx 
// - httpOnly + refresh + Coreect Rendering error 

'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  useEffect(() => {
    async function checkLogin() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.username) {
            setCurrentUser(data.username);
          }
        }
      } catch {}
      setLoading(false);
    }
    checkLogin();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginId, username: loginId, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '로그인 실패/Login failed');
        return;
      }

      localStorage.setItem('username', data.username || loginId);

      console.log('✅ 로그인 성공 / login success next:', next);

      // - router.push 대신 window.location.href사용(렌더링 딜레이 때문에) 
      //  Use window.location.href instead of router.push (due to rendering delays).
      if (next && next !== '/') {
        if (next.startsWith('http')) {
          window.location.href = next;
        } else {
          window.location.href = next;
        }
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError('네트워크 오류 / Network error');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setCurrentUser('');
    window.location.href = '/auth/login';
  }

  if (loading) {
    return <div style={{ padding: 20 }}>로딩중... / Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>🔐 로그인 / Login {currentUser ? `${currentUser} - ` : ''} myapp40</h1>

      {currentUser ? (
        <>
          <p style={{ color: 'green', fontSize: 18 }}>현재 로그인: <strong>{currentUser}</strong></p>
          {next && next !== '/' ? (
            <>
              <p>승인 페이지로 이동해야 합니다 / You need to go to the approval page.</p>
              <button
                onClick={() => { window.location.href = next; }}
                style={{ marginTop: 20, padding: 12, width: '100%', background: '#6364ff', color: 'white', border: 0, borderRadius: 8, fontSize: 16 }}
              >
                🔐 승인 페이지로 가기 / Go to Approval Page
              </button>
            </>
          ) : (
            <p>이미 로그인됨 / Already logged in</p>
          )}
          <button
            onClick={handleLogout}
            style={{ marginTop: 20, padding: 12, width: '100%', background: '#ff4444', color: 'white', border: 0, borderRadius: 8, fontSize: 16 }}
          >
            로그아웃 / Log out
          </button>
          <p style={{ marginTop: 20 }}><a href="/">홈으로 가기 / Go to Home</a></p>
        </>
      ) : (
        <>
          {next && next !== '/' && (
            <p style={{ background: '#f5f5ff', padding: 10, borderRadius: 5, fontSize: 13 }}>
              로그인 후 <code>{next.substring(0, 60)}...</code>로 이동!
            </p>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <input placeholder="email or username" value={loginId} onChange={e => setLoginId(e.target.value)} style={{ padding: 10, fontSize: 16 }} required />
            <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: 10, fontSize: 16 }} required />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" style={{ padding: 12, fontSize: 16, background: '#6364ff', color: 'white', border: 0, borderRadius: 8 }}>
              로그인 / Login
            </button>
          </form>
          <p style={{ marginTop: 20 }}><a href="/auth/signup">회원가입/Signup</a></p>
        </>
      )}
    </div>
  );
}

// ✅ useSearchParams는 Suspense로 감싸야 Rendering 안 걸림!
export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>로딩중 / Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}