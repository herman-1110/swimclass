import type { Ref } from 'react'

import { useAccountNames } from '@/entities/account'
import { accountLine, type Group, GroupPicker, useCoachGroups } from '@/entities/group'
import { messageFor } from '@/shared/config/messages'
import { Banner } from '@/shared/ui/Banner'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Skeleton } from '@/shared/ui/Skeleton'

import { NO_GROUPS, noMatch, SEARCH_PLACEHOLDER } from '../model/copy'
import { searchGroups } from '../model/groupSearch'

type GroupChooserProps = {
  /** What the search box holds. */
  query: string
  onQuery: (query: string) => void
  /** The chosen group's id, or null. */
  value: string | null
  onChange: (groupId: string) => void
  /** The search box: the dialog starts there (the Schedule spec §7.3). */
  searchRef?: Ref<HTMLInputElement>
  /** It is booking: the search is read-only and the list disabled, so the choice holds. */
  readOnly?: boolean
}

const NO_NAMES: ReadonlyMap<string, string> = new Map()

/** "Mei Ling’s account · Palm Court"; just the place until the account names are in. */
function accountText(group: Group, names: ReadonlyMap<string, string>): string {
  const name = names.get(group.account_id)
  return name ? accountLine(group, name) : group.location
}

/**
 * Add booking's "Group" (the Schedule spec §7.4): a search box over the active groups, then
 * their radio rows (names, type tag, "Mei Ling’s account · Palm Court") in a list that shows
 * about five and scrolls. The search matches the students' or the account holder's names; a
 * search that matches nothing says so.
 */
export function GroupChooser({
  query,
  onQuery,
  value,
  onChange,
  searchRef,
  readOnly,
}: GroupChooserProps) {
  const groups = useCoachGroups()
  const names = useAccountNames().data ?? NO_NAMES

  // The label sits 6 px above the search box, as every label in the dialog (§3.10), and the
  // list 8 px under it (mt-0.5).
  return (
    <div className="flex flex-col gap-1.5">
      {/* The search box and the list have their own names; this is the drawn label. */}
      <p aria-hidden="true" className="text-label font-medium text-muted">
        Group
      </p>
      <Field
        ref={searchRef}
        type="search"
        label="Search groups"
        hideLabel
        placeholder={SEARCH_PLACEHOLDER}
        value={query}
        readOnly={readOnly}
        onChange={(event) => onQuery(event.target.value)}
      />
      {groups.data ? (
        <fieldset disabled={readOnly} className="mt-0.5 min-w-0">
          <GroupPicker
            groups={searchGroups(groups.data, names, query)}
            value={value}
            onChange={onChange}
            legend="Group"
            hideLegend
            help={null}
            name="add-booking-group"
            secondary={(group) => accountText(group, names)}
            emptyText={query.trim() ? noMatch(query) : NO_GROUPS}
            layout="scroll"
          />
        </fieldset>
      ) : groups.isError ? (
        <Banner
          className="mt-0.5"
          role="alert"
          action={
            <Button variant="quiet" size="sm" tone="accent" onClick={() => void groups.refetch()}>
              Try again
            </Button>
          }
        >
          {messageFor(groups.error, { audience: 'coach' })}
        </Banner>
      ) : (
        <div aria-busy="true" className="mt-0.5 flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
          <p role="status" className="sr-only">
            Loading…
          </p>
        </div>
      )}
    </div>
  )
}
