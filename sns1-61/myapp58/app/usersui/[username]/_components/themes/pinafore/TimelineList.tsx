// app/usersui/[username]/_components/themes/pinafore/TimelineList.tsx
// ✅ myapp54 - 타임라인 분리 / Timeline Separation
// ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs

'use client';

import { useState } from "react";

const DOMAIN = process.env.DOMAIN || 'aloy-horizon.duckdns.org';

const toAbsolute = (u: string) => {
  if (!u) return '';
  return u.startsWith('http') ? u : `https://${DOMAIN}${u}`;
};

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

// ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs
type TabType = 'home' | 'local' | 'federated';
type Props = {
  timeline: any[];
  currentUser: string | null;
  tab: TabType;
  onTabChange: (t: TabType) => void;
  onDelete: (id: string) => void;
  onBoost: (p: any) => void;
  onLike: (p: any) => void;
  onShare: (p: any) => void;
};

export default function TimelineList({ 
  timeline, currentUser, tab, onTabChange, onDelete, onBoost, onLike, onShare }: Props) {
  const [showDropdown, setShowDropdown] = useState(false); // ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs

  if (timeline.length === 0) {
    return <div style={{ padding: 20, color: '#999' }}>타임라인이 비어있습니다 / No posts</div>;
  }

  return (
    <>
      <style>{`
             /* ✅ myapp56 - timeline source tabs */
            .timeline-dropdown-wrap {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 16px;
              border-bottom: 1px solid #e6ecf0;
              background: white;
              position: sticky;
              top: 0;
              z-index: 5;
            }
            .timeline-dropdown { position: relative; }
            .dropdown-toggle {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 14px;
              border: 1px solid #e6ecf0;
              border-radius: 20px;
              background: white;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            }
            .dropdown-toggle:hover { background: #f3f4f6; }
            .dropdown-arrow { font-size: 10px; color: #999; margin-left: 4px; }
            .dropdown-menu {
              position: absolute;
              top: 100%;
              left: 0;
              margin-top: 8px;
              width: 220px;
              background: white;
              border: 1px solid #e6ecf0;
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.12);
              overflow: hidden;
              z-index: 10;
            }
            .dropdown-menu button {
              width: 100%;
              display: flex;
              gap: 12px;
              align-items: center;
              padding: 12px 14px;
              border: none;
              background: white;
              text-align: left;
              cursor: pointer;
            }
            .dropdown-menu button:hover { background: #f7f9fa; }
            .dropdown-menu button.active { background: #fafafe; }
            .dropdown-menu button span:first-child { font-size: 18px; }
            .dropdown-menu button div { display: flex; flex-direction: column; }
            .dropdown-menu button b { font-size: 14px; }
            .dropdown-menu button small { font-size: 11px; color: #657786; }
            .timeline-count { font-size: 12px; color: #999; }
      
      `}</style>

      {/* ✅ myapp56 - Hom,Local,Federated 탭 추가 / Add Hom, Local, Federated Tabs */}
      <div className="timeline-dropdown-wrap">
        <div className="timeline-dropdown">
          <button className="dropdown-toggle" onClick={()=>setShowDropdown(!showDropdown)}>
            <span>{tab==='home'?'🏠': tab==='local'?'🏘':'🌍'}</span>
            <span>{tab}</span>
            <span>{showDropdown?'▲':'▼'}</span>
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <button className={tab==='home'?'active':''} onClick={()=>{onTabChange('home'); setShowDropdown(false);}}>
              <span>🏠</span>
              <div>
                <b>Home</b>
                <small>팔로우한 사람들/People you follow</small>
              </div>
              </button>
              <button className={tab==='local'?'active':''} onClick={()=>{onTabChange('local'); setShowDropdown(false);}}>
                <span>🏘</span>
                <div>
                  <b>Local</b>
                  <small> 내 서버 글/My server posts</small>
                </div>
                </button>
              <button className={tab==='federated'?'active':''} onClick={()=>{onTabChange('federated'); setShowDropdown(false);}}>
                <span>🌍</span>
                <div>
                  <b>Federated</b>
                  <small>페디버스/fediverse</small>
                </div>
              </button>
            </div>
          )}
        </div>
        <div className="timeline-count">{timeline.length} toots</div>
      </div>

      {timeline.map((p: any) => (
        <article key={`${p.source}-${p.id}`} className="pinafore-status">
          <Avatar actor={p.actor} username={p.username} />
          <div className="status-content">
            <div className="status-header">
              <b>{getDisplayName(p.actor)}</b>
              <span className="status-time">{new Date(p.created_at).toLocaleString()}</span>
              {p.isBoostedPost && <span className="boost-label">🔁 {getDisplayName(p.actor)}</span>}
              {currentUser && p.isMine && (
                <button onClick={() => onDelete(p.id)} style={{ color: '#e0245e', marginLeft: 'auto' }}>
                  🗑 Delete
                </button>
              )}
            </div>
            <div className="status-text" dangerouslySetInnerHTML={{ __html: p.content }} />
            {p.media_attachments && p.media_attachments.length > 0 && (
              <div className={`status-media ${p.media_attachments.length === 1 ? 'single' : ''}`}>
                {p.media_attachments.map((m: any) => (
                  <img key={m.id} src={toAbsolute(m.preview_url || m.url)} alt="media" loading="lazy" />
                ))}
              </div>
            )}
            <div className="status-actions">
              <button onClick={() => onBoost(p)} className={p.isMyBoost ? 'boosted' : ''}>🔁 {p.boostCount || ''}</button>
              <button onClick={() => onLike(p)} className={p.isMyLike ? 'liked' : ''}>⭐ {p.likeCount || ''}</button>
              <button onClick={() => onShare(p)}>✈</button>
              <button>💬</button>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
