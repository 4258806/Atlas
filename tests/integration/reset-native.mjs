// Real disposable official Komari backend. History is explicitly synthetic SQL,
// never a production database, real billing sample, or mocked HTTP response.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'

const RATE_URL = /er-api|frankfurter/
const RATE_NETWORK_ERROR = /CORS|Content Security Policy|er-api|frankfurter/

async function main() {
  const [binary, python, baseline, candidate] = process.argv.slice(2).map(p => resolve(p))
  assert(binary && python && baseline && candidate, 'backend, Python, baseline ZIP and candidate ZIP required')
  const root = process.cwd()
  const finance = process.argv.includes('--finance')
  const out = join(root, finance ? 'test-results/native-finance' : 'test-results/native-reset')
  mkdirSync(out, { recursive: true })
  const labs = join(root, 'test-results/full')
  mkdirSync(labs, { recursive: true })
  const state = mkdtempSync(join(labs, 'native-lab-reset-'))
  const socket = net.createServer()
  await new Promise(r => socket.listen(0, '127.0.0.1', r))
  const port = socket.address().port
  await new Promise(r => socket.close(r))
  const origin = `http://127.0.0.1:${port}`
  const username = 'isolated-reset-acceptance'
  const password = `TestA1${randomBytes(24).toString('hex')}`
  const log = openSync(join(state, 'backend.log'), 'a')
  let server
  let browser
  let vite
  let cookie = ''
  let seq = 0
  const checks = []
  const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex')
  const report = { kind: 'official-Komari-1.6.1-loopback-native-reset-acceptance', productionTouched: false, history: 'explicit synthetic SQL fixture', backendSHA256: sha(binary), baselineSHA256: sha(baseline), candidateSHA256: sha(candidate), checks }

  function start() {
    server = spawn(binary, ['--database', join(state, 'data/komari.db'), '--db-type', 'sqlite', 'server', '--listen', `127.0.0.1:${port}`], { cwd: state, windowsHide: true, stdio: ['ignore', log, log] })
  }
  async function stop() {
    if (server && server.exitCode === null) {
      const exited = new Promise(r => server.once('exit', r))
      server.kill('SIGTERM')
      await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('isolated backend stop timeout')), 10000).unref())])
    }
  }
  async function request(path, data, auth = true) {
    const response = await fetch(origin + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { Cookie: cookie } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000), redirect: 'error' })
    const payload = await response.json()
    assert.equal(response.status, 200, `${path}: native HTTP status`)
    return { response, payload }
  }
  async function api(path, data) {
    const { payload } = await request(path, data)
    assert.equal(payload.status, 'success', `${path}: native envelope`)
    return payload.data
  }
  async function rpc(method, params = {}) {
    const { payload } = await request('/api/rpc2', { jsonrpc: '2.0', id: ++seq, method, params })
    assert(!payload.error, `native RPC ${method}: ${payload.error?.message}`)
    return payload.result
  }
  async function ready(path) {
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        return await api(path)
      }
      catch {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    throw new Error(`isolated backend readiness failed: ${path}`)
  }
  async function upload(path) {
    const bytes = readFileSync(path)
    const init = await api('/api/admin/upload/init', { purpose: 'theme', filename: 'isolated-theme.zip', size: bytes.length })
    for (let offset = 0, index = 0; offset < bytes.length; offset += init.chunk_size, index++) {
      const form = new FormData()
      form.append('upload_id', init.upload_id)
      form.append('chunk_index', String(index))
      form.append('chunk_data', new Blob([bytes.subarray(offset, offset + init.chunk_size)]), 'chunk')
      const response = await fetch(`${origin}/api/admin/upload/chunk`, { method: 'POST', headers: { Cookie: cookie }, body: form, signal: AbortSignal.timeout(20000) })
      assert.equal(response.status, 200)
    }
    await api('/api/admin/upload/merge', { upload_id: init.upload_id })
  }
  async function check(name, action) {
    try {
      await action()
      checks.push({ name, status: 'passed' })
      process.stdout.write(`PASS ${name}\n`)
    }
    catch (error) {
      checks.push({ name, status: 'failed', error: error.message })
      throw error
    }
  }

  try {
    start()
    await check('fresh official backend and verified native administrator session', async () => {
      assert.equal((await ready('/api/install/status')).required, true)
      await api('/api/install/complete', { username, password, sitename: 'Isolated reset acceptance', description: 'Synthetic history; not production', metric_dsn: './data/metrics.db' })
      assert.equal((await ready('/api/version')).version, '1.6.1')
      const login = await request('/api/login', { username, password }, false)
      assert.equal(login.payload.status, 'success')
      cookie = login.response.headers.get('set-cookie').split(';')[0]
      assert.equal((await request('/api/me')).payload.logged_in, true)
    })
    const clients = []
    for (const name of ['Reset fixture A', 'Reset fixture B']) {
      const { payload } = await request('/api/admin/client/add', { name })
      const uuid = payload.uuid ?? payload.data?.uuid
      assert(uuid)
      clients.push({ uuid, name })
    }
    const a = clients[0].uuid
    const b = clients[1].uuid
    const legacy = { version: 1, timeZone: 'Asia/Shanghai', nodes: { [a]: { resetDay: 8, timeZone: 'UTC' }, [b]: { resetDay: 5 } } }
    const settings = { hideEarth: true, hideGeneralCard: true, visitorInfoEnabled: false, disablePageAnimation: true, rpcTransportMode: 'http', unknownFuture: { keep: true }, trafficCycleConfig: JSON.stringify(legacy) }
    await check('install exact baseline, upgrade candidate and preserve settings', async () => {
      await upload(baseline)
      await rpc('admin:editSettings', { theme: 'Enhanced' })
      await api('/api/admin/theme/settings?theme=Enhanced', settings)
      await upload(candidate)
      const after = (await rpc('public:getPublicSettings')).theme_settings
      assert.equal(after.trafficCycleConfig, settings.trafficCycleConfig)
      assert.deepEqual(after.unknownFuture, settings.unknownFuture)
    })
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const [cookieName, cookieValue] = cookie.split('=')
    await context.addCookies([{ name: cookieName, value: cookieValue, url: origin }])
    const page = await context.newPage()
    const errors = []
    const rateFailures = []
    page.on('requestfailed', (request) => {
      if (RATE_URL.test(request.url()))
        rateFailures.push({ url: request.url(), error: request.failure()?.errorText })
    })
    page.on('console', (message) => {
      if (RATE_NETWORK_ERROR.test(message.text()))
        rateFailures.push({ browser: message.text().slice(0, 500) })
    })
    report.rateNetworkDiagnostics = rateFailures
    page.on('pageerror', error => errors.push(error.message))
    const open = async () => {
      await page.goto(origin)
      await page.getByRole('button', { name: 'Enhanced 管理', exact: true }).click()
      await page.getByRole('tab', { name: '节点与卡片', exact: true }).click()
    }
    await check('fork day-only editor preserves backend-saved timezone and minute on desktop and mobile', async () => {
      for (const width of [1440, 390]) {
        const before = (await rpc('public:getPublicSettings')).theme_settings
        const saved = { resetDay: 7, timeZone: width === 1440 ? 'Asia/Shanghai' : 'America/Los_Angeles', hour: 23, minute: 10, futureScheduleField: 'keep' }
        const configured = { version: 2, nodes: { [a]: saved, [b]: { resetDay: 5, timeZone: 'Asia/Shanghai', hour: 0, minute: 0 } } }
        await api('/api/admin/theme/settings?theme=Enhanced', { ...before, trafficCycleConfig: JSON.stringify(configured) })
        await page.setViewportSize({ width, height: 1000 })
        await open()
        const row = page.locator(`[data-traffic-cycle-node="${a}"]`)
        await expect(row.locator('select')).toHaveValue('7')
        await expect(row.locator('input[type="time"]')).toHaveCount(0)
        await expect(row.getByRole('textbox', { name: 'Reset fixture A 重置时区', exact: true })).toHaveCount(0)
        await row.locator('select').selectOption('8')
        await row.getByRole('button', { name: '保存 Reset fixture A 流量周期', exact: true }).click()
        await expect(row.getByRole('status')).toContainText('已保存并读回')
        await page.reload()
        await page.getByRole('button', { name: 'Enhanced 管理', exact: true }).click()
        await page.getByRole('tab', { name: '节点与卡片', exact: true }).click()
        await expect(row.locator('select')).toHaveValue('8')
        await expect(row.locator('input[type="time"]')).toHaveCount(0)
        const after = (await rpc('public:getPublicSettings')).theme_settings
        const plan = JSON.parse(after.trafficCycleConfig)
        assert.equal(plan.version, 2)
        assert.deepEqual(plan.nodes[a], { ...saved, resetDay: 8 })
        assert.deepEqual(plan.nodes[b], { resetDay: 5, timeZone: 'Asia/Shanghai', hour: 0, minute: 0 })
        assert.deepEqual(after.unknownFuture, settings.unknownFuture)
        await page.screenshot({ path: join(out, `native-reset-${width}.png`), fullPage: true })
      }
    })
    await check('native per-metric retention and tier configuration read back without disabling metrics', async () => {
      await rpc('admin:editSettings', { metric_rollup_minute_retention_minutes: 48000, metric_rollup_five_minute_retention_minutes: 49000, metric_rollup_hour_retention_hours: 840 })
      for (const name of ['traffic.up', 'traffic.down', 'net.total.up', 'net.total.down']) {
        const changed = await rpc('admin:updateMetricDefinition', { name, retention_days: 36 })
        assert.equal(changed.retention_days, 36)
      }
    })
    vite = await createServer({ configFile: false, resolve: { alias: { '@': join(root, 'src') } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, watch: null }, appType: 'custom' })
    const helpers = await vite.ssrLoadModule('/src/utils/trafficCycle.ts')
    const now = Date.now()
    const local = new Date(now - 2 * 86400000)
    const schedule = { resetDay: local.getUTCDate(), timeZone: 'Asia/Shanghai', hour: 23, minute: 10 }
    const period = helpers.trafficPeriod(schedule, now)
    const plan = { a, b, start: period.start, asOf: Math.floor(now / 60000) * 60000 }
    writeFileSync(join(state, 'fixture-plan.json'), JSON.stringify(plan))
    await check('native persisted minute edge and hourly body sum exactly without history mutation', async () => {
      await stop()
      const seeded = JSON.parse(execFileSync(python, [join(root, 'tests/integration/seed-reset-history.py'), join(state, 'data/metrics.db'), join(state, 'fixture-plan.json')], { encoding: 'utf8' }))
      report.syntheticRows = seeded.rows
      start()
      await ready('/api/version')
      const snapshots = []
      for (const range of helpers.trafficQueryRanges(period, plan.asOf)) {
        const data = await rpc('public:queryMetrics', { entity_id: a, metric_keys: [...helpers.TRAFFIC_METRICS], start: new Date(range.start - 3600000).toISOString(), end: new Date(range.end - 1).toISOString(), aggregation_by_metric: { 'traffic.up': 'sum', 'traffic.down': 'sum', 'net.total.up': 'last', 'net.total.down': 'last' }, max_points: range.maxPoints, fill_empty: false })
        const snap = helpers.resolveTrafficMetrics(data, a, { start: range.start, end: range.end }, range.end)
        assert.equal(snap.status, 'ready', snap.reason)
        snapshots.push(snap)
      }
      const combined = helpers.combineTrafficSnapshots(snapshots, period, plan.asOf)
      assert.equal(combined.up, seeded.expectedUp)
      assert.equal(combined.down, seeded.expectedDown)
      const verify = JSON.parse(execFileSync(python, [join(root, 'tests/integration/seed-reset-history.py'), join(state, 'data/metrics.db'), join(state, 'fixture-plan.json'), '--verify'], { encoding: 'utf8' }))
      assert.equal(verify.sha256, seeded.sha256)
    })
    await check('rollback restores baseline ZIP plus exact v1 settings and re-upgrade retains configuration', async () => {
      await upload(baseline)
      await api('/api/admin/theme/settings?theme=Enhanced', settings)
      assert.equal((await rpc('public:getPublicSettings')).theme_settings.trafficCycleConfig, settings.trafficCycleConfig)
      await upload(candidate)
      assert.equal((await rpc('public:getPublicSettings')).theme_settings.trafficCycleConfig, settings.trafficCycleConfig)
      await page.setViewportSize({ width: 1440, height: 1000 })
      await open()
      await expect(page.locator(`[data-traffic-cycle-node="${a}"] select`)).toHaveValue('8')
      await expect(page.locator(`[data-traffic-cycle-node="${a}"] input[type="time"]`)).toHaveCount(0)
      assert.deepEqual(errors, [])
    })
    if (finance) {
      await check('native node billing stays in its own currency while the header selects one currency', async () => {
        const expiry = new Date(Date.now() + 15 * 86400000).toISOString()
        await rpc('admin:editClient', { uuid: a, price: 9.9, currency: 'USD', billing_cycle: 30, expired_at: expiry })
        await rpc('admin:editClient', { uuid: b, price: 804.6, currency: 'CNY', billing_cycle: 180, expired_at: expiry })
        const before = (await rpc('public:getPublicSettings')).theme_settings
        await api('/api/admin/theme/settings?theme=Enhanced', { ...before, hideGeneralCard: false, generalCardPreset: '自定义', generalCardKeys: 'remainingValue\nmonthlyCost', detailMetricCardPreset: '自定义', detailMetricCardKeys: 'price\nmonthlyCost\nremainingValue' })
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 1000 })
          await page.goto(origin)
          const summary = page.locator('[data-general-card-key="remainingValue"]')
          await expect(summary).toContainText('¥', { timeout: 15000 })
          await expect(page.locator('[data-rate-attribution]')).toHaveCount(0)
          await expect(summary).not.toContainText('汇率不可用', { timeout: 15000 })
          await summary.click()
          const dialog = page.getByRole('dialog', { name: '价值与费用明细' })
          const usdRow = dialog.getByRole('row').filter({ hasText: 'Reset fixture A' })
          const cnyRow = dialog.getByRole('row').filter({ hasText: 'Reset fixture B' })
          await expect(usdRow).toContainText('$9.90 USD')
          await expect(cnyRow).toContainText('¥134.10 CNY')
          await dialog.getByRole('combobox', { name: '显示币种', exact: true }).selectOption('EUR')
          await expect(usdRow).toContainText('$4.95 USD')
          await expect(cnyRow).toContainText('¥134.10 CNY')
          await page.keyboard.press('Escape')
          await page.reload()
          await expect(summary).toContainText('€')
          await expect(summary).not.toContainText('EUR')
          await expect(page.locator('[data-summary-extra-currency]')).toHaveCount(0)
          await page.screenshot({ path: join(out, `native-finance-${width}.png`), fullPage: true })
          await page.goto(`${origin}/instance/${a}`)
          await expect(page.getByText('$4.95', { exact: true })).toBeVisible()
          await page.evaluate(() => localStorage.setItem('fin_currency', 'CNY'))
        }
        assert.deepEqual((await rpc('public:getPublicSettings')).theme_settings.unknownFuture, settings.unknownFuture)
        assert.deepEqual(errors, [])
      })
    }
    report.status = 'passed'
  }
  catch (error) {
    report.status = 'failed'
    report.error = error.message
    process.exitCode = 1
    console.error(error)
  }
  finally {
    if (browser)
      await browser.close()
    if (vite)
      await vite.close()
    await stop()
    closeSync(log)
    writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
