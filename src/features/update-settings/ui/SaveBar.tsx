import './SaveBar.css'

import { StickyBar } from '@/shared/ui/StickyBar'

import { SaveChangesButton } from './SaveChangesButton'
import { SaveStatus } from './SaveStatus'

/**
 * The phones' Save bar (design/AdminSettings.dc.html:230-232): sticky just above the tab bar,
 * edge to edge, with any save error above the 48 px "Save changes". Hidden from 768 px, where
 * Save sits in the header. Render it last in the page's column. SaveBar.css keeps a box
 * reached with Tab clear of it.
 */
export function SaveBar() {
  return (
    <StickyBar hideFrom="md" data-save-bar="">
      <SaveStatus placement="bar" />
      <SaveChangesButton placement="bar" />
    </StickyBar>
  )
}
