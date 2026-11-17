import { mkdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

const firstNode = '查看节点 主控-洛杉矶 详情'
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`home TCP/UDP tile preserves original three columns at ${width}px ${dark ? 'dark' : 'light'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1050 })
      await installKomariFixture(page, { siteName: 'Atlas · 合成数据预览', hideEarth: true, dark, pingTaskOrdering: true, themeSettings: { showTcpConnections: true, showUdpConnections: true, carrierOrder: 'mobile,unicom,telecom' } })
      await page.goto('/')
      const card = page.getByRole('button', { name: firstNode, exact: true })
      const tile = card.locator('[data-node-connections]')
      await expect(tile.locator('[data-node-connection=tcp]')).toHaveText('TCP140')
      await expect(tile.locator('[data-node-connection=udp]')).toHaveText('UDP8')
      const grid = tile.locator('..')
      const boxes = await grid.locator(':scope > div').evaluateAll(els => els.map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }))
      expect(boxes).toHaveLength(4)
      expect(boxes[0]!.y).toBe(boxes[1]!.y)
      expect(boxes[1]!.y).toBe(boxes[2]!.y)
      expect(boxes[3]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height)
      expect(Math.abs(boxes[3]!.x - boxes[0]!.x)).toBeLessThan(1)
      expect(Math.abs(boxes[3]!.width - boxes[0]!.width)).toBeLessThan(1)
      expect(Math.abs(boxes[3]!.height - boxes[0]!.height)).toBeLessThan(1)
      expect(await page.locator('html').evaluate(el => el.scrollWidth)).toBe(width)
      await expect(card.locator('[data-node-metric-icon=cpu]')).toBeVisible()
      await expect(card.locator('[data-node-ping-bars=latency]')).toContainText('ms')
      mkdirSync('test-results/previews/home-connections', { recursive: true })
      await page.screenshot({ path: `test-results/previews/home-connections/${width}-${dark ? 'dark' : 'light'}.png` })
    })
  }
}

for (const [tcp, udp] of [[true, true], [true, false], [false, true], [false, false]] as const) {
  test(`home tile respects protocol visibility TCP ${tcp} UDP ${udp} after refresh`, async ({ page }) => {
    await installKomariFixture(page, { hideEarth: true, themeSettings: { showTcpConnections: tcp, showUdpConnections: udp } })
    await page.goto('/')
    const card = page.getByRole('button', { name: firstNode, exact: true })
    for (const refresh of [false, true]) {
      if (refresh)
        await page.reload()
      await expect(card.locator('[data-node-connections]')).toHaveCount(tcp || udp ? 1 : 0)
      await expect(card.locator('[data-node-connection=tcp]')).toHaveCount(tcp ? 1 : 0)
      await expect(card.locator('[data-node-connection=udp]')).toHaveCount(udp ? 1 : 0)
      if (tcp || udp) {
        const tile = card.locator('[data-node-connections]')
        const first = tile.locator('..').locator(':scope > div').first()
        expect(Math.abs((await tile.boundingBox())!.height - (await first.boundingBox())!.height)).toBeLessThan(1)
      }
    }
  })
}

for (const size of ['mini', 'comfortable', 'large'] as const) {
  test(`home connection tile matches a single ${size} metric box`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 })
    await installKomariFixture(page, { hideEarth: true, nodeCardSize: size })
    await page.goto('/')
    const tile = page.getByRole('button', { name: firstNode, exact: true }).locator('[data-node-connections]')
    await expect(tile).toBeVisible()
    const original = tile.locator('..').locator(':scope > div').first()
    const a = (await tile.boundingBox())!
    const b = (await original.boundingBox())!
    expect(Math.abs(a.width - b.width)).toBeLessThan(1)
    expect(Math.abs(a.height - b.height)).toBeLessThan(1)
  })
}

test('live counts update; zero is real, missing/invalid/offline is unavailable', async ({ page }) => {
  const live = { tcp: 0 as number | null, udp: null as number | null, online: true }
  await installKomariFixture(page, { hideEarth: true, firstNodeConnections: live, themeSettings: { rpcTransportMode: 'http', dataUpdateInterval: 1 } })
  await page.goto('/')
  const tile = page.getByRole('button', { name: firstNode, exact: true }).locator('[data-node-connections]')
  await expect(tile.locator('[data-node-connection=tcp]')).toHaveText('TCP0')
  await expect(tile.locator('[data-node-connection=udp]')).toHaveText('UDP—')
  live.tcp = 123456789
  live.udp = -1
  await expect(tile.locator('[data-node-connection=tcp]')).toHaveText('TCP123,456,789', { timeout: 15000 })
  await expect(tile.locator('[data-node-connection=udp]')).toHaveText('UDP—')
  expect(await tile.locator('[data-node-connection=tcp] span').last().getAttribute('title')).toBe('123,456,789')
  live.online = false
  await expect(tile.locator('[data-node-connection=tcp]')).toHaveText('TCP—', { timeout: 15000 })
})
