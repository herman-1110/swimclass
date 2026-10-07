import type { Language } from './language'

// The words of one part of the site, in both languages. English lives in the part's
// `words.ts` (defineWords) and is always there; Chinese lives beside it in `words.zh.ts`,
// whose default export the app registers the first time someone picks 中文
// (app/providers/LanguageProvider). Until then, and wherever a part has no Chinese, the
// English shows. Words that take values are functions: Chinese has no plural "s" and puts
// dates in another order, so each language builds its own sentence.

/** A part of the site's English words, and the key its Chinese is filed under. */
export type WordsDef<W, K extends string = string> = { readonly key: K; readonly en: W }

/** Names the English words of a part ("log-in"); the key must be unique. */
export function defineWords<const K extends string, W>(key: K, en: W): WordsDef<W, K> {
  return { key, en }
}

/**
 * What a `words.zh.ts` exports by default: `{ key, words } satisfies ZhWords<typeof
 * logInWords>`, with `import type { logInWords } from './words'`, so the Chinese chunk
 * needs nothing from the English one and TypeScript checks every word is there.
 */
export type ZhWords<D extends WordsDef<unknown>> = { key: D['key']; words: D['en'] }

/** Any `words.zh.ts` default export. */
export type ZhModule = { key: string; words: unknown }

const chinese = new Map<string, unknown>()

/** Files one part's Chinese words (the language provider; tests that render Chinese). */
export function registerChinese(module: ZhModule): void {
  chinese.set(module.key, module.words)
}

/** The words of `def` in `language`: English when that part's Chinese isn't registered. */
export function wordsIn<W>(def: WordsDef<W>, language: Language): W {
  if (language === 'zh' && chinese.has(def.key)) return chinese.get(def.key) as W
  return def.en
}
