import { useChooseLanguage, useLanguage } from '@/shared/i18n/context'
import type { Language } from '@/shared/i18n/language'
import { cn } from '@/shared/lib/cn'

// "EN | 中文" at the top of every student page (Herman, 7 Oct 2026). Each language is
// written in itself, so a reader of either finds theirs; the group's name is in both.
const OPTIONS: readonly { value: Language; label: string; name: string; lang: string }[] = [
  { value: 'en', label: 'EN', name: 'English', lang: 'en' },
  { value: 'zh', label: '中文', name: '中文', lang: 'zh-Hans' },
]

// Segmented's look (UI kit spec §3.10), smaller: 44 px targets on a --subtle track, the
// chosen one white with an --accent border.
const option = cn(
  'flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-small border border-transparent px-3 text-sm leading-[normal] font-medium text-muted',
  'aria-pressed:border-accent aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-ink',
)

/** Switches the student screens between English and Chinese, remembered on this phone. */
export function LanguageToggle({ className }: { className?: string }) {
  const language = useLanguage()
  const choose = useChooseLanguage()
  return (
    <div
      role="group"
      aria-label="Language · 语言"
      className={cn('flex gap-0.5 rounded-control bg-subtle p-0.75', className)}
    >
      {OPTIONS.map((item) => (
        <button
          key={item.value}
          type="button"
          lang={item.lang}
          aria-label={item.name}
          aria-pressed={language === item.value}
          className={option}
          onClick={() => choose(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
