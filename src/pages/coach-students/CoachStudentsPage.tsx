import { Link } from 'react-router'

import { ROUTES } from '@/shared/config/routes'
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage'

export function CoachStudentsPage() {
  return (
    <PlaceholderPage
      title="Students & payments"
      description="Every group's package, balance and payments."
      builtIn="09"
      variant="coach"
    >
      <p className="m-0">
        <Link
          to={ROUTES.coachAddStudents}
          className="inline-flex min-h-11 items-center font-semibold"
        >
          Add students
        </Link>
      </p>
    </PlaceholderPage>
  )
}
