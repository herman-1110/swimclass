import { Icon, type IconProps } from './Icon'

/** Three sliders: the coach tab bar's Settings. */
export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Icon>
  )
}
