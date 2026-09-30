import { DEFAULT_BUSINESS_NAME } from '@/shared/config/business'

import { usePublicSettings } from '../api/usePublicSettings'

type DocumentTitleProps = {
  /** The page's h1, word for word ("Book a lesson"). */
  page: string
}

/**
 * The browser tab's title on a signed-in page: "<page> · <business name>" (conventions §13.1,
 * the one way signed-in pages set it). It never waits for data: until the settings arrive, or
 * if they fail, it uses DEFAULT_BUSINESS_NAME. Render one per page, anywhere in it (React
 * puts it in <head>). Signed-out pages write DEFAULT_BUSINESS_NAME themselves:
 * get_public_settings refuses anon.
 */
export function DocumentTitle({ page }: DocumentTitleProps) {
  const settings = usePublicSettings()
  return <title>{`${page} · ${settings.data?.business_name ?? DEFAULT_BUSINESS_NAME}`}</title>
}
