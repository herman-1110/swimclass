import type { ReactNode, SVGProps } from 'react'

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  /** Width and height in px: 22 in the tab bar, 18 in the week navigator, 16 in a back link. */
  size?: number
  /** 1.6 in the tab bar and week navigator, 1.8 in a back link. */
  strokeWidth?: number
}

/**
 * A line icon on a 24 px grid in the text colour (currentColor), hidden from screen
 * readers: the button or link around it carries the name (DESIGN §5).
 */
export function Icon({
  size = 22,
  strokeWidth = 1.6,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}
