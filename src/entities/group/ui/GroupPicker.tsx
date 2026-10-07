import type { ReactNode } from 'react'

import { useLanguage } from '@/shared/i18n/context'
import { wordsIn } from '@/shared/i18n/words'
import { Fieldset } from '@/shared/ui/Fieldset'
import { OptionRow } from '@/shared/ui/OptionRow'
import { Tag } from '@/shared/ui/Tag'

import { typeLabelIn } from '../model/typeLabel'
import type { Group } from '../model/types'
import { groupWords } from '../model/words'

type GroupPickerProps = {
  /** The groups to choose from, in the order to show them (Book: the active ones). */
  groups: readonly Group[]
  /** The chosen group's id, or null for none. */
  value: string | null
  onChange: (groupId: string) => void
  /** Names the radio group. Default: Book's "Who’s this lesson for?". */
  legend?: string
  /** Keeps the legend for screen readers only (Add booking labels the list itself). */
  hideLegend?: boolean
  /** The 12 px line under the rows. Default: Book's; pass null for none. */
  help?: ReactNode
  /** The radios' name, one per list on a page. Default: "book-group", as drawn. */
  name?: string
  /** A second, muted line under a group's names (Add booking: "Mei Ling’s account · Palm Court"). */
  secondary?: (group: Group) => ReactNode
  /**
   * Shown in place of the rows when there are no groups (Add booking's search: "No active
   * group matches “zz”."). It goes in a polite status that stays in the page, empty and
   * taking no room, while there are rows, so it is read out when a search empties the list.
   */
  emptyText?: string
  /**
   * grid (default, Book): a column on phones, rows side by side from 768 px wherever
   * 200 px fits. list: always one column. scroll: one column that shows about five and a
   * half rows and scrolls the rest (Add booking's list of every active group).
   */
  layout?: 'grid' | 'list' | 'scroll'
  /** Layout only: grid placement or margins (Book puts it in its "group" area). */
  className?: string
}

// design/Main.dc.html:70-84 (.groups :30, :38): rows 8 px apart, from 768 px a grid of
// columns at least 200 px wide. The legend sits 8 px above the rows and the help 8 px below.
// scroll (not drawn; coach-schedule §7.4 "max-height about 5 rows with scrolling"): a half
// row shows there is more; 4 px of padding keeps the rows' focus ring inside the box. The
// arrow keys focus the small radio, and Chrome scrolls only that into view: 32 px of scroll
// padding makes it scroll before the rest of the row and its ring reach the box's edge.
const layouts = {
  grid: 'flex flex-col gap-2 md:grid md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
  list: 'flex flex-col gap-2',
  scroll: '-m-1 flex max-h-[312px] scroll-py-8 flex-col gap-2 overflow-y-auto p-1',
}

/**
 * "Who’s this lesson for?" (DESIGN §3, §4 Book): one radio row per group with its type
 * tag, in a fieldset whose legend names the group, so arrow keys move the choice (UI kit
 * spec §3.9). Book uses it as it is; Add booking passes its own legend, name, second line,
 * empty text and the scroll layout.
 */
export function GroupPicker({
  groups,
  value,
  onChange,
  legend,
  hideLegend = false,
  help,
  name = 'book-group',
  secondary,
  emptyText,
  layout = 'grid',
  className,
}: GroupPickerProps) {
  const language = useLanguage()
  const w = wordsIn(groupWords, language)
  return (
    <Fieldset
      legend={legend ?? w.legend}
      hideLegend={hideLegend}
      spacing="loose"
      help={help === undefined ? w.help : help}
      className={className}
    >
      {groups.length > 0 && (
        <div className={layouts[layout]}>
          {groups.map((group) => (
            <OptionRow
              key={group.group_id}
              name={name}
              value={group.group_id}
              checked={group.group_id === value}
              onChange={onChange}
              label={
                secondary ? (
                  <span className="flex flex-col gap-0.5 py-1.5">
                    {/* The space keeps the two lines apart in the radio's name. */}
                    <span>{group.display_names}</span>{' '}
                    <span className="text-small font-normal text-muted">{secondary(group)}</span>
                  </span>
                ) : (
                  group.display_names
                )
              }
              trailing={<Tag>{typeLabelIn(group, language)}</Tag>}
            />
          ))}
        </div>
      )}
      {emptyText !== undefined && (
        // A live region added together with its text is often not read out, so this one
        // stays in the page. While empty it takes no room: the negative margin cancels the
        // fieldset's 8 px gap above it (as the kit's Field does with its status).
        <p role="status" className="text-sm leading-normal text-muted empty:-mt-2">
          {groups.length === 0 ? emptyText : null}
        </p>
      )}
    </Fieldset>
  )
}
