// Where the page moves focus and scrolls (coach-students §7). Rows are found by their action
// button's id (RowAction): both layouts are in the page and CSS shows one (the table from
// 768 px, the cards below), and only the one on screen has a box.

export type RowLayout = 'table' | 'card'

/** A row action's id: "row-action-table-<group id>". */
export function rowActionId(layout: RowLayout, groupId: string): string {
  return `row-action-${layout}-${groupId}`
}

/** The filter tabs' wrapper (StudentsList), where focus goes when a row has left the tab. */
export const FILTER_TABS_ID = 'students-filter-tabs'

/** The page's notice (StudentsList's Banner). */
export const NOTICE_ID = 'students-notice'

/** Focus the page's notice: after Delete group, whose row has gone. */
export function focusNotice(): void {
  document.getElementById(NOTICE_ID)?.focus()
}

/** The chosen filter tab, or null while the tabs aren't shown. */
export function chosenTab(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`#${FILTER_TABS_ID} [aria-pressed="true"]`)
}

/** A waiting account's buttons (Remove, Approve): "waiting-table-<account id>". */
export function waitingActionsId(layout: RowLayout, accountId: string): string {
  return `waiting-${layout}-${accountId}`
}

/** Where a waiting account was when it left the list, and in which layout it was approved. */
export type WaitingPlace = { id: string; index: number; layout: RowLayout }

/** A waiting account's Approve button (the last of its buttons), or null. */
export function approveButton(layout: RowLayout, accountId: string): HTMLButtonElement | null {
  const actions = document.getElementById(waitingActionsId(layout, accountId))
  return [...(actions?.querySelectorAll('button') ?? [])].at(-1) ?? null
}

/** A group's row action in the layout on screen, or null. */
function shownRowAction(groupId: string): HTMLElement | null {
  for (const layout of ['table', 'card'] as const) {
    const action = document.getElementById(rowActionId(layout, groupId))
    if (action && action.getClientRects().length > 0) return action
  }
  return null
}

/** Scrolls a group's row into view: a group just added (coach-add-students §5.2.1). */
export function scrollToRow(groupId: string) {
  shownRowAction(groupId)?.scrollIntoView({ block: 'center' })
}

/**
 * Focuses an element and scrolls it into view, clear of the tab bar (the row actions keep a
 * scroll margin for it below 1024 px): `center` also shows what follows it, `nearest` leaves a
 * page that already shows it where it is.
 */
export function focusInView(element: HTMLElement, block: 'center' | 'nearest') {
  element.focus({ preventScroll: true })
  // Only an element on screen has a box to scroll to.
  if (element.getClientRects().length > 0) element.scrollIntoView({ block })
}

/**
 * After the payment panel or History closes (coach-students §7), focus is back on the row
 * button that opened it (useModalDialog), but Back's scroll restoration runs after that and
 * can leave the row out of view, so bring it into view again. If the row has left this tab (a
 * payment took it out of Unpaid), focus goes to the chosen tab rather than the page. Focus
 * that something else placed on purpose (the 1280 px panel's title) stays where it is.
 */
export function returnFocusToRow(groupId: string) {
  const active = document.activeElement
  const lost = active === null || active === document.body
  const action = shownRowAction(groupId)
  if (action && (lost || active === action)) {
    focusInView(action, 'nearest')
    return
  }
  if (lost) chosenTab()?.focus()
}
