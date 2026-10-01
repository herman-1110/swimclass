import type { Ref } from 'react'

import { ROUTES } from '@/shared/config/routes'
import { ButtonLink } from '@/shared/ui/ButtonLink'
import { Field } from '@/shared/ui/Field'
import { PageHeader } from '@/shared/ui/PageHeader'

type StudentsHeaderProps = {
  query: string
  onQuery: (query: string) => void
  /** The search box, so "Clear search" can put focus back in it. */
  searchRef?: Ref<HTMLInputElement>
}

/**
 * The title, the search box and "Add students" (AdminStudents.dc.html:72-78): a column on
 * phones (the search fills the row), one row from 768 px with a 200 px search box. The only
 * "Add students" link on the screen (conventions §12.3).
 */
export function StudentsHeader({ query, onQuery, searchRef }: StudentsHeaderProps) {
  return (
    <PageHeader
      size="coach"
      title="Students & payments"
      actions={
        <div className="flex items-center gap-2">
          <Field
            ref={searchRef}
            type="search"
            label="Search students"
            hideLabel
            placeholder="Search students"
            size="sm"
            autoComplete="off"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className="min-w-0 flex-1 md:w-50 md:flex-none"
          />
          <ButtonLink to={ROUTES.coachAddStudents} size="sm">
            Add students
          </ButtonLink>
        </div>
      }
    />
  )
}
