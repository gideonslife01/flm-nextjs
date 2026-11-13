// app/usersui/[username]/_components/themes/pinafore/PinaforeTheme.tsx - myapp27 fix ✅
'use client';
import { useTheme } from '@/lib/theme';
import { themeNames } from '../themeNames'; // ✅ myapp27
import { ThemeName } from '..';

function Avatar({ actor, username }: { actor: string, username: string }) {
  const seed = actor?.startsWith('https://')
   ? (() => { try { return new URL(actor).pathname.split('/').pop() || username } catch { return username } })()
    : actor || username;
  const initial = (seed?.[0] || 'U').toUpperCase();
  return (
    <div style={{
      width: 46, height: 46, borderRadius: '50%',
      background: '#6364ff', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 'bold', fontSize: 18, flexShrink: 0
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

export function PinaforeTheme({ timeline, username, onBoost, onLike }: any) {
  const { theme, setTheme } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as ThemeName;
    console.log('🔄 select change ->', newTheme);
    // 1. Context 업데이트
    setTheme(newTheme);
    // 2. localStorage 직접 저장 (혹시 Context가 안 먹어도 보장)
    try {
      localStorage.setItem('theme', newTheme);
      console.log('💾 localStorage saved:', localStorage.getItem('theme'));
    } catch (err) {
      console.error('localStorage error', err);
    }
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
          <button>👤 Profile</button>
          {/* ✅myapp27 - ../themeNames.ts*/}
          <select value={theme || themeNames[0]} onChange={handleChange}>
            {themeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>current: {theme}</div>
        </nav>

        <main className="pinafore-timeline">
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
                  <button onClick={() => onLike(p)} className={p.isLiked? 'liked' : ''}>⭐</button>
                  <button>💬</button>
                </div>
              </div>
            </article>
          ))}
        </main>
      </div>
    </>
  );
}