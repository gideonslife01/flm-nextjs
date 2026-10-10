'use client';
 import { MastodonTheme as mastodonComp} from './mastodon/MainTheme';
import { MinimalTheme as minimalComp} from './minimal/MainTheme';
import { MainTheme as pinaforeComp} from './pinafore/MainTheme';
import { MainTheme as themeexComp} from './themeex/MainTheme';

export const themeRegistry = {
 mastodon: { component: mastodonComp, label: 'mastodon' },
 minimal: { component: minimalComp, label: 'minimal' },
 pinafore: { component: pinaforeComp, label: 'pinafore' },
 themeex: { component: themeexComp, label: 'themeex' },
} as const;
export type ThemeName = keyof typeof themeRegistry;
export function getThemeComponent(name: ThemeName) {
  return themeRegistry[name]?.component;
}
