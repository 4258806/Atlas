import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

const { qualityFixture } = createRequire(import.meta.url)('../fixtures/tcpquality.cjs')
const UUID = '00000000-0000-4000-8000-000000000001'
const AT = '2026-07-25T11:00:00.000Z'
for (const width of [320, 390, 1440]) {
  for (const dark of [false, true]) {
    test(`three-row glass return-route panel at ${width}/${dark ? 'dark' : 'light'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await installKomariFixture(page, { siteName: 'Atlas v0.0.4 · 合成预览', hideEarth: true, dark, themeSettings: { returnRoutesVisible: true, returnRouteHomeTileEnabled: true, returnRouteAutoEnabled: true, returnRouteCompanionEnabled: true, carrierOrder: 'mobile,unicom,telecom' } })
      const writes: string[] = []
      page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().includes('/enhanced-route-probe/'))
          writes.push(r.url())
      })
      await page.route('**/api/enhanced-route-probe/v1/summary', r => r.fulfill({ json: { schema: 1, nodes: { [UUID]: { enabled: true, state: 'completed', latest: null, quality: qualityFixture(UUID, AT) } } } }))
      await page.goto('/')
      const card = page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true })
      const tile = card.locator('[data-node-route-tile]')
      await expect(tile.locator('[data-route-tile-carrier]')).toHaveCount(3)
      const rows = await tile.locator('[data-route-tile-carrier]').evaluateAll(elements => elements.map(e => ({ carrier: e.getAttribute('data-route-tile-carrier'), y: e.getBoundingClientRect().y })))
      expect(rows.map(r => r.carrier)).toEqual(['mobile', 'unicom', 'telecom'])
      expect(rows[0]!.y).toBeLessThan(rows[1]!.y)
      expect(rows[1]!.y).toBeLessThan(rows[2]!.y)
      await expect(tile.locator('summary')).toContainText('三网回程')
      for (const carrier of ['mobile', 'unicom', 'telecom']) {
        await expect(tile.locator(`[data-route-tile-carrier=${carrier}]`)).toContainText('CN2GIA')
        await expect(tile.locator(`[data-route-tile-carrier=${carrier}]`)).toContainText('精品')
      }
      const a = (await card.locator('[data-node-connections]').boundingBox())!
      const b = (await tile.boundingBox())!
      if (width === 320) {
        expect(b.y).toBeGreaterThan(a.y + a.height)
      }
      else {
        expect(b.x).toBeGreaterThan(a.x)
        expect(a.y).toBeGreaterThan(b.y)
        expect(a.y + a.height).toBeLessThanOrEqual(b.y + b.height + 2)
      }
      expect(await page.locator('html').evaluate(e => e.scrollWidth)).toBe(width)
      mkdirSync('test-results/previews/0.0.4', { recursive: true })
      await card.screenshot({ path: `test-results/previews/0.0.4/${width}-${dark ? 'dark' : 'light'}.png` })
      await tile.locator('summary').click()
      await expect(tile.locator('[data-quality-variant]')).toHaveCount(5)
      await expect(tile.locator('[data-quality-variant=ipv6]')).toContainText('不可用')
      await expect(tile.locator('[data-quality-variant=large4]')).toContainText('163->4837')
      await expect(tile).toContainText('上海')
      await expect(tile).toContainText('TcpQuality')
      expect(writes).toEqual([])
    })
  }
}
