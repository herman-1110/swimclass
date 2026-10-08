import { defineWords } from '@/shared/i18n/words'
import { possessive } from '@/shared/lib/format'

// My classes. Chinese in words.zh.ts (HANDOFF v0.26).
export const myClassesPageWords = defineWords('page-my-classes', {
  title: 'My classes',
  /** Over the title: "Mei Ling’s account". */
  account: (name: string) => `${possessive(name)} account`,
  upcoming: 'Upcoming',
  loadingLessons: 'Loading your lessons…',
  noUpcoming: 'No upcoming lessons.',
  bookLesson: 'Book a lesson',
  packages: 'Packages',
  loadingPackages: 'Loading your packages…',
  pastToggle: 'Past lessons and receipts',
  pastHeading: 'Past and cancelled lessons',
  loadingPast: 'Loading your past lessons…',
  noPast: 'No past or cancelled lessons yet.',
  showingLessons: (count: number) => `Showing your last ${count} lessons.`,
  payments: 'Payments',
  loadingPayments: 'Loading your payments…',
  noPayments: 'No payments yet.',
  showingPayments: (count: number) => `Showing your last ${count} payments.`,
  tryAgain: 'Try again',
})

export type MyClassesPageWords = typeof myClassesPageWords.en
