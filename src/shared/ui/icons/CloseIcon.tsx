import { Icon, type IconProps } from './Icon'

/** A cross: the Close button of a dialog or side panel (not drawn; same line style). */
export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}
