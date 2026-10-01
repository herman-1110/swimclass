/**
 * Scrolls a group's row into view, in whichever layout is on screen (the table from 768 px,
 * the cards below): a group just added (coach-add-students §5.2.1). Rows are found by their
 * action button's id (RowAction).
 */
export function scrollToRow(groupId: string) {
  for (const layout of ['table', 'card']) {
    const action = document.getElementById(`row-action-${layout}-${groupId}`)
    // Only the layout on screen has a box (the other is display: none).
    if (action && action.getClientRects().length > 0) {
      action.scrollIntoView({ block: 'center' })
      return
    }
  }
}
