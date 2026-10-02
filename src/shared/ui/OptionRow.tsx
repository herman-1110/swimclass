import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type OptionRowProps =
  | {
      preview?: false
      /** One name for every row of the list. */
      name: string
      value: string
      checked: boolean
      onChange: (value: string) => void
      /** "Aiman & Sofia". */
      label: ReactNode
      /** On the right: <Tag>1-to-2</Tag>. */
      trailing?: ReactNode
      disabled?: boolean
    }
  | {
      /** The static, always-chosen look with a drawn mark and no input (Add students' preview). */
      preview: true
      label: ReactNode
      trailing?: ReactNode
    }

// UI kit spec §3.9: Main.dc.html:75-79 (states :264-270), AdminAddStudents.dc.html:110-113.
// Lay the rows out in a column 8 px apart, and from 768 px in a grid:
// flex flex-col gap-2 md:grid md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]
const row = 'flex min-h-12 items-center gap-2.5 rounded-control border px-3.5'
// A name typed as one long word (up to 100 characters) breaks inside the row rather than
// pushing the tag out of it and the page sideways (DESIGN §5; book spec §6.6).
const nameText = 'min-w-0 flex-1 text-body font-medium wrap-anywhere'

/**
 * One choice of a single-choice list with a trailing tag (UI kit spec §3.9): a native
 * radio whose whole 48 px row is the target. Put the rows in a Fieldset with a legend so
 * they form one radio group; arrow keys then move the choice.
 */
export function OptionRow(props: OptionRowProps) {
  if (props.preview) {
    return (
      <div className={cn(row, 'border-accent bg-accent-soft')}>
        <span
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full border-[5px] border-accent bg-white"
        />
        <span className={nameText}>{props.label}</span> {props.trailing}
      </div>
    )
  }

  const { name, value, checked, onChange, label, trailing, disabled } = props
  return (
    <label
      className={cn(
        row,
        'cursor-pointer border-field bg-white has-checked:border-accent has-checked:bg-accent-soft has-disabled:cursor-default has-disabled:opacity-50',
        // The focus ring goes round the whole row, not the small radio.
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="size-4.5 shrink-0 cursor-pointer accent-accent focus-visible:outline-none disabled:cursor-default"
      />
      {/* The space keeps the tag apart in the radio's name: "Aiman & Sofia 1-to-2". */}
      <span className={nameText}>{label}</span> {trailing}
    </label>
  )
}
