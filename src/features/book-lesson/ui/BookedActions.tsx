import { ROUTES } from '@/shared/config/routes'
import { useWords } from '@/shared/i18n/context'
import { Button } from '@/shared/ui/Button'
import { ButtonLink } from '@/shared/ui/ButtonLink'

import { bookLessonWords } from '../model/words'

type BookedActionsProps = {
  /** Clears the panel; the day, group and length stay. */
  onBookAnother: () => void
}

/** "Book another lesson" and "See My classes", under the success panel's text (book spec §5.3.2). */
export function BookedActions({ onBookAnother }: BookedActionsProps) {
  const w = useWords(bookLessonWords)
  return (
    <div className="-ml-3.5 flex flex-wrap items-center gap-x-2">
      <Button variant="quiet" onClick={onBookAnother}>
        {w.bookAnother}
      </Button>
      <ButtonLink variant="link" to={ROUTES.myClasses}>
        {w.seeMyClasses}
      </ButtonLink>
    </div>
  )
}
