// Deterministic UI fixtures. Native backend coverage is recorded separately.
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

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
      themeShort: 'Enhanced',
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
      themeShort: 'Enhanced',
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
