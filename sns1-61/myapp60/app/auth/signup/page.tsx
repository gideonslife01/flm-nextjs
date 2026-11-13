// ✅ myapp39 - app/auth/signup/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, display_name: displayName })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '회원가입 실패/Join failed');
      return;
    }

    alert(`✅ 회원가입 성공/join membership success! ${data.username} 이제 로그인 / Already login`);
    router.push('/auth/login');
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>📝 회원가입 / Signup- myapp39</h1>
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input placeholder="username (영문, 숫자, _)" value={username} onChange={e=>setUsername(e.target.value)} style={{ padding: 10, fontSize: 16 }} required />
        <input placeholder="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ padding: 10, fontSize: 16 }} required />
        <input placeholder="display name (선택)" value={displayName} onChange={e=>setDisplayName(e.target.value)} style={{ padding: 10, fontSize: 16 }} />
        <input type="password" placeholder="password 6자 이상" value={password} onChange={e=>setPassword(e.target.value)} style={{ padding: 10, fontSize: 16 }} required />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" style={{ padding: 12, fontSize: 16, background: '#2b90d9', color: 'white', border: 0, borderRadius: 8 }}>
          회원가입 / Signup
        </button>
      </form>
      <p style={{ marginTop: 20 }}>
        <a href="/auth/login">로그인 / Login</a>
      </p>
    </div>
  );
}