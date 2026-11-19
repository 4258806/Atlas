import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

for (const split of [false, true]) {
  for (const price of [0, -1]) {
    test(`free billing tile at price ${price} preserves paid and CPU data with split ${split}`, async ({ page }) => {
      await page.setViewportSize({ width: split ? 1440 : 390, height: 1050 })
      await installKomariFixture(page, {
        hideEarth: true,
        financeNodes: {
          0: { price, currency: 'USD', billing_cycle: 30, expired_at: '2026-08-09T12:00:00Z' },
          1: { price: 10, currency: 'USD', billing_cycle: 30, expired_at: '2026-08-09T12:00:00Z' },
        },
        themeSettings: { returnRoutesVisible: true, returnRouteHomeTileEnabled: split, visitorInfoEnabled: false },
      })
      await page.goto('/')
      const free = page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true })
      const billing = free.getByText('长期', { exact: true }).locator('../..')
      await expect(billing.getByText('免费', { exact: true })).toBeVisible()
      await expect(free.getByText('0.18, 0.14, 0.10', { exact: true })).toBeVisible()
      await expect(free.getByText('0.14 / 0.10', { exact: true })).toHaveCount(0)
      if (split) {
        await expect(billing.getByText('到期', { exact: true })).toBeVisible()
        await expect(free.getByText('负载', { exact: true })).toHaveCount(0)
      }
      const paid = page.getByRole('button', { name: '查看节点 香港边缘节点-超长名称布局测试 详情', exact: true })
      await expect(paid).toContainText('剩余15天')
      await expect(paid.getByText('USD5', { exact: true })).toBeVisible()
      expect(await page.locator('html').evaluate(el => el.scrollWidth)).toBe(split ? 1440 : 390)
    })
  }
}

test('hidden paid amounts stay hidden while the free billing label remains visible', async ({ page }) => {
  await installKomariFixture(page, {
    hideEarth: true,
    financeNodes: { 0: { price: 0, currency: 'USD', billing_cycle: 30 } },
    themeSettings: { hidePriceWhenLoggedOut: true, returnRoutesVisible: true, returnRouteHomeTileEnabled: true, visitorInfoEnabled: false },
  })
  await page.goto('/')
  const free = page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true })
  await expect(free.getByText('长期', { exact: true }).locator('../..').getByText('免费', { exact: true })).toBeVisible()
  const paid = page.getByRole('button', { name: '查看节点 香港边缘节点-超长名称布局测试 详情', exact: true })
  await expect(paid).toContainText('剩余')
  await expect(paid).not.toContainText('USD')
})
