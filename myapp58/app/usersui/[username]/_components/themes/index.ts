import { PinaforeTheme as _Fallback } from './pinafore/PinaforeTheme';

function _load(path: string, exportName: string) {
  try {
    const mod = eval('require')(path);
    return mod[exportName] || mod.default || _Fallback;
  } catch {
    return _Fallback;
  }
}

export const themeRegistry = {
 mastodon: { component: _load('./mastodon/MastodonTheme', 'MastodonTheme'), label: 'mastodon' },
 minimal: { component: _load('./minimal/MinimalTheme', 'MinimalTheme'), label: 'minimal' },
 pinafore: { component: _Fallback, label: 'pinafore' },
 themeex: { component: _load('./themeex/Themetheme', 'Theme'), label: 'themeex' },
} as const;
export type ThemeName = keyof typeof themeRegistry;
export function getThemeComponent(name: ThemeName) {
  return themeRegistry[name]?.component?? _Fallback;
}
