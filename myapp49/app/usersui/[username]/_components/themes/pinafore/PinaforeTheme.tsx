// app/usersui/[username]/_components/themes/pinafore/PinaforeTheme.tsx - ✅ myapp41 + myapp45
'use client';
import { useTheme } from '@/lib/theme';
import type { ThemeName } from '../themeNames'; // ✅ myapp28
import { themeNames } from '../themeNames';
import { useEffect, useState,useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FollowersList from './FollowersList'; // ✅ myapp43
import FollowingList from './FollowingList'; // ✅ myapp43
import NotificationsList from './NotificationsList'; // ✅ myapp44


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
// ✅ myapp45 - timeline == iniitialTimeline(like alias, not type)
export function PinaforeTheme({ timeline : initialTimeline, username, initialView, onBoost, onLike }: any) {
  const { theme, setTheme } = useTheme();
  
  // ✅ myapp43 + myapp44
  const [view, setView] = useState<'timeline' | 'followers' | 'following' | 'notifications'>(initialView || 'timeline');

  const [profile, setProfile] = useState<any>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0, posts: 0 });
  const [activeTab, setActiveTab] = useState<'activity' | 'media'>('activity');
  const [isMe, setIsMe] = useState(false); // for login
  const [currentUser, setCurrentUser] = useState<string | null>(null); // for folow button,delete button

  // ✅ myapp45 - initialTimeline 값이 바뀌면 UI 다시 그리기
  // Redraw the UI when the initialTimeline value changes.
  const [timeline, setTimeline] = useState<any[]>(initialTimeline || []);

  // ✅ myapp48 - writing status
  const [composeText, setComposeText] = useState('');
  const [composeVis, setComposeVis] = useState<'public'|'unlisted'|'private'>('public');
  const [posting, setPosting] = useState(false);

  useEffect(() => { setTimeline(initialTimeline || []); }, [initialTimeline]);

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


// ✅ myapp45: 삭제 핸들러  / Delete handler
const handleDelete = async (postId: string) => {
  if (!confirm('삭제할까? / Delete?')) return;
  try {
    // 기존 DELETE 라우트 사용 / Use the existing DELETE route.
    const res = await fetch(`/api/posts?id=${postId}&username=${currentUser}`, { 
      method: 'DELETE', 
      credentials: 'include' 
    });
    if (res.ok) {
      setTimeline((prev: any[]) => prev.filter((t: any) => t.id !== postId));
      console.log(`🗑️ Delete ${postId} ok`);
    } else {
      alert('삭제 실패 / Deletion failed');
    }
  } catch {
    alert('삭제 실패 / Deletion failed');
  }
};

// ✅ myapp48 : write post
const handlePost = async () => {
  if (!composeText.trim() || posting) return;
  setPosting(true);
  try {
    // 토큰 있으면 헤더에 넣고 없으면 쿠키 인증으로!
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const res = await fetch('/api/v1/statuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
         ...(token? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ status: composeText, visibility: composeVis })
    });
    if (res.ok) {
      const newPost = await res.json();
      setComposeText('');
      // 타임라인 맨 위에 즉시 추가!
      setTimeline((prev: any[]) => [{
        id: newPost.id, content: newPost.content, actor: `https://${DOMAIN}/users/${username}`,
        username: username, created_at: new Date().toISOString(), source: 'local', isMine: true, visibility: composeVis
      },...prev]);
      setCounts(c => ({...c, posts: c.posts + 1}));
    } else alert('게시 실패');
    } catch (e) { console.error(e); alert('게시 실패'); }
  setPosting(false);
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

       /* ✅ myapp48 - composer(write form) */
       .pinafore-composer { margin-top: auto; background: white; border: 1px solid #e6ecf0; border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
       .pinafore-composer textarea { width: 100%; height: 80px; resize: none; border: 1px solid #e6ecf0; border-radius: 8px; padding: 8px; font-size: 14px; outline: none; }
       .pinafore-composer textarea:focus { border-color: #6364ff; }
       .composer-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
       .composer-foot select { padding: 4px 6px; font-size: 12px; border-radius: 6px; }
       .composer-foot button { background: #6364ff; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 13px; }
       .composer-foot button:disabled { opacity: 0.4; cursor: not-allowed; }

        @media(max-width: 768px) {
         .pinafore-layout { grid-template-columns: 1fr; }
         .pinafore-nav { height: auto; position: static; border-right: none; border-bottom: 1px solid #e6ecf0; flex-direction: row; flex-wrap: wrap; }
        }
      `}</style>

      <div className="pinafore-layout">
        <nav className="pinafore-nav">
          <h2>🐘 {username}/ Pinafore</h2>
          {/** ✅ myapp44 */}
          <button 
            onClick={(e) => switchView(e, 'timeline')}
            style={{ fontWeight: view === 'timeline' ? 800 : 400 }}
          >
            🏠 Home
          </button>
          <button 
            onClick={(e) => switchView(e, 'notifications')}
            style={{ fontWeight: view === 'notifications' ? 800 : 400 }}
          >
            🔔 Notifications
          </button>
          {/* <button>👤 Profile</button> */}

          {/* ✅ myapp27 - ../themeNames.ts*/}
          <select value={theme || themeNames[0]} onChange={handleChange}>
            {themeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>current: {theme}</div>
          
          {/* ✅ myapp48 - 좌측 하단 글쓰기 폼(로그인 후) / Writing form at the bottom left (after logging in) */}
          {isMe && (
            <div className="pinafore-composer">
              <textarea
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                placeholder="무슨 일이 일어나고 있나요?"
                maxLength={500}
              />
              <div className="composer-foot">
                <select value={composeVis} onChange={(e) => setComposeVis(e.target.value as any)}>
                  <option value="public">🌍 공개/public</option>
                  <option value="unlisted">🔓 미등록/unlisted</option>
                  <option value="private">🔒 팔로워만/private</option>
                </select>
                <button onClick={handlePost} disabled={posting ||!composeText.trim()}>
                  {posting? '...' : 'submit'}
                </button>
              </div>
            </div>
          )}


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
                {/* -- following,follower,posts links -- */}
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
                <span>📅 가입/Signup {profile?.created_at? new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) : '9월 01일'}</span>
              </div>

              <div className="profile-tabs">
                <button className={activeTab === 'activity'? 'active' : ''} onClick={() => setActiveTab('activity')}>활동/activity</button>{ /*  */}
                <button className={activeTab === 'media'? 'active' : ''} onClick={() => setActiveTab('media')}>미디어/media</button>{/* media */}
              </div>
            </div>
          </div>

          {/** ✅ myapp43 + myapp44 - timeline,following list, follower list, notifications */}
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
                    {/* - Actor */}
                    <b>{getDisplayName(p.actor)}</b>
                    
                    {/* - boosted- */}
                    <span className="status-time">{new Date(p.created_at).toLocaleString()}</span>
                    {/* {p.source === 'inbox' && <span className="boost-label">🔁 boosted</span>} */}
                    {/* ✅ myapp49 - isBoostedPost값이 있으면 부스트 라벨 */}
                    {p.isBoostedPost && (
                      <span className="boost-label">🔁 {getDisplayName(p.actor)}</span>
                    )}


                    {/* - ✅ myapp45 - Delete Posts - */}
                    {currentUser && p.isMine && (
                      <button onClick={() => handleDelete(p.id)} style={{ color: '#e0245e', marginLeft: 'auto' }}>
                        🗑 Delete
                      </button>
                    )}
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

          {view === 'notifications' && (
            <NotificationsList username={username} style={{ padding: '0' }} />
          )}

        </main>
      </div>
    </>
  );
}