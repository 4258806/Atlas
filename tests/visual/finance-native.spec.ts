// Deterministic UI fixtures. Native backend coverage is recorded separately.
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

for (const width of [390, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`finance dialog has a closed summary and compact toolbar at ${width}px ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme })
      await installKomariFixture(page, { themeShort: 'Atlas', loggedIn: true, dark: colorScheme === 'dark', hideEarth: true, generalCardKeys: ['remainingValue', 'monthlyCost'] })
      await page.goto('/')
      await page.getByRole('button', { name: '查看剩余价值明细', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: '价值与费用明细' })
      await expect(dialog.locator('svg[data-finance-tab-icon]')).toHaveCount(3)
      for (const tab of await dialog.getByRole('tab').all()) {
        const button = (await tab.boundingBox())!
        const icon = (await tab.locator('svg').boundingBox())!
        const label = (await tab.locator('span').boundingBox())!
        expect(Math.abs((icon.y + icon.height / 2) - (button.y + button.height / 2))).toBeLessThan(1)
        expect(Math.abs((label.y + label.height / 2) - (button.y + button.height / 2))).toBeLessThan(1)
        expect(Math.abs((icon.x + label.x + label.width) / 2 - (button.x + button.width / 2))).toBeLessThan(1)
      }
      const summary = dialog.locator('[data-finance-summary]')
      expect(await summary.evaluate((el) => {
        const style = getComputedStyle(el)
        return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].every(value => Number.parseFloat(value) > 0) && Number.parseFloat(style.borderTopLeftRadius) > 0
      })).toBe(true)
      const toolbar = await dialog.locator('[data-finance-toolbar]').boundingBox()
      const panel = await dialog.getByRole('tabpanel').boundingBox()
      expect(toolbar).not.toBeNull()
      expect(panel).not.toBeNull()
      expect(panel!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height)
      expect(panel!.y - toolbar!.y - toolbar!.height).toBeLessThan(32)
      expect(Math.abs(panel!.x - toolbar!.x)).toBeLessThan(2)
      expect(Math.abs(panel!.width - toolbar!.width)).toBeLessThan(2)
      const tabs = await dialog.getByRole('tablist').boundingBox()
      const filter = await dialog.getByRole('checkbox', { name: '排除免费节点' }).locator('..').boundingBox()
      expect(tabs).not.toBeNull()
      expect(filter).not.toBeNull()
      expect(filter!.x >= tabs!.x + tabs!.width || filter!.y >= tabs!.y + tabs!.height).toBe(true)
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      await page.screenshot({ path: `test-results/finance-dialog-${width}-${colorScheme}.png` })
      await dialog.getByRole('tab', { name: '按量估算', exact: true }).click()
      await expect(dialog.getByRole('combobox', { name: '估算节点', exact: true })).toBeVisible()
      await dialog.getByRole('tab', { name: '汇率设置', exact: true }).click()
      await expect(dialog.getByRole('button', { name: '恢复今日汇率', exact: true })).toBeVisible()
    })
  }
}

for (const width of [390, 1440]) {
  test(`fork tiled header keeps its original grid without extra UI at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await installKomariFixture(page, { earthRenderer: 'tiled' })
    await page.goto('/')
    await expect(page.locator('[data-general-card-key="monthlyCost"]')).toContainText('¥')
    await expect(page.locator('[data-rate-attribution]')).toHaveCount(0)
    const grid = page.locator('[data-general-card-key]').first().locator('..')
    expect(await grid.evaluate(el => getComputedStyle(el).display)).toBe('grid')
    expect(await grid.evaluate(el => el.parentElement!.children.length)).toBe(2)
    await expect(grid).toHaveClass(/auto-rows-\[4\.75rem\]/)
    await expect(page.locator('.earth-map-shell')).toBeVisible()
    expect(await page.locator('html').evaluate(el => el.scrollWidth)).toBe(width)
    await page.screenshot({ path: `test-results/finance-tiled-${width}.png`, fullPage: true })
  })

  test(`native node currencies and single-currency header persists at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await installKomariFixture(page, {
      themeShort: 'Atlas',
      loggedIn: true,
      hideEarth: true,
      preserveStorage: true,
      firstNodeName: 'Paid USD fixture',
      generalCardKeys: ['remainingValue', 'monthlyCost'],
      detailMetricCardKeys: ['price', 'monthlyCost', 'remainingValue'],
      financeNodes: {
        0: { price: 9.9, currency: 'USD', billing_cycle: 30, expired_at: '2026-08-09T12:00:00Z' },
        1: { price: 804.6, currency: 'CNY', billing_cycle: 180, expired_at: '2026-08-09T12:00:00Z' },
      },
    })
    let requests = 0
    page.on('request', (request) => {
      if (request.url().includes('open.er-api.com'))
        requests++
    })
    await page.goto('/')
    await expect(page.locator('[data-general-card-key="monthlyCost"]')).toContainText('¥')
    await expect(page.locator('[data-rate-attribution]')).toHaveCount(0)
    await page.getByRole('button', { name: '查看剩余价值明细', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '价值与费用明细' })
    const rows = dialog.getByRole('row')
    await expect(rows.nth(1)).toContainText('$4.95 USD')
    await expect(rows.nth(1)).toContainText('$9.90 USD')
    await expect(rows.nth(2)).toContainText('¥134.10 CNY')
    await dialog.getByRole('tab', { name: '汇率设置', exact: true }).click()
    await expect(dialog.getByRole('link', { name: /Rates By Exchange Rate API/ })).toHaveAttribute('href', 'https://www.exchangerate-api.com')
    await dialog.getByRole('combobox', { name: '显示币种', exact: true }).selectOption('EUR')
    await dialog.getByRole('tab', { name: '固定账单', exact: true }).click()
    await expect(rows.nth(1)).toContainText('$4.95 USD')
    await expect(rows.nth(2)).toContainText('¥134.10 CNY')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-summary-extra-currency]')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('[data-general-card-key="monthlyCost"]')).toContainText('€')
    await expect(page.locator('[data-general-card-key="monthlyCost"]')).not.toContainText('EUR')
    expect(await page.evaluate(() => localStorage.getItem('fin_currency'))).toBe('EUR')
    await expect(page.locator('[data-summary-extra-currency]')).toHaveCount(0)
    await page.getByRole('button', { name: '查看节点 Paid USD fixture 详情', exact: true }).click()
    await expect(page.getByText('$4.95', { exact: true })).toBeVisible()
    expect(requests).toBe(1)
    await page.screenshot({ path: `test-results/finance-native-${width}.png`, fullPage: true })
  })
}

test('no header finance means no rate-provider request', async ({ page }) => {
  await installKomariFixture(page, { hideEarth: true, generalCardKeys: ['memory', 'disk'], loggedIn: true })
  const requests: string[] = []
  page.on('request', (request) => {
    if (/er-api|frankfurter/.test(request.url()))
      requests.push(request.url())
  })
  await page.goto('/')
  await page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true }).click()
  await expect(page.getByText('主控-洛杉矶', { exact: true }).first()).toBeVisible()
  expect(requests).toEqual([])
})

for (const entry of [{ currency: 'AUD', price: 10, convertible: true }, { currency: 'credits', price: 10, convertible: false }, { currency: 'credits', price: 0, convertible: true }]) {
  test(`input currency ${entry.currency} at ${entry.price} stays native; summary availability is honest`, async ({ page }) => {
    await installKomariFixture(page, {
      themeShort: 'Atlas',
      loggedIn: true,
      hideEarth: true,
      firstNodeName: 'Currency input fixture',
      generalCardKeys: ['remainingValue', 'monthlyCost'],
      financeNodes: { 0: { price: entry.price, currency: entry.currency, billing_cycle: 30, expired_at: '2026-08-09T12:00:00Z' } },
    })
    await page.goto('/')
    const summary = page.locator('[data-general-card-key="monthlyCost"]')
    await expect(summary).toContainText(entry.convertible ? '¥' : '汇率不可用')
    await page.getByRole('button', { name: '查看剩余价值明细', exact: true }).click()
    const row = page.getByRole('dialog').getByRole('row').filter({ hasText: 'Currency input fixture' })
    await expect(row).toContainText(`${entry.price.toFixed(2)} ${entry.currency}`)
  })
}
