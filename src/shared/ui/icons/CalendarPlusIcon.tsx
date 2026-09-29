import { Icon, type IconProps } from './Icon'

/** A calendar with a plus: the customer tab bar's Book. */
export function CalendarPlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
    </Icon>
  )
}
