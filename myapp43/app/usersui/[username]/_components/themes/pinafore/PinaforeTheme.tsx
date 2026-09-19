// app/usersui/[username]/_components/themes/pinafore/PinaforeTheme.tsx - ✅ myapp41
'use client';
import { useTheme } from '@/lib/theme';
import type { ThemeName } from '../themeNames'; // ✅ myapp28
import { themeNames } from '../themeNames';
import { useEffect, useState,useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FollowersList from './FollowersList'; // ✅ myapp43
import FollowingList from './FollowingList'; // ✅ myapp43

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';


// ✅ myapp41 - add size
// - Avatar
function Avatar({ actor, username, size = 46 }: { actor: string, username: string, size?: number }) {
  const seed = actor?.startsWith('https://')
  ? (() => { try { return new URL(actor).pathname.split('/').pop() || username } catch { return username } })()
    : actor || username;
  const initial = (seed?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#6364ff', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', fontSize: size * 0.4, flexShrink: 0
    }}>{initial}</div>
  );
}

function getDisplayName(actorOrUsername: string) {
  if (!actorOrUsername) return 'unknown';
  if (actorOrUsername.startsWith('https://')) {
    try {
      const url = new URL(actorOrUsername);
      const username = url.pathname.split('/').pop() || 'user';
      return `${username}@${url.hostname}`;
    } catch { return actorOrUsername.split('/').pop() || actorOrUsername; }
  }
  return actorOrUsername;
}

// ✅ myapp41 - FollowButton(Unfollow)
// 1. FollowButton prop 이름 통일! onCountChange -> onToggle
function FollowButton({ username, initialFollowing, currentUser, onToggle }: {
  username: string,
  initialFollowing: boolean,
  currentUser: string | null,
  onToggle?: (isNowFollowing: boolean, delta: number) => void
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setFollowing(initialFollowing); }, [initialFollowing, username]);

  const toggle = async () => {
    if (!currentUser) return window.location.href = `/auth/login?next=/usersui/${username}`;
    if (loading) return;

    const prev = following;
    const next =!prev;
    const delta = next? 1 : -1;

    setFollowing(next);
    onToggle?.(next, delta); // ✅ 부모 카운터 즉시 +1/-1!

    setLoading(true);
    try {
      const res = await fetch('/api/follow', {
        method: prev? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target: `https://${DOMAIN}/users/${username}` })
      });
      if (!res.ok) {
        setFollowing(prev);
        onToggle?.(prev, -delta); // 롤백
      }
    } catch {
      setFollowing(prev);
      onToggle?.(prev, -delta);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={following? 'profile-edit-btn' : 'profile-follow-btn'}
    >
      {following? 'Following' : 'Follow'}
    </button>
  );
}

