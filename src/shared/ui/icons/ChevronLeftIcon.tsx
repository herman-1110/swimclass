import { Icon, type IconProps } from './Icon'

/** Previous week (18 px), or a back link (16 px, stroke 1.8). */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Icon>
  )
}
