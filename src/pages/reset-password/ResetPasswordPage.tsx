import { useState } from 'react'

import { useMyProfile, useSession } from '@/entities/account'
import { NewPasswordForm } from '@/features/reset-password'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'
import { PageHeader } from '@/shared/ui/PageHeader'

import { LinkExpired } from './ui/LinkExpired'
import { PasswordSaved } from './ui/PasswordSaved'

const TITLE = 'Set a new password'

/**
 * Set a new password (auth spec §2.5, §6.4): where the reset and invite links land, signed in
 * by the link (a signed-in account may use it too). While the link is read it says
 * "Loading…"; with no session (the link expired or was used, or the page was opened
 * directly) it offers a new link; once saved it says so.
 */
export function ResetPasswordPage() {
  const session = useSession()
  const profile = useMyProfile()
  const [result, setResult] = useState<'saved' | 'expired' | null>(null)

  if (result === 'saved') return <PasswordSaved username={profile.data?.username} />
  if (session.status === 'signed-out' || result === 'expired') return <LinkExpired />

  const username = profile.data?.username
  return (
    <>
      <title>{`${TITLE} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <PageHeader
        size="auth"
        title={TITLE}
        titleId="reset-title"
        description={
          username ? (
            <>
              Your username is <span className="font-semibold text-ink">{username}</span>. Choose a
              new password.
            </>
          ) : (
            'Choose a new password.'
          )
        }
      />
      {session.status === 'loading' ? (
        <p role="status" className="text-sm text-muted">
          Loading…
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
