// app/usersui/[username]/_components/themes/pinafore/TimelineList.tsx
// ✅ myapp54 - 타임라인 분리 / Timeline Separation
'use client';

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

type Props = {
  timeline: any[];
  currentUser: string | null;
  onDelete: (id: string) => void;
  onBoost: (p: any) => void;
  onLike: (p: any) => void;
  onShare: (p: any) => void;
};

export default function TimelineList({ timeline, currentUser, onDelete, onBoost, onLike, onShare }: Props) {
  if (timeline.length === 0) {
    return <div style={{ padding: 20, color: '#999' }}>타임라인이 비어있습니다 / No posts</div>;
  }

  return (
    <>
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
