import type { BrowserContext, Page } from '@playwright/test'

export type BrowserIssue = {
  kind: 'csp' | 'console' | 'pageerror'
  page: string
  text: string
}

type CspReporter = (page: string, directive: string, blocked: string) => Promise<void>

/**
 * Records, on every page of a context, the `securitypolicyviolation` events, the console errors
 * and the uncaught page errors raised while the page is on the given origin.
 * @param context - Browser context under test
 * @param origin - Only pages of this origin are watched, so Stripe's own page is ignored
 * @returns Live list of the issues seen so far
 */
export const watchBrowserIssues = async (
  context: BrowserContext,
  origin: string,
): Promise<BrowserIssue[]> => {
  const issues: BrowserIssue[] = []
  await context.exposeFunction('reportCspViolation', ((
    page: string,
    directive: string,
    blocked: string,
  ): Promise<void> => {
    if (page.startsWith(origin)) {
      issues.push({ kind: 'csp', page, text: `${directive} blocked ${blocked}` })
    }
    return Promise.resolve()
  }) satisfies CspReporter)
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event: SecurityPolicyViolationEvent) => {
      const report = (
        window as unknown as { reportCspViolation: (...args: string[]) => Promise<void> }
      ).reportCspViolation
      void report(location.href, event.violatedDirective, event.blockedURI)
    })
  })
  const watch = (page: Page): void => {
    page.on('console', message => {
      if (message.type() === 'error' && page.url().startsWith(origin)) {
        issues.push({ kind: 'console', page: page.url(), text: message.text() })
      }
    })
    page.on('pageerror', error => {
      if (page.url().startsWith(origin)) {
        issues.push({ kind: 'pageerror', page: page.url(), text: error.message })
      }
    })
  }
  context.pages().forEach(watch)
  context.on('page', watch)
  return issues
}
