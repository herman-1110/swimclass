import { OptionRow } from '@/shared/ui/OptionRow'
import { Tag } from '@/shared/ui/Tag'

type GroupOptionPreviewProps = {
  /** The names as the customer will see them: "Adam, Alya & Amir" (joinNames). */
  names: string
  /** "1-to-3". */
  typeLabel: string
}

/**
 * The row a customer will see in Book's "Who’s this lesson for?", drawn chosen and still
 * (Add students' "What the customer sees when booking"; AdminAddStudents.dc.html:110-113).
 * It is only a picture of the row: no input, the mark hidden from screen readers.
 */
export function GroupOptionPreview({ names, typeLabel }: GroupOptionPreviewProps) {
  return <OptionRow preview label={names} trailing={<Tag>{typeLabel}</Tag>} />
}
