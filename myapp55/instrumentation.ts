// ✅ myapp27/instrumentation.ts - Next.js 시작 시 자동 실행  / Automatic execution upon Next.js startup
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { watchThemes } = await import('./lib/watchThemes');
    // 백그라운드에서 조용히 감시 시작 / Start monitoring quietly in the background.
    watchThemes(); 
    console.log('👀 Theme watcher started in background');
  }
}