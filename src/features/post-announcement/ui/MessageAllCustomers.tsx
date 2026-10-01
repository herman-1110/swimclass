import { useId, useState } from 'react'

import { messageFor } from '@/shared/config/messages'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Checkbox } from '@/shared/ui/Checkbox'
import { SectionTitle } from '@/shared/ui/SectionTitle'
import { Textarea } from '@/shared/ui/Textarea'

import { usePostAnnouncement } from '../api/usePostAnnouncement'
import {
  isBlank,
  MESSAGE_HELP,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PLACEHOLDER,
  SENT_NOTICE,
} from '../model/copy'
import { PinnedMessages } from './PinnedMessages'

type MessageAllCustomersProps = {
  /** The message went out: show this notice ("Sent to all customers."). */
  onSent?: (notice: string) => void
  /** A pinned message was removed: show this notice; its row is gone. */
  onRemoved?: (notice: string) => void
  /** Layout only: the side column's grid placement (full width from 768 px). */
  className?: string
}

/**
 * "Message all customers" (design/AdminSchedule.dc.html L231-240; the Schedule spec §3.7,
 * §6.3): the textarea, named by the section title and described by the drawn "Sent by email
 * and shown in the app" (§9 C11), "Pin as a banner until I remove it" (checked), and "Send
 * to all customers", which waits for some text. Sending emails every approved customer and,
 * when pinned, shows the message as their banner. The pinned messages follow, each with
 * Remove.
 */
export function MessageAllCustomers({ onSent, onRemoved, className }: MessageAllCustomersProps) {
  const titleId = useId()
  const [message, setMessage] = useState('')
  const [pinned, setPinned] = useState(true)
  const post = usePostAnnouncement({
    onPosted: () => {
      setMessage('')
      setPinned(true)
      onSent?.(SENT_NOTICE)
    },
  })
  const unavailable = isBlank(message) || post.isPending

  return (
    <section aria-labelledby={titleId} className={cn('flex flex-col gap-2.5', className)}>
      <SectionTitle id={titleId}>Message all customers</SectionTitle>
      <Textarea
        look="message"
        aria-labelledby={titleId}
        help={MESSAGE_HELP}
        placeholder={MESSAGE_PLACEHOLDER}
        maxLength={MESSAGE_MAX_LENGTH}
        value={message}
        readOnly={post.isPending}
        onChange={(event) => {
          setMessage(event.target.value)
          // The last refusal was about the old text.
          if (post.isError) post.reset()
        }}
      />
      <Checkbox
        labelSize="label"
        label="Pin as a banner until I remove it"
        checked={pinned}
        onChange={(event) => setPinned(event.target.checked)}
      />
      <Button
        block
        pending={post.isPending}
        // The disabled look while there is nothing to send, keeping focus (DESIGN §3).
        aria-disabled={unavailable || undefined}
        onClick={() => post.mutate({ message, pinned })}
      >
        {post.isPending ? 'Sending…' : 'Send to all customers'}
      </Button>
      {post.isError && (
        <p role="alert" className="text-label leading-normal text-warn">
          {messageFor(post.error, { audience: 'coach' })}
        </p>
      )}
      <PinnedMessages onRemoved={onRemoved} />
    </section>
  )
}
