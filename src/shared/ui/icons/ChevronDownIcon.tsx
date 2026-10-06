import { Icon, type IconProps } from './Icon'

/** A select's arrow (18 px). */
export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  )
}
