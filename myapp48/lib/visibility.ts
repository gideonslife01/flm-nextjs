// lib/visibility.ts - ✅ myapp48  - refresh_token + token(JWT) 
import db from '@/lib/db';

export type Visibility = 'public' | 'unlisted' | 'private' | 'direct';

function decodeJwtUsername(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length!== 3) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString();
    const data = JSON.parse(json);
    return data.username || data.user || null;
  } catch {
    try {
      // Edge runtime용 fallback
      const payload = jwt.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(json);
      return data.username || null;
    } catch { return null; }
  }
}

export function getViewerFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies: Record<string,string> = {};
  cookieHeader.split(';').forEach(p => {
    const [k,...v] = p.trim().split('=');
    if (k) cookies[k] = decodeURIComponent(v.join('='));
  });

  const refreshToken = cookies['refresh_token'];
  const accessToken = cookies['token'] || cookies['access_token'];

  // 1. refresh_token 쿠키로 sessions 조회
  // Retrieve sessions using the refresh_token cookie.
  if (refreshToken) {
    try {
      const r = db.prepare(`SELECT username FROM sessions WHERE refresh_token=?`).get(refreshToken) as any;
      if (r?.username) {
        console.log('✅ viewer from refresh_token cookie:', r.username);
        return r.username;
      }
    } catch {}
  }

  // 2. token (JWT) 쿠키로 sessions 조회
  // Retrieve sessions using a token (JWT) cookie.
  if (accessToken) {
    try {
      const r = db.prepare(`SELECT username FROM sessions WHERE access_token=?`).get(accessToken) as any;
      if (r?.username) {
        console.log('✅ viewer from token cookie -> sessions:', r.username);
        return r.username;
      }
    } catch {}
    // 2-1. oauth_tokens 조회 (Pinafore OAuth용)
    // Retrieve oauth_tokens (for Pinafore OAuth)
    try {
      const r = db.prepare(`SELECT username FROM oauth_tokens WHERE access_token=?`).get(accessToken) as any;
      if (r?.username) return r.username;
    } catch {}
    // 2-2. JWT 자체 디코딩 - DB 없어도 username 추출 가능
    const jwtUser = decodeJwtUsername(accessToken);
    if (jwtUser) {
      console.log('✅ viewer from JWT decode:', jwtUser);
      return jwtUser;
    }
  }

  // 3. Authorization Bearer (Pinafore, Tusky 등 외부 클라이언트 / External clients such as Pinafore and Tusky)
  const auth = req.headers.get('Authorization') || '';
  const bearer = auth.replace('Bearer ', '').trim();
  if (bearer) {
    try {
      const r = db.prepare(`SELECT username FROM oauth_tokens WHERE access_token=?`).get(bearer) as any;
      if (r?.username) return r.username;
    } catch {}
    try {
      const r = db.prepare(`SELECT username FROM sessions WHERE access_token=? OR refresh_token=?`).get(bearer, bearer) as any;
      if (r?.username) return r.username;
    } catch {}
    const jwtUser = decodeJwtUsername(bearer);
    if (jwtUser) return jwtUser;
  }

  console.log('❌ viewer null - cookies:', Object.keys(cookies));
  return null;
}

export function isFollower(viewer: string, author: string): boolean {
  if (!viewer ||!author || viewer === author) return false;
  try {
    const r1 = db.prepare(`SELECT 1 FROM following WHERE username=? AND actor LIKE?`).get(author, `%/users/${viewer}`) as any;
    if (r1) return true;
    const r2 = db.prepare(`SELECT 1 FROM followers WHERE username=? AND actor LIKE?`).get(author, `%/users/${viewer}`) as any;
    return!!r2;
  } catch { return false; }
}

export function canSee(viewer: string | null, post: any): boolean {
  const vis = (post.visibility || 'public') as Visibility;
  if (vis === 'public') return true;
  if (!viewer) return false;
  if (vis === 'unlisted') return true;
  if (vis === 'private' || vis === 'direct') {
    if (post.username === viewer) return true;
    return isFollower(viewer, post.username);
  }
  return true;
}