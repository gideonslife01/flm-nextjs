// ✅ myapp39 - app/auth/login/page.tsx - next process
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/'; // ✅ next 읽기 / read next

  useEffect(() => {
    const saved = localStorage.getItem('username');
    if (saved) {
      setCurrentUser(saved);
      // ✅ 이미 로그인 됐는데 next가 있으면 바로 authorize로 이동
      // next == browser parameter
      if (next && next!== '/' && next.includes('/oauth/authorize')) {
        // 이미 로그인 됐으면 승인 페이지로
        // router.push(next); // 자동! 이동! 원하면! 주석! 해제!
      }
    }
  }, [next]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginId, username: loginId, password })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '로그인 실패 / Login failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);

    // ✅ next가 있으면 'next'로 없으면 '/' 로!
    // Use 'next' if it exists; otherwise, use '/'!
    console.log('✅ 로그인 성공 / Login success next:', next);

    // 쿠키도 JS에서 설정 (api에서 이미 했지만 확실하게)
    // Set the cookie in JS as well (already handled by the API, but doing this to be certain)
    document.cookie = `token=${data.token}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;

    if (next && next!== '/') {
      router.push(next);
      if (next.startsWith('http')) {
        window.location.href = next;
      } else {
        router.push(next);
      }
    } else {
      alert(`✅ 로그인 성공 / Login success ${data.username}`);
      router.push('/');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    document.cookie = 'token=; path=/; max-age=0';
    setCurrentUser('');
    alert('로그아웃!');
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>🔐 로그인 / Login {currentUser? `${currentUser} - ` : ''} myapp39</h1>

      {currentUser? (
        <>
          <p style={{ color: 'green', fontSize: 18 }}>현재 로그인: <strong>{currentUser}</strong></p>
          {next && next!== '/'? (
            <>
              <p>승인 페이지로 이동해야 합니다 / You need to go to the approval page.</p>
              <button
                onClick={() => {
                  if (next.startsWith('http')) window.location.href = next;
                  else router.push(next);
                }}
                style={{ marginTop: 20, padding: 12, width: '100%', background: '#6364ff', color: 'white', border: 0, borderRadius: 8, fontSize: 16 }}
              >
                🔐 승인 페이지로 가기 / Go to the approval page
              </button>
            </>
          ) : (
            <p>이미 로그인됨 / Already logged in</p>
          )}
          <button
            onClick={handleLogout}
            style={{ marginTop: 20, padding: 12, width: '100%', background: '#ff4444', color: 'white', border: 0, borderRadius: 8, fontSize: 16 }}
          >
            로그아웃 / Logout
          </button>
          <p style={{ marginTop: 20 }}>
            <a href="/">홈으로 가기 / Go to Home</a>
          </p>
        </>
      ) : (
        <>
          {/*pinafore.social에서 로그인 하는 경우 */}
          {next && next!== '/' && (
            <p style={{ background: '#f5f5ff', padding: 10, borderRadius: 5, fontSize: 13 }}>
              로그인 후! <code>{next.substring(0, 60)}...</code>로! 이동!<br></br> 
              After logging in, proceed to <code>{next.substring(0, 60)}...</code>
            </p>
          )}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <input
              placeholder="email or username"
              value={loginId}
              onChange={e=>setLoginId(e.target.value)}
              style={{ padding: 10, fontSize: 16 }}
              required
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              style={{ padding: 10, fontSize: 16 }}
              required
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" style={{ padding: 12, fontSize: 16, background: '#6364ff', color: 'white', border: 0, borderRadius: 8 }}>
              로그인 / Login
            </button>
          </form>
          <p style={{ marginTop: 20 }}>
            <a href="/auth/signup">회원가입 / Signup</a>
          </p>
        </>
      )}
    </div>
  );
}