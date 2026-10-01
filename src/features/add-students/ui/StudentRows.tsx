import { Link } from 'react-router'

import type { MessagePart } from '@/shared/config/messages'
import { ROUTES } from '@/shared/config/routes'
import { Field } from '@/shared/ui/Field'
import { Fieldset } from '@/shared/ui/Fieldset'

import { studentPlaceholder } from '../model/copy'
import { FIELD_IDS, studentId } from '../model/fields'
import { type ResolvedRow, studentHint } from '../model/students'

type StudentRowsProps = {
  /** The visible rows' text, Student 1 first. */
  texts: readonly string[]
  /** The same rows matched to the account's students. */
  rows: readonly ResolvedRow[]
  onChange: (index: number, text: string) => void
  /** The account's students' names: suggestions on every row, and the hints under them. */
  suggestions: readonly string[]
  /** Each row's problem in words, by its number. */
  errors: Readonly<Partial<Record<number, string>>>
  /** `duplicate_group`'s words, with its link to that group, after the rows. */
  duplicate: readonly MessagePart[] | null
}

const LIST_ID = `${FIELD_IDS.students}-names`
const DUPLICATE_ID = `${FIELD_IDS.students}-error`

/**
 * Students (AdminAddStudents.dc.html:83-90): a row per student of the chosen type, "Student
 * 1" beside its input. A typed name that matches one of the account's students is that
 * student (the spec C3): the account's names are suggested on every row, and once the
 * account has students each filled row says "Existing student" or "New student".
 */
export function StudentRows({
  texts,
  rows,
  onChange,
  suggestions,
  errors,
  duplicate,
}: StudentRowsProps) {
  const hasStudents = suggestions.length > 0

  return (
    <Fieldset
      id={FIELD_IDS.students}
      legend="Students"
      aria-describedby={duplicate ? DUPLICATE_ID : undefined}
    >
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <Field
            key={row.index}
            id={studentId(row.index)}
            layout="inline"
            label={`Student ${row.index}`}
            placeholder={studentPlaceholder(row.index)}
            value={texts[row.index - 1] ?? ''}
            onChange={(event) => onChange(row.index, event.target.value)}
            list={hasStudents ? LIST_ID : undefined}
            autoComplete="off"
            autoCapitalize="words"
            // A polite region while the account has students, so the hint is read out as it
            // changes ("Existing student" once a name matches).
            status={hasStudents ? studentHint(row, true) : undefined}
            error={errors[row.index]}
            aria-describedby={duplicate ? DUPLICATE_ID : undefined}
          />
        ))}
      </div>
      {hasStudents && (
        <datalist id={LIST_ID}>
          {suggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
      {duplicate && (
        <p id={DUPLICATE_ID} className="text-label leading-[1.45] text-warn">
          {duplicate.map((part) =>
            typeof part === 'string' ? (
              part
            ) : (
              <Link
                key={part.groupId}
                to={`${ROUTES.coachStudents}?history=${part.groupId}`}
                className="underline underline-offset-2"
              >
                {part.text}
              </Link>
            ),
          )}
        </p>
      )}
    </Fieldset>
  )
}
