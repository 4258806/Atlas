import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

for (const width of [390, 1440]) {
  test(`Atlas identifies home, detail and settings without losing the site name at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await installKomariFixture(page, { themeShort: 'Atlas', loggedIn: true, hideEarth: true })
    for (const path of ['/', '/instance/00000000-0000-4000-8000-000000000001']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { name: 'Komari Visual Lab', exact: true })).toBeVisible()
      await expect(page).toHaveTitle('Komari Visual Lab · Atlas')
      const footer = page.locator('footer')
      await expect(footer.getByRole('link', { name: 'Atlas', exact: true })).toHaveAttribute('href', 'https://github.com/MagnetOscar/Atlas')
      await expect(footer).toContainText('Theme by')
      await expect(footer).not.toContainText('Glassmorphism')
      await expect(footer.getByRole('link', { name: 'Komari Monitor', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Atlas 管理', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Enhanced 管理', exact: true })).toHaveCount(0)
    }
    await page.getByRole('button', { name: 'Atlas 管理', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Atlas 集中管理', exact: true })).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Atlas 主题设置分类', exact: true })).toBeVisible()
    expect(await page.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  })
}
