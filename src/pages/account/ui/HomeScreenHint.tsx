import { useMediaQuery } from '@/shared/lib/hooks/useMediaQuery'
import { SectionLabel } from '@/shared/ui/SectionLabel'

/** iPhones opened from the home screen say so here rather than through display-mode. */
function openedFromIosHomeScreen(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * How to add the site to a phone's home screen (prompt 12 TASK 3; the manifest and the
 * apple- tags are in index.html). Not drawn, so in the Account page's style. Left out when
 * the site is already open from the home screen.
 */
export function HomeScreenHint() {
  const standalone = useMediaQuery('(display-mode: standalone)')
  if (standalone || openedFromIosHomeScreen()) return null

  return (
    <section
      aria-labelledby="account-home-screen-heading"
      className="flex flex-col gap-3 border-t border-line pt-6"
    >
      <SectionLabel as="h2" id="account-home-screen-heading">
        Home screen
      </SectionLabel>
      <p className="text-body">Add this site to your phone’s home screen to open it like an app.</p>
      <ul className="flex flex-col gap-1.5 text-small leading-[1.45] text-muted">
        <li>iPhone: in Safari, tap Share, then Add to Home Screen.</li>
        <li>Android: in Chrome, tap the ⋮ menu, then Add to home screen.</li>
      </ul>
    </section>
  )
}
