// app/usersui/[username]/_components/themes/themeex/ThemeTheme.tsx 
// - ✅ myapp41 + myapp45 + myapp50 + myapp51 + myapp52 + myapp53 + myapp54 + myapp56 + myapp59

'use client';
import { useTheme } from '@/lib/theme';
import type { ThemeName } from '../themeNames'; // ✅ myapp28
import { themeNames } from '../themeNames';
import { useEffect, useState,useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FollowersList from './FollowersList'; // ✅ myapp43
import FollowingList from './FollowingList'; // ✅ myapp43
import NotificationsList from './NotificationsList'; // ✅ myapp44
import TimelineList from './TimelineList'; // ✅ myapp54


const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

// ✅ deprecated(myapp53)-myapp51 - 토큰가져오가 , url 경로보정 / Retrieve token, adjust URL path
// ✅ myapp53 - 토큰 제거, 쿠키 인증만 사용 / cookie auth only
//const getToken = () => localStorage.getItem('access_token') || localStorage.getItem('token') || '';

const toAbsolute = (u: string) => {
  if (!u) return '';
  return u.startsWith('http')? u : `https://${DOMAIN}${u}`;
};

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
    onToggle?.(next, delta); // ✅ 부모 카운터 즉시 +1/-1 / Parent counter +1/-1 immediately.

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
export function Theme({ timeline : initialTimeline, username, initialView, onBoost, onLike, onShare }: any) {
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

  // ✅ myapp51 - image upload
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // ✅ myapp56 - Home, Local, Federated 탭 선택 상태 / Home, Local, Federated tab selection state
  const [tab, setTab] = useState<'home'|'local'|'federated'>('home');

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
      // ✅ myapp53 - cookie auth only
      //const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
      const res = await fetch(`/api/v1/statuses/${postId}`, { 
        method: 'DELETE',
        // headers: {
        //   ...(token? { Authorization: `Bearer ${token}` } : {})
        // },
        credentials: 'include' // refresh_token 쿠키 포함 / Include refresh_token cookie
      });
      if (res.ok) {
        setTimeline((prev: any[]) => prev.filter((t: any) => t.id !== postId && t.original_id !== postId));
        console.log(`🗑 Delete ${postId} ok`);
      } else {
        const err = await res.json().catch(()=>({}));
        console.error('delete failed', err);
        alert(`삭제 실패 / deletion failed: ${err.error || res.status}`);
      }
    } catch (e) {
      console.error(e);
      alert('삭제 실패 / Deletion failed');
    }
  };


  // ✅ myapp48 + myapp51 + myapp53 : write post + image + reset attachemt list and preview
  const handlePost = async () => {
    if (!composeText.trim() || posting) return;
    setPosting(true);
    try {
      // 토큰 있으면 헤더에 넣고 없으면 쿠키 인증으로
      // Include the token in the header if present; otherwise, use cookie authentication.
      // ✅ myapp53 - cookie auth only
      const res = await fetch('/api/v1/statuses', {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        //    ...(token? { Authorization: `Bearer ${token}` } : {})
        // },
        headers: {
          'Content-Type': 'application/json' // ✅ myapp54 edit: add Content-Type header for JSON
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: composeText, 
          visibility: composeVis, 
          media_ids: mediaIds // ✅ myapp51 - add media_ids
        })
      });

      if (res.ok) {
        const newPost = await res.json();
        setComposeText('');
        setMediaIds([]); // ✅ myapp53 - 첨부 리스트 초기화 / Reset attachment list
        setPreviews([]); // ✅ myapp53 - 프리뷰 초기화 / Reset Preview
        // 타임라인 맨 위에 즉시 추가 / Add immediately to the top of the timeline
        setTimeline((prev: any[]) => [{
          id: newPost.id, content: newPost.content, actor: `https://${DOMAIN}/users/${username}`,
          username: username, 
          created_at: new Date().toISOString(), 
          source: 'local', 
          isMine: true, 
          visibility: composeVis,
          media_attachments: newPost.media_attachments || [] // ✅ myap51 - preview
        },...prev]);
        setCounts(c => ({...c, posts: c.posts + 1}));
      } else alert('게시 실패');
      } catch (e) { console.error(e); alert('게시 실패'); }
    setPosting(false);
    
  };

