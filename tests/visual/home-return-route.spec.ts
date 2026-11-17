import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

const UUID = '00000000-0000-4000-8000-000000000001'
const AT = '2026-07-25T11:00:00.000Z'
const { publicSummary } = createRequire(import.meta.url)('../../companion/enhanced-route-probe/public-summary.cjs')
function summary() {
  const snapshot = { schema: 1, nodes: { [UUID]: { enabled: true, state: 'completed', latest: {
    schema: 2,
    uuid: UUID,
    city: 'shanghai',
    source: 'helper',
    collectedAt: AT,
    protocols: ['tcp', 'udp'],
    carriers: Object.fromEntries(['telecom', 'unicom', 'mobile'].map((carrier, i) => [carrier, Object.fromEntries(['tcp', 'udp'].map(protocol => [protocol, {
      protocol,
      family: 4,
      direction: 'node-to-cn',
      target: `shanghai-${carrier}`,
      collectedAt: AT,
      status: 'ok',
      reachedTarget: true,
      hops: [{ ttl: 1, ips: [], asns: [[4134], [4837], [58453]][i], asnSource: 'team-cymru' }, { ttl: 2, ips: [['202.96.209.133', '210.22.97.1', '211.136.112.200'][i]], asns: [[4134], [4837], [58453]][i], asnSource: 'team-cymru' }],
      asnLookup: { enabled: true, queries: 0, cacheHits: 2, failures: 0 },
    }]))])),
  } } } }
  return publicSummary(snapshot, Date.parse(AT))
}
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`two-column public route tile at ${width}px ${dark ? 'dark' : 'light'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1050 })
      await installKomariFixture(page, { siteName: 'Atlas v0.0.3 · 合成预览', hideEarth: true, dark, pingTaskOrdering: true, themeSettings: { returnRoutesVisible: true, returnRouteHomeTileEnabled: true, returnRouteAutoEnabled: true, returnRouteCompanionEnabled: true, carrierOrder: 'mobile,unicom,telecom' } })
      const writes: string[] = []
      page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().includes('/enhanced-route-probe/'))
          writes.push(r.url())
      })
      await page.route('**/api/enhanced-route-probe/v1/summary', r => r.fulfill({ json: summary() }))
      await page.goto('/')
      const card = page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true })
      const tile = card.locator('[data-node-route-tile]')
      await expect(tile).toContainText('CMI')
      await expect(tile).toContainText('4837')
      expect(await tile.locator('[data-route-tile-carrier]').evaluateAll(els => els.map(e => e.getAttribute('data-route-tile-carrier')))).toEqual(['mobile', 'unicom', 'telecom'])
      const a = (await card.locator('[data-node-connections]').boundingBox())!
      const b = (await tile.boundingBox())!
      expect(Math.abs(a.y - b.y)).toBeLessThan(1)
      expect(Math.abs(b.width - (a.width * 2 + 6))).toBeLessThan(2)
      expect(b.x).toBeGreaterThan(a.x)
      await expect(card.locator('[data-node-ping-bars=latency]')).toContainText('ms')
      expect(await page.locator('html').evaluate(e => e.scrollWidth)).toBe(width)
      mkdirSync('docs/previews/0.0.3', { recursive: true })
      await page.screenshot({ path: `docs/previews/0.0.3/${width}-${dark ? 'dark' : 'light'}.png` })
      await tile.locator('summary').click()
      await expect(tile.locator('[data-route-tile-details]')).toBeVisible()
      await expect(tile.locator('[data-route-tile-details]')).toContainText('2026-07-25 11:00 UTC')
      expect(writes).toEqual([])
    })
  }
}

test('unavailable public feed never publishes legacy inline automatic evidence', async ({ page }) => {
  await installKomariFixture(page, { hideEarth: true, themeSettings: { returnRoutesVisible: true, returnRouteHomeTileEnabled: true, returnRouteAutoEnabled: true, returnRouteCompanionEnabled: true } })
  await page.route('**/api/enhanced-route-probe/v1/summary', r => r.fulfill({ status: 403, json: { error: 'disabled' } }))
  await page.goto('/')
  const tile = page.locator('[data-node-route-tile]').first()
  await expect(tile.locator('[data-route-tile-carrier]')).toHaveCount(3)
  await expect(tile).toContainText('未测')
  await expect(tile).not.toContainText('GIA')
})

test('TTL-expired public evidence and protocol disagreement stay explicit', async ({ page }) => {
  await installKomariFixture(page, { hideEarth: true, themeSettings: { returnRoutesVisible: true, returnRouteHomeTileEnabled: true, returnRouteAutoEnabled: true, returnRouteCompanionEnabled: true, returnRouteTtlHours: 1 } })
  await page.route('**/api/enhanced-route-probe/v1/summary', r => r.fulfill({ json: summary() }))
  await page.goto('/')
  await expect(page.locator('[data-node-route-tile]').first()).toContainText('过期')
})
