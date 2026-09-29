import { Link } from 'react-router'

import { ROUTES } from '@/shared/config/routes'
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage'

export function CoachAddStudentsPage() {
  return (
    <PlaceholderPage
      title="Add students"
      description="Set up a group of 1 to 3 students from one account, with its pool location and starting balance."
      builtIn="09"
      variant="coach"
    >
      <p className="m-0">
        <Link to={ROUTES.coachStudents} className="inline-flex min-h-11 items-center">
          Back to students & payments
        </Link>
      </p>
    </PlaceholderPage>
  )
}
