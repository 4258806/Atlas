import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { installKomariFixture } from './fixtures/komari'

async function fixture(page: Page, dark = false) {
  const state = { settings: { hideEarth: true, visitorInfoEnabled: false, themeMode: dark ? 'dark' : 'light', disablePageAnimation: true, rpcTransportMode: 'http', generalCardPreset: '自定义', generalCardKeys: 'connections\nremainingValue\nmonthlyCost', detailMetricCardPreset: '自定义', detailMetricCardKeys: 'connections\nuptime', unknownFuture: 'KEEP', trafficCycleConfig: '' } as Record<string, unknown>, writes: 0 }
  await installKomariFixture(page, { themeShort: 'Atlas', loggedIn: true, hideEarth: true, dark, pingTaskOrdering: true, themeSettings: state.settings })
  const pub = () => ({ theme: 'Atlas', theme_settings: state.settings, sitename: 'Atlas 0.0.2 Preview', record_enabled: true, record_preserve_time: 720, ping_record_preserve_time: 720, private_site: false })
  await page.route('**/api/public', r => r.fulfill({ json: { status: 'success', data: pub() } }))
  await page.route('**/api/rpc2', async (r) => {
    const d = r.request().postDataJSON()
    if (d.method === 'public:getPublicSettings')
      return r.fulfill({ json: { jsonrpc: '2.0', id: d.id, result: pub() } })
    return r.fallback()
  })
  await page.route('**/api/admin/theme/settings?theme=Atlas', async (r) => {
    state.settings = r.request().postDataJSON()
    state.writes++
    await r.fulfill({ json: { status: 'success' } })
  })
  return state
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Atlas 管理', exact: true }).click()
  await page.getByRole('tab', { name: '线路与延迟', exact: true }).click()
  await expect(page.locator('[data-carrier-order-editor]')).toBeVisible()
}
async function save(page: Page) {
  await page.getByRole('button', { name: '保存本分类设置', exact: true }).click()
  await expect(page.locator('[data-theme-settings-panel] > [role=status]')).toContainText('已保存并读回')
}
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`order, line, counts and refresh persist at ${width}px ${dark ? 'dark' : 'light'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      const state = await fixture(page, dark)
      await page.goto('/')
      const latency = page.locator('[data-node-ping-bars=latency]').first()
      await expect(latency.locator('[data-carrier-ping]')).toHaveCount(3)
      expect(await latency.locator('[data-carrier-ping]').evaluateAll(els => els.map(el => el.getAttribute('data-carrier-ping')))).toEqual(['unicom-latency', 'telecom-latency', 'mobile-latency'])
      await expect(page.locator('[data-ping-line]')).toHaveCount(0)
      await expect(latency).toContainText('ms')
      await page.screenshot({ path: `test-results/0.0.2-blocks-${width}-${dark ? 'dark' : 'light'}.png` })
      await open(page)
      const editor = page.locator('[data-carrier-order-editor]')
      if (width === 1440) {
        await editor.locator('[data-order-carrier=mobile]').dragTo(editor.locator('[data-order-carrier=unicom]'))
      }
      else {
        await page.getByRole('button', { name: '上移移动', exact: true }).click()
        await page.getByRole('button', { name: '上移移动', exact: true }).click()
      }
      await expect(editor.locator('[role=status]')).toHaveText('移动 → 联通 → 电信')
      await page.getByRole('combobox', { name: '延迟与丢包显示', exact: true }).selectOption('波浪线')
      await page.getByRole('checkbox', { name: '显示 UDP 连接数', exact: true }).uncheck()
      await save(page)
      expect(state.settings).toMatchObject({ carrierOrder: 'mobile,unicom,telecom', pingDisplayStyle: '波浪线', showUdpConnections: false, unknownFuture: 'KEEP', trafficCycleConfig: '' })
      await editor.scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/0.0.2-settings-${width}-${dark ? 'dark' : 'light'}.png` })
      await page.keyboard.press('Escape')
      await page.reload()
      await expect(latency.locator('[data-carrier-ping]')).toHaveCount(3)
      expect(await latency.locator('[data-carrier-ping]').evaluateAll(els => els.map(el => el.getAttribute('data-carrier-ping')))).toEqual(['mobile-latency', 'unicom-latency', 'telecom-latency'])
      await expect(latency.locator('[data-ping-line]')).toHaveCount(3)
      await expect(latency.locator('[data-ping-line] polyline').first()).toBeVisible()
      const counts = page.locator('[data-general-card-key=connections]')
      await expect(counts).toBeVisible()
      await expect(counts).not.toContainText('UDP')
      expect(await page.locator('html').evaluate(el => el.scrollWidth)).toBe(width)
      await page.screenshot({ path: `test-results/0.0.2-lines-${width}-${dark ? 'dark' : 'light'}.png` })
      await open(page)
      await page.getByRole('checkbox', { name: '显示 TCP 连接数', exact: true }).uncheck()
      await save(page)
      await page.keyboard.press('Escape')
      await expect(counts).toBeHidden()
      expect(state.writes).toBe(2)
      await page.reload()
      await expect(counts).toBeHidden()
      await page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true }).click()
      await expect(page.locator('[data-detail-metric=uptime]')).toBeVisible()
      await expect(page.locator('[data-detail-metric=connections]')).toHaveCount(0)
    })
  }
}

test('keyboard order editing stays focused and cancels without writing', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/')
  await open(page)
  const first = page.getByRole('button', { name: '拖动联通排序', exact: true })
  await first.focus()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(first).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-carrier-order-editor] [role=status]')).toHaveText('电信 → 移动 → 联通')
  expect(state.writes).toBe(0)
})

test('list Ping reuses history for line mode without showing fabricated empty values', async ({ page }) => {
  await installKomariFixture(page, { hideEarth: true, viewMode: 'list', pingTaskOrdering: true, themeSettings: { pingDisplayStyle: '波浪线' } })
  await page.goto('/')
  await expect(page.getByRole('button', { name: '打开延迟和丢包监测' }).first().locator('[data-ping-line]')).toHaveCount(2)
  await expect(page.locator('[data-ping-line] polyline').first()).toBeVisible()
})

for (const [tcp, udp, total] of [[true, true, '2,726'], [true, false, '2,577'], [false, true, '149'], [false, false, null]] as const) {
  test(`connection switches TCP ${tcp} UDP ${udp} show only the selected counts`, async ({ page }) => {
    await installKomariFixture(page, { hideEarth: true, generalCardKeys: ['connections'], detailMetricCardKeys: ['connections', 'uptime'], themeSettings: { showTcpConnections: tcp, showUdpConnections: udp } })
    await page.goto('/')
    if (total === null)
      await expect(page.locator('[data-general-card-key=connections]')).toHaveCount(0)
    else
      await expect(page.locator('[data-general-card-key=connections]')).toContainText(total)
    await page.getByRole('button', { name: '查看节点 主控-洛杉矶 详情', exact: true }).click()
    await expect(page.locator('[data-detail-metric=uptime]')).toBeVisible()
    if (total === null)
      await expect(page.locator('[data-detail-metric=connections]')).toHaveCount(0)
    else
      await expect(page.locator('[data-detail-metric=connections]')).toBeVisible()
  })
}
