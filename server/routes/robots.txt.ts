export default defineEventHandler((event): string => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  const siteUrl: string = resolvePublicSiteUrl(event)
  const lines: string[] = ['User-agent: *', 'Disallow: /api/']
  if (siteUrl) {
    lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`)
  }
  return `${lines.join('\n')}\n`
})
