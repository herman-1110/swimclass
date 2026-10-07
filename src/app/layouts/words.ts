import { defineWords } from '@/shared/i18n/words'

// The student layout's words: the tabs, the sidebar and the skip link (the coach's layout
// stays English).
export const layoutWords = defineWords('layouts', {
  book: 'Book',
  schedule: 'Schedule',
  myClasses: 'My classes',
  account: 'Account',
  backToCoachView: 'Back to coach view',
  /** The tab bar's and sidebar's name for screen readers ("Main"). */
  main: 'Main',
  navigation: (label: string) => `${label} navigation`,
  signedInAs: (name: string) => `Signed in as ${name}`,
  skipToContent: 'Skip to main content',
})

export type LayoutWords = typeof layoutWords.en
