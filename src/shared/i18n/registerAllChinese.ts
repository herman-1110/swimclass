import { registerChinese, type ZhModule } from './words'

// For tests only: every *.zh.ts registered at once, as the app does the first time 中文 is
// picked (app/providers/loadChinese.ts, which fetches them as one chunk instead). The app
// never imports this file: it would put every Chinese word in the main bundle.
const CHINESE = import.meta.glob<{ default: ZhModule }>('/src/**/*.zh.ts', { eager: true })

/** Files every part's Chinese words, so `language: 'zh'` and LanguageScope show Chinese. */
export function registerAllChinese(): void {
  for (const module of Object.values(CHINESE)) registerChinese(module.default)
}
