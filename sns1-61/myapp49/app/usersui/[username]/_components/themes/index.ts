import { MastodonTheme } from './mastodon/MastodonTheme';
import { MinimalTheme } from './minimal/MinimalTheme';
import { PinaforeTheme } from './pinafore/PinaforeTheme';
import { ThemeexTheme } from './themeex/ThemeexTheme';

export const themeRegistry = {
 mastodon: { component: MastodonTheme, label: 'mastodon' },
 minimal: { component: MinimalTheme, label: 'minimal' },
 pinafore: { component: PinaforeTheme, label: 'pinafore' },
 themeex: { component: ThemeexTheme, label: 'themeex' },
} as const;
export type ThemeName = keyof typeof themeRegistry;
export function getThemeComponent(name: ThemeName) {
  return themeRegistry[name]?.component;
}
