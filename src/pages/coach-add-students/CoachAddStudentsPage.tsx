import { useNavigate, useSearchParams } from 'react-router'

import { DocumentTitle } from '@/entities/settings'
import { type AddedState, AddStudentsForm } from '@/features/add-students'
import { coachStudentsAdded, ROUTES } from '@/shared/config/routes'
import { BackLink } from '@/shared/ui/BackLink'
import { PageHeader } from '@/shared/ui/PageHeader'

const TITLE = 'Add students'

/**
 * Add students (`/coach/add-students`; AdminAddStudents.dc.html, AdminAddStudentsPhone.dc.html):
 * a new group of 1 to 3 students for a customer account, or for a new account. `?account=`
 * picks the account at first. Once the group exists it goes back to Students & payments with
 * the new row highlighted (`?added=<group id>`), and tells it in router state whom a new
 * account's invite went to ("3 students added · Invite sent to {email}").
 */
export function CoachAddStudentsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  return (
    // The coach layout leaves the padding to each page: 12/20/32 on phones, 24/32/32 from
    // 768 px, 24/40/32 from 1024 px, blocks 16 then 20 px apart (AdminAddStudents.dc.html:24-35).
    <div className="flex flex-col gap-4 px-5 pt-3 pb-8 md:gap-5 md:px-8 md:pt-6 lg:px-10">
      <DocumentTitle page={TITLE} />
      <BackLink to={ROUTES.coachStudents} aria-label="Back to Students & payments">
        Students &amp; payments
      </BackLink>
      <PageHeader
        size="coach"
        title={TITLE}
        description="Set up who books together. Students in one group share their lessons and one package."
      />
      <AddStudentsForm
        initialAccountId={params.get('account') ?? undefined}
        onAdded={(added) => {
          const state: AddedState = { added }
          void navigate(coachStudentsAdded(added.groupId), { state })
        }}
      />
    </div>
  )
}
