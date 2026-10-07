import { storedLanguage } from '@/shared/i18n/language'
import { registerChinese, type ZhModule } from '@/shared/i18n/words'

// Every `*.zh.ts` in src/ is one chunk (vite.config.ts), fetched the first time Chinese is
// wanted: English visitors never download it.

const CHINESE = import.meta.glob<{ default: ZhModule }>('/src/**/*.zh.ts')

let loading: Promise<void> | null = null

/** Fetches and registers all the Chinese words, once; a failed try can be tried again. */
export function loadChinese(): Promise<void> {
  loading ??= Promise.all(Object.values(CHINESE).map((load) => load())).then(
    (modules) => modules.forEach((module) => registerChinese(module.default)),
    (error: unknown) => {
      loading = null
      throw error
    },
  )
  return loading
}

/** A phone that chose Chinese starts fetching it while the app starts, not after. */
export function preloadChosenLanguage(): void {
  if (storedLanguage() === 'zh') void loadChinese().catch(() => {})
}
