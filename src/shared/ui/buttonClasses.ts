import { cn } from '@/shared/lib/cn'
import type { MotionKind } from '@/shared/lib/motion'

// The look of every button and every action-looking link (UI kit spec §3.1), shared by
// Button and ButtonLink. Sizes never change with the window width (DESIGN §2); min-h-*
// rather than h-* so a long label can wrap at 360 px instead of being cut off (DESIGN §5),
// even inside a long word ("Book 9:00 pm for {a 100-character name}"); the sizes that keep
// one line (whitespace-nowrap) still do.
//
// The label is a flex row (an icon and text sit 6 px apart), so wrap mixed text in one
// span to keep it one line of text: <span>New here? <span …>Create an account</span></span>.
// className is for layout. To hide a button at some widths use a prefixed class
// (max-md:hidden, md:hidden): a plain `hidden` loses to the button's own inline-flex.

export type ButtonVariant = 'primary' | 'quiet' | 'link' | 'underline' | 'text'
export type ButtonSize = 'xl' | 'lg' | 'md' | 'sm' | 'compact'
export type ButtonTone = 'ink' | 'muted' | 'accent'

export type ButtonLook = {
  /** Default 'primary'. */
  variant?: ButtonVariant
  /**
   * Primary and quiet only. xl 50 px (Log in, Book), lg 48 px (phone Save bar), md 46 px
   * (default: Save payment, Send to all customers), sm 44 px (Add booking, header Save
   * changes, Block time), compact 44 px with 13 px text (Record payment in a row).
   */
  size?: ButtonSize
  /** Quiet (default 'ink') and text (default 'muted'). */
  tone?: ButtonTone
  /** Link only: 13 px ('label') or 14 px ('sm', the default). */
  textSize?: 'label' | 'sm'
  /** Link only: no side padding, left aligned, for links stacked in a column. */
  flush?: boolean
  /** Text only: 400 (the default, "Forgot username or password?") or 500 (Add students' "Cancel"). */
  weight?: 'normal' | 'medium'
  /** Full width. */
  block?: boolean
}

// Disabled comes in two kinds: the native `disabled` attribute (Book's "Pick a time", as
// drawn), and data-disabled, which Button sets for aria-disabled so the button keeps focus
// (Settings' "Save changes"). Both get the same look. Tailwind emits disabled: and data-*:
// after hover:, so a hovered disabled button keeps its disabled look.
//
// Hover is easy to see (Herman, 2 Oct 2026; DESIGN §5): primaries glow (shadow-lift) and
// quiet buttons get an outline (shadow-soft); links and text buttons underline. Tailwind's
// hover: only applies where there is a mouse, so a tap never leaves it on. The movement
// on top comes from shared/lib/motion, through data-motion (buttonMotion below).
const base =
  'inline-flex items-center gap-1.5 text-center leading-[normal] wrap-anywhere cursor-pointer transition-[background-color,color,box-shadow] duration-150'
const inactive = 'disabled:cursor-default data-disabled:cursor-default aria-busy:cursor-progress'

const primary =
  'bg-accent font-semibold text-white hover:bg-accent-hover hover:shadow-lift active:bg-accent-hover active:shadow-press disabled:bg-line disabled:text-muted disabled:shadow-none data-disabled:bg-line data-disabled:text-muted data-disabled:shadow-none'

const primarySizes: Record<ButtonSize, string> = {
  xl: 'min-h-12.5 rounded-control px-5 text-body',
  lg: 'min-h-12 rounded-control px-5 text-body',
  md: 'min-h-11.5 rounded-control px-5.5 text-sm',
  sm: 'min-h-11 rounded-control px-4.5 text-sm whitespace-nowrap',
  compact: 'min-h-11 rounded-small px-3.5 text-label whitespace-nowrap',
}

const quiet =
  'bg-transparent font-medium hover:bg-subtle hover:shadow-soft active:shadow-none disabled:bg-transparent disabled:opacity-50 disabled:shadow-none data-disabled:bg-transparent data-disabled:opacity-50 data-disabled:shadow-none'

// Only md and sm are drawn; the others follow the primary sizes so every size exists.
const quietSizes: Record<ButtonSize, string> = {
  xl: 'min-h-12.5 rounded-control px-5 text-body',
  lg: 'min-h-12 rounded-control px-5 text-body',
  md: 'min-h-11.5 rounded-control px-3.5 text-sm',
  sm: 'min-h-11 rounded-control px-3.5 text-sm',
  compact: 'min-h-11 rounded-small px-3.5 text-label',
}

const tones: Record<ButtonTone, string> = {
  ink: 'text-ink',
  muted: 'text-muted',
  accent: 'text-accent',
}

// Text buttons ("Forgot username or password?") darken on hover; ink ones stay ink.
const textTones: Record<ButtonTone, string> = {
  ink: 'text-ink',
  muted: 'text-muted hover:text-ink',
  accent: 'text-accent hover:text-accent-hover',
}

const underlineOnHover =
  'underline-offset-3 hover:underline disabled:no-underline data-disabled:no-underline'

const link = cn(
  'min-h-11 min-w-11 bg-transparent font-semibold text-accent hover:text-accent-hover disabled:opacity-50 data-disabled:opacity-50',
  underlineOnHover,
)

const underline =
  'min-h-11 min-w-11 bg-transparent px-1.5 text-label font-medium text-tag-ink underline underline-offset-3 hover:text-ink disabled:opacity-50 data-disabled:opacity-50'

const text = cn(
  'min-h-11 bg-transparent px-2 text-sm disabled:opacity-50 data-disabled:opacity-50',
  underlineOnHover,
)

/**
 * How a button with this variant moves under the mouse (shared/lib/motion), for its
 * data-motion attribute: primaries lift, quiet buttons lift less, links and text don't.
 */
export function buttonMotion(variant: ButtonVariant = 'primary'): MotionKind | undefined {
  if (variant === 'primary') return 'lift'
  if (variant === 'quiet') return 'soft'
  return undefined
}

/** The class names for a button or link with this look (UI kit spec §3.1). */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  tone,
  textSize = 'sm',
  flush = false,
  weight = 'normal',
  block = false,
}: ButtonLook = {}): string {
  const flushLink = variant === 'link' && flush
  return cn(
    base,
    inactive,
    flushLink ? 'justify-start' : 'justify-center',
    variant === 'primary' && cn(primary, primarySizes[size]),
    variant === 'quiet' && cn(quiet, quietSizes[size], tones[tone ?? 'ink']),
    variant === 'link' &&
      cn(link, textSize === 'label' ? 'text-label' : 'text-sm', flushLink ? 'px-0' : 'px-1'),
    variant === 'underline' && underline,
    variant === 'text' &&
      cn(text, weight === 'medium' ? 'font-medium' : 'font-normal', textTones[tone ?? 'muted']),
    block && 'w-full',
  )
}
