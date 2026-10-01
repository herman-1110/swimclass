import type { ReactNode } from 'react'

type CardFooterProps = {
  /** Centred lines: a link or button, then an optional 12 px note. */
  children: ReactNode
}

/**
 * The foot of a sign-in card page (auth spec §2.1; design/Login.dc.html .card-foot): on
 * phones it sits at the bottom of the screen (mt-auto); from 768 px it comes 8 px after the
 * page's last block, under a hairline. Render it as a direct child of AuthLayout's <main>,
 * after the heading and the form.
 */
export function CardFooter({ children }: CardFooterProps) {
  return (
    <div className="mt-auto flex flex-col items-center gap-0.5 text-center md:mt-2 md:border-t md:border-line md:pt-6">
      {children}
    </div>
  )
}
