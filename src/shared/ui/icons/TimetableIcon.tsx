import { Icon, type IconProps } from './Icon'

/** A framed grid: the customer tab bar's Schedule. */
export function TimetableIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M9 9v12M15 9v12" />
    </Icon>
  )
}
