// app/usersui/[username]/_components/themes/pinafore/PinaforeTheme.tsx 
// - ✅ myapp41 + myapp45 + myapp50 + myapp51 + myapp52 + myapp53 + myapp54 + myapp56
// myap60
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
// ✅ myapp44 - move to TimelineList.tsx
// function getDisplayName(actorOrUsername: string) {
//   if (!actorOrUsername) return 'unknown';
//   if (actorOrUsername.startsWith('https://')) {
//     try {
//       const url = new URL(actorOrUsername);
//       const username = url.pathname.split('/').pop() || 'user';
//       return `${username}@${url.hostname}`;
//     } catch { return actorOrUsername.split('/').pop() || actorOrUsername; }
//   }
//   return actorOrUsername;
// }

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
export function MainTheme({ timeline : initialTimeline, username, initialView, onBoost, onLike, onShare }: any) {
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

       /* ✅ myapp51 - composer-choice + preview */
       .composer-choice { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
       .composer-choice label { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid #e6ecf0; border-radius: 50%; background: white; cursor: pointer; transition: background 0.15s; }
       .composer-choice label:hover { background: #f3f4ff; border-color: #6364ff; }
       .composer-previews { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
       .preview-item { position: relative; border-radius: 10px; overflow: hidden; border: 1px solid #e6ecf0; background: #f9fafb; }
       .preview-item img { width: 100%; height: 90px; object-fit: cover; display: block; }
       .preview-remove { position: absolute; top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 50%;
          background: rgba(0,0,0,0.65);
          color: white;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
       }
       .status-media {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
          border-radius: 12px;
          overflow: hidden;
       }
       .status-media.single { grid-template-columns: 1fr; }
       .status-media img {
          width: 100%;
          max-height: 320px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #e6ecf0;
       }
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

              {/* ✅ myapp51 - 이미지 선택 버튼 / Image selection button*/}
              <div className="composer-choice">
                  <label style={{cursor:'pointer', fontSize:18, padding:'2px 6px', border:'1px solid #e6ecf0', borderRadius:6, background:'white'}}>
                    🖼️
                    <input type="file" multiple accept="image/*" onChange={onFiles} style={{display:'none'}} />
                  </label>
              </div>

              {/* ✅ myapp51 - image preview  */}
              {previews.length > 0 && (
                <div className="composer-previews">
                  {previews.map((src, idx) => (
                    <div key={idx} className="preview-item">
                      <img src={src} alt="preview" />
                      <button className="preview-remove" onClick={() => removePreview(idx)}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && <div style={{fontSize:12, color:'#6364ff', marginTop:6}}>📤 업로드 중 / uploading...</div>}


              <div className="composer-foot">
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  <select value={composeVis} onChange={(e) => setComposeVis(e.target.value as any)}>
                    <option value="public">🌍 공개/public</option>
                    <option value="unlisted">🔓 미등록/unlisted</option>
                    <option value="private">🔒 팔로워만/private</option>
                  </select>
                </div>

                <button onClick={handlePost} disabled={posting ||!composeText.trim()}>
                  {posting? '...' : 'submit'}
                </button>

              </div>{/* /div className=compose-foot */}
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