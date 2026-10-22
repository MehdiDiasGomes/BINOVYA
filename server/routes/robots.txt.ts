import type { H3Event } from 'h3'

import { SEO_FILE_CACHE_CONTROL } from '@/constants/seo'

export default defineEventHandler((event: H3Event): string => {
  setResponseHeaders(event, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': SEO_FILE_CACHE_CONTROL,
  })
  const siteUrl: string = resolvePublicSiteUrl(event)
  const lines: string[] = ['User-agent: *', 'Disallow: /api/']
  if (siteUrl) {
    lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`)
  }
  return `${lines.join('\n')}\n`
})
