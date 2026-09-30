import type { ReactNode } from 'react'

import { Fieldset } from '@/shared/ui/Fieldset'
import { OptionRow } from '@/shared/ui/OptionRow'
import { Tag } from '@/shared/ui/Tag'

import type { Group } from '../model/types'

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
  /** Shown in place of the rows when there are no groups (Add booking's search). */
  emptyText?: string
  /**
   * grid (default, Book): a column on phones, rows side by side from 768 px wherever
   * 200 px fits. list: always one column (a list in a dialog).
   */
  layout?: 'grid' | 'list'
}

// design/Main.dc.html:70-84 (.groups :30, :38): rows 8 px apart, from 768 px a grid of
// columns at least 200 px wide. The legend sits 8 px above the rows and the help 8 px below.
const layouts = {
  grid: 'flex flex-col gap-2 md:grid md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]',
  list: 'flex flex-col gap-2',
}

/**
 * "Who’s this lesson for?" (DESIGN §3, §4 Book): one radio row per group with its type
 * tag, in a fieldset whose legend names the group, so arrow keys move the choice (UI kit
 * spec §3.9). Book uses it as it is; Add booking passes its own legend, name, second line
 * and empty text.
 */
export function GroupPicker({
  groups,
  value,
  onChange,
  legend = 'Who’s this lesson for?',
  hideLegend = false,
  help = 'Your coach sets up who books together. Ask them if you need a new group.',
  name = 'book-group',
  secondary,
  emptyText,
  layout = 'grid',
}: GroupPickerProps) {
  return (
    <Fieldset legend={legend} hideLegend={hideLegend} spacing="loose" help={help}>
      {groups.length === 0 ? (
        emptyText && <p className="text-sm leading-normal text-muted">{emptyText}</p>
      ) : (
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
              trailing={<Tag>{group.type_label}</Tag>}
            />
          ))}
        </div>
      )}
    </Fieldset>
  )
}
