import { useState } from 'react'

import { useMyProfile, useSession } from '@/entities/account'
import { NewPasswordForm } from '@/features/reset-password'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { useWords } from '@/shared/i18n/context'
import { PageHeader } from '@/shared/ui/PageHeader'

import { resetPageWords } from './model/words'
import { LinkExpired } from './ui/LinkExpired'
import { PasswordSaved } from './ui/PasswordSaved'

/**
 * Set a new password (auth spec §2.5, §6.4): where the reset and invite links land, signed in
 * by the link (a signed-in account may use it too). While the link is read it says only
 * "Loading…"; with no session (the link expired or was used, or the page was opened
 * directly) it offers a new link; once saved it says so.
 */
export function ResetPasswordPage() {
  const session = useSession()
  const profile = useMyProfile()
  const w = useWords(resetPageWords)
  const [result, setResult] = useState<'saved' | 'expired' | null>(null)
  // Whether the form has been on screen (it shows whenever someone is signed in), so the
  // expired state knows it replaced it: information kept from earlier renders.
  const [formShown, setFormShown] = useState(false)
  if (session.status === 'signed-in' && !formShown) setFormShown(true)

  if (result === 'saved') return <PasswordSaved username={profile.data?.username} />
  if (session.status === 'signed-out' || result === 'expired') {
    // After the form (the session ended before or while saving), focus moves to the new
    // heading (auth spec §7.5). Opened signed out, nothing takes focus.
    return <LinkExpired focusHeading={formShown} />
  }

  const loading = session.status === 'loading'
  const username = profile.data?.username
  return (
    <>
      <title>{`${w.title} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={w.title}
        titleId="reset-title"
        // Nothing to choose until the link has signed someone in: just "Loading…" below.
        description={
          loading ? undefined : username ? (
            <>
              {w.yourUsernameIs}
              <span className="font-semibold text-ink">{username}</span>
              {w.chooseAfterUsername}
            </>
          ) : (
            w.choose
          )
        }
      />
      {loading ? (
        <p role="status" className="text-sm text-muted">
          {w.loading}
        </p>
      ) : (
        <NewPasswordForm
          labelledBy="reset-title"
          onSaved={() => setResult('saved')}
          onExpired={() => setResult('expired')}
        />
      )}
    </>
  )
}
