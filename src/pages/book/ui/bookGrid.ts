// design/Main.dc.html .book (:25, :35, :47). Phones: one column 24 px apart, the summary
// last and pushed to the bottom (a flex column, not the drawing's grid, so the summary can
// stick above the tab bar: book spec §2.6 item 1). From 768 px: the choices on the left, the
// package card and the summary card on the right (280–340 px), 40 px apart, rows 28 px
// apart. From 1280 px the summary starts beside the day strip. The heading and the coach
// banner sit above the grid, so a missing banner leaves no empty row (§2.6 item 2).
export const BOOK_GRID =
  "flex flex-1 flex-col gap-6 md:grid md:flex-none md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] md:items-start md:gap-x-10 md:gap-y-7 md:[grid-template-areas:'group_package'_'group_summary'_'day_summary'_'length_summary'_'times_summary'] xl:[grid-template-areas:'group_package'_'day_summary'_'length_summary'_'times_summary']"

/** Each section's place in BOOK_GRID from 768 px. */
export const AREA = {
  group: 'md:[grid-area:group]',
  package: 'md:[grid-area:package]',
  day: 'md:[grid-area:day]',
  length: 'md:[grid-area:length]',
  times: 'md:[grid-area:times]',
  summary: 'md:[grid-area:summary]',
} as const
