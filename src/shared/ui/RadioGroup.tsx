import type { ReactNode } from 'react'

import { Fieldset } from './Fieldset'

export type RadioOption = { value: string; label: string; disabled?: boolean }

type RadioGroupProps = {
  /** "Paid by". */
  legend: string
  hideLegend?: boolean
  /** One name for the group's radios. */
  name: string
  options: readonly RadioOption[]
  /** The chosen value; "" when none is chosen yet. */
  value: string
  onChange: (value: string) => void
  help?: ReactNode
  /**
   * Wording from messages.ts ("Choose how they paid: Cash, Transfer or FPX."). Linked to
   * the group with aria-describedby; the radios get aria-invalid.
   */
  error?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

/**
 * Inline native radios that wrap (UI kit spec §3.7, AdminStudents.dc.html:291-298): Tab
 * enters the group, arrow keys choose.
 */
export function RadioGroup({
  legend,
  hideLegend,
  name,
  options,
  value,
  onChange,
  help,
  error,
  disabled,
  required,
  className,
}: RadioGroupProps) {
  return (
    <Fieldset
      legend={legend}
      hideLegend={hideLegend}
      spacing="tight"
      help={help}
      error={error}
      disabled={disabled}
      className={className}
    >
      <div className="flex flex-wrap gap-x-5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-sm leading-[normal] has-disabled:cursor-default has-disabled:text-muted"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={option.disabled}
              required={required}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
              className="size-4.5 shrink-0 cursor-pointer accent-accent disabled:cursor-default"
            />
            {option.label}
          </label>
        ))}
      </div>
    </Fieldset>
  )
}