export function PinaforeTheme({ timeline, username, initialView, onBoost, onLike }: any) {
  const { theme, setTheme } = useTheme();
  
  // ✅ myapp43
  const [view, setView] = useState<'timeline' | 'followers' | 'following'>(initialView || 'timeline');

  const [profile, setProfile] = useState<any>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0, posts: 0 });
  const [activeTab, setActiveTab] = useState<'activity' | 'media'>('activity');
  const [isMe, setIsMe] = useState(false); // for login
  const [currentUser, setCurrentUser] = useState<string | null>(null); // for folow button


  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeName;
    console.log('🔄 select change ->', newTheme);

    // Context Update
    setTheme(newTheme);
  };

  // ✅ myapp41 - 프로필 stats 불러오기,로그인정보 체크
  // Load profile stats, check login information.
  // - 프로필 재조회 / Refresh Profile
    const refetchProfile = useCallback(async () => {
    const r = await fetch(`/api/v1/accounts/${username}?_=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (!r.ok) return;
    const data = await r.json();
    setProfile(data);
    setCounts({
      followers: data.followers_count || 0,
      following: data.following_count || 0,
      posts: data.statuses_count || 0
    });
  }, [username]);

  // ✅ 초기 로드 / Initial load
  useEffect(() => {
    setProfile(null);
    setCounts({ followers: 0, following: 0, posts: 0 });
    setIsMe(false);
    setCurrentUser(null);

    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    .then(r => r.ok? r.json() : null)
    .then(d => {
        if (d?.username) {
          setCurrentUser(d.username);
          if (d.username === username) setIsMe(true);
        }
      });

    refetchProfile();
  }, [username, refetchProfile]);

  // ✅ 팔로우 토글 핸들러 - 카운터 즉시 반영
  // Follow Toggle Handler – Immediate Counter Update
  const handleFollowToggle = (isNowFollowing: boolean, delta: number) => {
    // 1. 낙관적 카운터 업데이트 / Optimistic counter update
    setCounts(c => ({...c, followers: Math.max(0, c.followers + delta) }));
    setProfile((p: any) => p? ({
    ...p,
      followers_count: Math.max(0, (p.followers_count || 0) + delta),
      following: isNowFollowing
    }) : p);

    // 2. 600ms 후 서버 값으로 정확히 재동기화
    // Resynchronize exactly to the server value after 600ms.
    setTimeout(refetchProfile, 600);
  };

  // ✅ myapp43 -  링크 관점: 페이지 이동 없이 슬롯만 교체! 
  // Link Perspective: Swap only the slot without navigating to a new page!
  const switchView = (e: React.MouseEvent, v: typeof view) => {
    e.preventDefault();
    setView(v);
    const url = v === 'timeline'? `/@${username}` : `/@${username}/${v}`;
    window.history.pushState({}, '', url);
  };

  return (
    <>
      <style>{`
       .pinafore-layout { display: grid; grid-template-columns: 280px 1fr; max-width: 1200px; margin: 0 auto; width: 100%; min-height: 100vh; background: white; }
       .pinafore-nav { padding: 16px; border-right: 1px solid #e6ecf0; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 8px; background: #fafafe; }
       .pinafore-nav h2 { font-size: 20px; margin: 0 0 12px 0; }
       .pinafore-nav button,.pinafore-nav select { text-align: left; padding: 10px 12px; border: 1px solid #e6ecf0; background: white; border-radius: 6px; cursor: pointer; }
       .pinafore-nav button:hover { background: #f3f4f6; }
       .pinafore-timeline { background: white; border-right: 1px solid #e6ecf0; min-height: 100vh; }
       .pinafore-status { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e6ecf0; }
       .status-content { flex: 1; min-width: 0; }
       .status-header { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
       .status-time { color: #999; font-size: 12px; }
       .boost-label { color: #16a34a; font-size: 12px; background: #dcfce7; padding: 2px 6px; border-radius: 4px; }
       .status-text { margin: 8px 0; line-height: 1.4; word-break: break-word; }
       .status-text p { margin: 0; }
       .status-actions { display: flex; gap: 16px; margin-top: 8px; }
       .status-actions button { background: none; border: none; cursor: pointer; color: #999; padding: 4px 8px; border-radius: 12px; }
       .status-actions button:hover { background: #f3f4f6; color: #333; }
       .status-actions button.boosted { color: #1b9c59; font-weight: bold; background: #dcfce7; }
       .status-actions button.liked { color: #e0245e; background: #ffe4e6; }

       /* ✅ myapp41 - 프로필 헤더 / Profile Header */
       .profile-header { border-bottom: 1px solid #e6ecf0; background: white; }
       .profile-banner { height: 180px; background: linear-gradient(90deg, #6364ff 0%, #a855f7 100%); background-size: cover; background-position: center; }
       .profile-info { padding: 16px; position: relative; }
       .profile-avatar-wrap { margin-top: -48px; display: flex; justify-content: space-between; align-items: flex-end; }
       .profile-avatar-wrap img,.profile-avatar-wrap div { border: 4px solid white; border-radius: 50%; }
       .profile-edit-btn { padding: 6px 16px; border: 1px solid #ccd6dd; background: white; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; margin-left:8px; margin-right:8px;}
       .profile-edit-btn:hover { background: #f3f4f6; }
       .profile-follow-btn { padding: 6px 16px; border: 1px solid #ccd6dd; background: #6364ff; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; color: #f0f2f4;}
       .profile-follow-btn:hover { background: #f3f4f6; color: #000;}
       .profile-names { margin-top: 8px; }
       .profile-display { font-size: 19px; font-weight: 800; line-height: 1.2; }
       .profile-acct { font-size: 14px; color: #657786; margin-top: 2px; }
       .profile-note { margin-top: 10px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
       .profile-stats { display: flex; gap: 16px; margin-top: 12px; font-size: 14px; }
       .profile-stats a { color: inherit; text-decoration: none; display: flex; gap: 4px; }
       .profile-stats a:hover { text-decoration: underline; }
       .profile-stats b { font-weight: 700; }
       .profile-stats span { color: #657786; }
       .profile-meta { margin-top: 10px; font-size: 13px; color: #657786; display: flex; gap: 12px; }
       .profile-tabs { display: flex; border-top: 1px solid #e6ecf0; margin-top: 12px; }
       .profile-tabs button { flex: 1; padding: 14px 0; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 14px; font-weight: 500; color: #657786; }
       .profile-tabs button.active { color: #000; font-weight: 700; border-bottom-color: #6364ff; }


        @media(max-width: 768px) {
         .pinafore-layout { grid-template-columns: 1fr; }
         .pinafore-nav { height: auto; position: static; border-right: none; border-bottom: 1px solid #e6ecf0; flex-direction: row; flex-wrap: wrap; }
        }
      `}</style>

      <div className="pinafore-layout">
        <nav className="pinafore-nav">
          <h2>🐘 {username}/ Pinafore</h2>
          <button>🏠 Home</button>
          <button>🔔 Notifications</button>
          {/* <button>👤 Profile</button> */}

          {/* ✅ myapp27 - ../themeNames.ts*/}
          <select value={theme || themeNames[0]} onChange={handleChange}>
            {themeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>current: {theme}</div>
        </nav>

        <main className="pinafore-timeline">

          {/* ✅ myapp41 - Timeline Header */}
         <div className="profile-header">
            <div className="profile-banner" style={profile?.header? { backgroundImage: `url(${profile.header})` } : {}} />
            <div className="profile-info">
              <div className="profile-avatar-wrap">
                {profile?.avatar? (
                  <img src={profile.avatar} style={{ width: 80, height: 80, objectFit: 'cover', background: 'white' }} alt="avatar" />
                ) : (
                  <Avatar actor={profile?.url || username} username={username} size={80} />
                )}
                <div>
                  {/* - 로그인하면 프로필 편집 로그인 후 팔로우버튼 / Log in to edit profile; follow button appears after logging in. */ }
                  {isMe? (
                    <>
                    {/* 팔로우,언팔로우 버튼 / follow, unfollow button */ }
                    {/* <FollowButton username={username} initialFollowing={profile?.following || false} currentUser={currentUser} /> */}
                    <button className="profile-edit-btn">프로필 편집/Edit Profile</button>
                    </>
                  ) : ( 
                      <FollowButton username={username} 
                        initialFollowing={profile?.following || false} 
                        currentUser={currentUser} 
                        onToggle={handleFollowToggle} 
                      />)}
                </div>
              </div>

              <div className="profile-names">
                <div className="profile-display">{profile?.display_name || username}</div>
                <div className="profile-acct">@{profile?.acct || `${username}@${DOMAIN || 'aloy-horizon.duckdns.org'}`}</div>
                {profile?.note && <div className="profile-note" dangerouslySetInnerHTML={{ __html: profile.note }} />}
                {!profile?.note && profile?.summary && <div className="profile-note">{profile.summary}</div>}
              </div>

              <div className="profile-stats">
                {/* -- Before -- */}
                {/* <a href={`/usersui/${username}/following`}> */}
                {/* <a href={`/@${username}/following`}>
                  <b>{counts.following}</b> <span>팔로잉/following</span> //following 
                </a> */}
                {/* <a href={`/usersui/${username}/followers`}> */}
                 {/* <a href={`/@${username}/followers`}>
                  <b>{counts.followers}</b> <span>팔로워/follower</span>// follower //
                </a> */}
                {/* <a href={`/usersui/${username}`}>
                  <b>{counts.posts}</b> <span>게시물/Posts</span> // Toots
                </a> */}

                {/* -- After -- */}
                <a href={`/@${username}/following`} onClick={(e) => switchView(e, 'following')}>
                  <b>{counts.following}</b> <span>팔로잉/Followng</span>
                </a>
                <a href={`/@${username}/followers`} onClick={(e) => switchView(e, 'followers')}>
                  <b>{counts.followers}</b> <span>팔로워/Follower</span>
                </a>
                <a href={`/@${username}`} onClick={(e) => switchView(e, 'timeline')}>
                  <b>{counts.posts}</b> <span>게시물/Toots</span>
                </a>
              </div>

              <div className="profile-meta">
                <span>📅 가입 {profile?.created_at? new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) : '9월 01일'}</span>
              </div>

              <div className="profile-tabs">
                <button className={activeTab === 'activity'? 'active' : ''} onClick={() => setActiveTab('activity')}>활동</button>{ /*  */}
                <button className={activeTab === 'media'? 'active' : ''} onClick={() => setActiveTab('media')}>미디어/media</button>{/* media */}
              </div>
            </div>
          </div>

          {/** ✅ myapp43 - timeline,following list, follower list */}
          {view === 'timeline' && (
            <>
            {timeline.length === 0 && (
              <div style={{ padding: 20, color: '#999' }}>타임라인이 비어있습니다 / No posts</div>
            )}
            {timeline.map((p: any) => (
        
              <article key={`${p.source}-${p.id}`} className="pinafore-status">
                <Avatar actor={p.actor} username={p.username} />
                <div className="status-content">
                  <div className="status-header">
                    <b>{getDisplayName(p.actor)}</b>
                    <span className="status-time">{new Date(p.created_at).toLocaleString()}</span>
                    {p.source === 'inbox' && <span className="boost-label">🔁 boosted</span>}
                  </div>
                  <div className="status-text" dangerouslySetInnerHTML={{ __html: p.content }} />
                  <div className="status-actions">
                    <button onClick={() => onBoost(p)} className={p.isMyBoost? 'boosted' : ''}>🔁 {p.boostCount || ''}</button>
                    <button onClick={() => onLike(p)} className={p.isMyLike? 'liked' : ''}>⭐ {p.likeCount || ''}</button>
                    <button>💬</button>
                  </div>
                </div>
              </article>

            ))}
            </>
          )}

          {view === 'followers' && (
            <FollowersList username={username} style={{ padding: '0' }} />
          )}

          {view === 'following' && (
            <FollowingList username={username} style={{ padding: '0' }} />
          )}

        </main>
      </div>
    </>
  );
}