import { expect, test } from '@playwright/test'

const NOINDEX_PATHS: string[] = ['/login', '/en/login', '/pro/login', '/account/confirm']

test.describe('private pages stay out of the index', () => {
  for (const path of NOINDEX_PATHS) {
    test(`${path} asks robots for noindex`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    })
  }

  test('the homepage does not forbid indexing', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0)
  })
})