// ✅ myapp51 : image upload
 async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const failed: string[] = []; // ✅ myapp52 - 실패 모음  / Compilation of Failures
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (mediaIds.length + files.length > 4) return alert('이미지는 최대 4개까지 / Up to 4 images.');

    setUploading(true);
    // ✅ myapp53 - Cookie auth only
    //const token = getToken();
    try {
      for(const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/v1/media', {
          method: 'POST',
          body: fd,
          //headers: {...(token? { Authorization: `Bearer ${token}` } : {}) },// ✅ myapp53 - Cookie auth only
          credentials: 'include'
        });
        // if (!res.ok) {
        //   const err = await res.json().catch(()=>({}));
        //   throw new Error(err.error || 'upload fail');
        // }
        // ✅ myapp52 - 경고창 한번만 띄우기 / Show warning dialog only once
          if (!res.ok) {
            const err = await res.json().catch(()=>({}));
            failed.push(`${file.name}: ${err.error || 'upload fail'}`);
            continue;
          }
        const data = await res.json();
        // data = { id, url, preview_url... }
        setMediaIds(prev => [...prev, data.id]);
        setPreviews(prev => [...prev, toAbsolute(data.preview_url || data.url)]);
      } // end for

      // ✅ myapp52 - 루프 끝나고 경고창 한번만 실행 / Run the warning window only once after the loop finishes.
      if (failed.length > 0) {
        alert(`업로드 실패 / upload failed ${failed.length}개:\n${failed.join('\n')}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`업로드 실패/upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      // 같은 파일 다시 선택 가능하도록 reset / Reset to allow re-selecting the same file.
      e.target.value = '';
    }
  }

 // ✅ myapp52 - 이미지 삭제(프리뷰,서버) / Delete image (preview, server)
  const removePreview = async (idx: number) => {
      const mediaId = mediaIds[idx];
  // 서버에서도 삭제 / Delete from the server as well
  try {
    await fetch(`/api/v1/media/${mediaId}`, { method: 'DELETE', credentials: 'include' });
  } catch {}
    setMediaIds(prev => prev.filter((_, i) => i!== idx));
    setPreviews(prev => prev.filter((_, i) => i!== idx));
  };

  // ✅ myapp53-boost-secure: 부스트 보안강화 Boost Security Enhancement
  const handleBoostClick = async (p: any) => {
    if (!currentUser) return window.location.href = `/auth/login?next=/@${username}`;
    onBoost(p)
  };

  // ✅ myapp53-boost-secure: 좋아요 보안강화 / Like Security Enhancement
  const handleLikeClick = (p: any) => {
    if (!currentUser) return window.location.href = `/auth/login?next=/@${username}`;
    onLike(p);
  };

  // ✅ myapp56 
  // - Home / Local / Federated 탭 로직 
  // / Home / Local / Federated tab logic
  useEffect(() => {
    if (view !== 'timeline') return;
    // 프로필 페이지면 username 기반, 아니면 type 기반
    // If it's a profile page, use username-based; otherwise, use type-based.
    const url = tab === 'home' 
      ? `/api/timeline?username=${username}&type=home`
      : `/api/timeline?type=${tab}`;

    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(data => setTimeline(data))
      .catch(e => console.error('tab fetch fail', e));
  }, [tab, username, view]);


  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] max-w- mx-auto w-full min-h-screen bg-white">
      {/* Nav */}
      <nav className="p-4 border-b md:border-b-0 md:border-r border-[#e6ecf0] md:sticky md:top-0 md:h-screen flex flex-row md:flex-col flex-wrap md:flex-nowrap gap-2 bg-[#fafafe] md:overflow-y-auto">
        <h2 className="text-xl font-bold w-full md:w-auto mb-0 md:mb-3">🐘 {username}/ Pinafore</h2>

        <button
          onClick={(e) => switchView(e, 'timeline')}
          className={`text-left px-3 py-2.5 border border-[#e6ecf0] bg-white rounded-md cursor-pointer hover:bg-gray-100 ${view === 'timeline'? 'font-extrabold' : 'font-normal'}`}
        >
          🏠 Home
        </button>
        <button
          onClick={(e) => switchView(e, 'notifications')}
          className={`text-left px-3 py-2.5 border border-[#e6ecf0] bg-white rounded-md cursor-pointer hover:bg-gray-100 ${view === 'notifications'? 'font-extrabold' : 'font-normal'}`}
        >
          🔔 Notifications
        </button>

        <select
          value={theme || themeNames[0]}
          onChange={handleChange}
          className="text-left px-3 py-2.5 border border-[#e6ecf0] bg-white rounded-md cursor-pointer w-full"
        >
          {themeNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <div className="text- text-[#999] mt-2 w-full">current: {theme}</div>

        {isMe && (
          <div className="mt-auto w-full bg-white border border-[#e6ecf0] rounded-xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <textarea
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="무슨 일이 일어나고 있나요?"
              maxLength={500}
              className="w-full h-20 resize-none border border-[#e6ecf0] rounded-lg p-2 text-sm outline-none focus:border-[#6364ff]"
            />

            <div className="flex gap-2 items-center mt-2.5">
              <label className="w-8 h-8 flex items-center justify-center border border-[#e6ecf0] rounded-full bg-white cursor-pointer hover:bg-[#f3f4ff] hover:border-[#6364ff] transition-colors">
                🖼
                <input type="file" multiple accept="image/*" onChange={onFiles} className="hidden" />
              </label>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative rounded- overflow-hidden border border-[#e6ecf0] bg-[#f9fafb]">
                    <img src={src} alt="preview" className="w-full h- object-cover block" />
                    <button className="absolute top-1 right-1 w-5 h-5 border-none rounded-full bg-black/65 text-white text-sm cursor-pointer flex items-center justify-center" onClick={() => removePreview(idx)}>×</button>
                  </div>
                ))}
              </div>
            )}

            {uploading && <div className="text-xs text-[#6364ff] mt-1.5">📤 업로드 중 / uploading...</div>}

            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1.5 items-center">
                <select value={composeVis} onChange={(e) => setComposeVis(e.target.value as any)} className="px-1.5 py-1 text-xs rounded-md border">
                  <option value="public">🌍 공개/public</option>
                  <option value="unlisted">🔓 미등록/unlisted</option>
                  <option value="private">🔒 팔로워만/private</option>
                </select>
              </div>
              <button onClick={handlePost} disabled={posting ||!composeText.trim()} className="bg-[#6364ff] text-white border-none px-4 py-1.5 rounded-full font-bold cursor-pointer text- disabled:opacity-40 disabled:cursor-not-allowed">
                {posting? '...' : 'submit'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main */}
      <main className="bg-white border-r border-[#e6ecf0] min-h-screen">
        <div className="border-b border-[#e6ecf0] bg-white">
          <div className="h- bg-gradient-to-r from-[#6364ff] to-[#a855f7] bg-cover bg-center" style={profile?.header? { backgroundImage: `url(${profile.header})` } : {}} />
          <div className="p-4 relative">
            <div className="flex justify-between items-end -mt-12">
              {profile?.avatar? (
                <img src={profile.avatar} className="w-20 h-20 object-cover bg-white border-4 border-white rounded-full" alt="avatar" />
              ) : (
                <div className="border-4 border-white rounded-full">
                  <Avatar actor={profile?.url || username} username={username} size={80} />
                </div>
              )}
              <div>
                {isMe? (
                  <button className="px-4 py-1.5 border border-[#ccd6dd] bg-white rounded- font-bold cursor-pointer text-sm mx-2 hover:bg-gray-100">프로필 편집/Edit Profile</button>
                ) : (
                  <FollowButton username={username} initialFollowing={profile?.following || false} currentUser={currentUser} onToggle={handleFollowToggle} />
                )}
              </div>
            </div>

            <div className="mt-2">
              <div className="text- font-extrabold leading-tight">{profile?.display_name || username}</div>
              <div className="text-sm text-[#657786] mt-0.5">@{profile?.acct || `${username}@${DOMAIN || 'aloy-horizon.duckdns.org'}`}</div>
              {profile?.note && <div className="mt-2.5 text-sm leading-snug whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: profile.note }} />}
              {!profile?.note && profile?.summary && <div className="mt-2.5 text-sm leading-snug whitespace-pre-wrap break-words">{profile.summary}</div>}
            </div>

            <div className="flex gap-4 mt-3 text-sm">
              <a href={`/@${username}/following`} onClick={(e) => switchView(e, 'following')} className="text-inherit no-underline flex gap-1 hover:underline">
                <b className="font-bold">{counts.following}</b> <span className="text-[#657786]">팔로잉/Followng</span>
              </a>
              <a href={`/@${username}/followers`} onClick={(e) => switchView(e, 'followers')} className="text-inherit no-underline flex gap-1 hover:underline">
                <b className="font-bold">{counts.followers}</b> <span className="text-[#657786]">팔로워/Follower</span>
              </a>
              <a href={`/@${username}`} onClick={(e) => switchView(e, 'timeline')} className="text-inherit no-underline flex gap-1 hover:underline">
                <b className="font-bold">{counts.posts}</b> <span className="text-[#657786]">게시물/Toots</span>
              </a>
            </div>

            <div className="mt-2.5 text- text-[#657786] flex gap-3">
              <span>📅 가입/Signup {profile?.created_at? new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) : '9월 01일'}</span>
            </div>

            <div className="flex border-t border-[#e6ecf0] mt-3">
              <button className={`flex-1 py-3.5 bg-none border-none border-b-2 cursor-pointer text-sm font-medium ${activeTab === 'activity'? 'text-black font-bold border-[#6364ff]' : 'text-[#657786] border-transparent'}`} onClick={() => setActiveTab('activity')}>활동/activity</button>
              <button className={`flex-1 py-3.5 bg-none border-none border-b-2 cursor-pointer text-sm font-medium ${activeTab === 'media'? 'text-black font-bold border-[#6364ff]' : 'text-[#657786] border-transparent'}`} onClick={() => setActiveTab('media')}>미디어/media</button>
            </div>
          </div>
        </div>

          {/** ✅ myapp43 + myapp44 - timeline,following list, follower list, notifications */}

          {view === 'timeline' && (
            <>
            {/* ✅ myapp56 - ADD Dropdown(Home/Local/Federated Tabs ) */}

              <TimelineList
                timeline={timeline}
                tab={tab}
                onTabChange={setTab}
                currentUser={currentUser}
                onDelete={handleDelete}
                onBoost={handleBoostClick}
                onLike={handleLikeClick}
                onShare={onShare}
              />
            </>
          )} {/* end view === 'timeline' */}

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
      </div>{/* div className="pinafore-layout" */}
    </>
  );
}