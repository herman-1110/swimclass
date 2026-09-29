import type { ReactNode } from 'react'
import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

// Temporary page body used until each screen is built. Delete once no page uses it.

const titleSize = {
  auth: 'text-[1.75rem] leading-tight', // 28px, design/Login.dc.html
  customer: 'text-title leading-tight', // 24px
  coach: 'text-title-desktop leading-tight', // 26px
}

type PlaceholderPageProps = {
  title: string
  description: string
  /** Which prompt in prompts/ builds this screen, e.g. "06". */
  builtIn: string
  variant: keyof typeof titleSize
  children?: ReactNode
}

export function PlaceholderPage({
  title,
  description,
  builtIn,
  variant,
  children,
}: PlaceholderPageProps) {
  return (
    <>
      <title>{`${title} · ${DEFAULT_BUSINESS_NAME}`}</title>
      <div className="flex flex-col gap-2">
        <h1 className={`m-0 font-semibold ${titleSize[variant]}`}>{title}</h1>
        <p className="m-0 text-muted">{description}</p>
      </div>
      <p className="m-0 rounded-small bg-subtle px-4 py-3 text-sm text-muted">
        This screen is a placeholder. It is built in prompt {builtIn}.
      </p>
      {children}
    </>
  )
}
