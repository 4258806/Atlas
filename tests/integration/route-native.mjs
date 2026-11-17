// Real disposable official Komari 1.6.1. Route payloads are explicit synthetic
// evidence; this test never runs traceroute or contacts a production server.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import net from 'node:net'
import { join, resolve } from 'node:path'
import process from 'node:process'

const { normalizeResult } = createRequire(import.meta.url)('../../companion/enhanced-route-probe/protocol.cjs')
const PRIVATE_FIELDS = /8\.8\.8\.8|1\.1\.1\.1|helperVersion|lease|token/
async function main() {
  const binary = resolve(process.argv[2])
  const plugin = resolve(process.argv[3])
  const root = process.cwd()
  mkdirSync(join(root, 'test-results/full'), { recursive: true })
  const state = mkdtempSync(join(root, 'test-results/full/native-lab-route-'))
  const socket = net.createServer()
  await new Promise(r => socket.listen(0, '127.0.0.1', r))
  const port = socket.address().port
  await new Promise(r => socket.close(r))
  const origin = `http://127.0.0.1:${port}`
  const log = openSync(join(state, 'server.log'), 'a')
  let server
  let cookie = ''
  let seq = 0
  const checks = []
  const username = 'isolated-route-acceptance'
  const password = `TrialA1${randomBytes(24).toString('hex')}`
  function start() {
    server = spawn(binary, ['--database', join(state, 'data/komari.db'), '--db-type', 'sqlite', 'server', '--listen', `127.0.0.1:${port}`], { cwd: state, windowsHide: true, stdio: ['ignore', log, log] })
  }
  async function stop() {
    if (server?.exitCode === null) {
      const ended = new Promise(r => server.once('exit', r))
      server.kill()
      await ended
    }
  }
  async function request(path, data, auth = true) {
    return fetch(origin + path, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { 'Cookie': cookie, 'X-Enhanced-Route': '1' } : {}) }, body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000), redirect: 'error' })
  }
  async function api(path, data) {
    const response = await request(path, data)
    const p = await response.json()
    assert.equal(response.status, 200)
    assert.equal(p.status, 'success', path)
    return p.data ?? p
  }
  async function rpc(method, params = {}) {
    const response = await request('/api/rpc2', { jsonrpc: '2.0', id: ++seq, method, params })
    const p = await response.json()
    assert(!p.error, JSON.stringify(p.error))
    return p.result
  }
  async function ready() {
    for (let i = 0; i < 100; i++) {
      try {
        await api('/api/install/status')
        return
      }
      catch {
        try {
          await api('/api/version')
          return
        }
        catch { }
      }
      await new Promise(r => setTimeout(r, 100))
    }
    throw new Error('backend not ready')
  }
  async function check(name, fn) {
    await fn()
    checks.push({ name, status: 'passed' })
    process.stdout.write(`PASS ${name}\n`)
  }
  const endpoint = '/api/enhanced-route-probe/v1'
  async function raw(path, data, auth = true) {
    const r = await request(endpoint + path, data, auth)
    return { status: r.status, body: await r.json() }
  }
  try {
    start()
    await ready()
    await api('/api/install/complete', { username, password, sitename: 'Isolated routes', metric_dsn: './data/metrics.db' })
    for (let i = 0; i < 100; i++) {
      try {
        await api('/api/version')
        break
      }
      catch {
        await new Promise(r => setTimeout(r, 100))
      }
    }
    const login = await request('/api/login', { username, password }, false)
    assert.equal(login.status, 200)
    cookie = login.headers.get('set-cookie').split(';')[0]
    await check('official 1.6.1 native plugin ZIP upload, approval and module/storage compatibility', async () => {
      const bytes = readFileSync(plugin)
      const init = await api('/api/admin/upload/init', { purpose: 'plugin', filename: 'plugin.zip', size: bytes.length })
      for (let offset = 0, index = 0; offset < bytes.length; offset += init.chunk_size, index++) {
        const form = new FormData()
        form.append('upload_id', init.upload_id)
        form.append('chunk_index', String(index))
        form.append('chunk_data', new Blob([bytes.subarray(offset, offset + init.chunk_size)]), 'chunk')
        const r = await fetch(`${origin}/api/admin/upload/chunk`, { method: 'POST', headers: { Cookie: cookie }, body: form })
        assert.equal(r.status, 200)
      }
      await api('/api/admin/upload/merge', { upload_id: init.upload_id })
      await rpc('admin:setPluginEnabled', { short: 'enhanced-route-probe', enabled: true, approved: true })
      const health = await raw('/health')
      assert.equal(health.status, 200)
      assert.equal(health.body.storage, 'healthy')
    })
    let client, config
    await check('native agent identity and administrator-only raw evidence; public disabled by default', async () => {
      const a = await api('/api/admin/client/add', { name: 'Synthetic route node' })
      const uuid = a.uuid ?? a.data?.uuid
      client = { ...a, uuid }
      assert(client?.token)
      assert.equal((await raw('/summary', undefined, false)).status, 403)
      assert.equal((await raw('/snapshot', undefined, false)).status, 403)
      assert.equal((await raw('/checkpoint', undefined, false)).status, 403)
      const registered = await raw('/register', { token: client.token, helper_version: '0.3.0+git.synthetic' }, false)
      assert.equal(registered.status, 200)
      config = { enabled: true, publicSummaryEnabled: true, nodes: JSON.stringify({ [client.uuid]: { enabled: true, city: 'shanghai', periodMinutes: 360 } }) }
      await rpc('admin:setPluginConfiguration', { short: 'enhanced-route-probe', data: config })
    })
    let evidence
    await check('native agent job/result flow and opt-in public ASN projection', async () => {
      const polled = await raw('/poll', { token: client.token, helper_version: '0.3.0+git.synthetic' }, false)
      assert.equal(polled.status, 200)
      const job = polled.body.job
      assert(job)
      const at = new Date().toISOString()
      evidence = { schema: 2, uuid: client.uuid, city: 'shanghai', source: 'helper', collectedAt: at, protocols: ['udp', 'tcp'], carriers: Object.fromEntries(['telecom', 'unicom', 'mobile'].map((c, i) => [c, Object.fromEntries(['udp', 'tcp'].map(p => [p, { protocol: p, family: 4, direction: 'node-to-cn', target: `shanghai-${c}`, collectedAt: at, status: 'ok', reachedTarget: true, hops: [{ ttl: 1, ips: ['8.8.8.8'], asns: [[4134], [4837], [58453]][i], asnSource: 'team-cymru' }, { ttl: 2, ips: ['1.1.1.1'], asns: [[4134], [4837], [58453]][i], asnSource: 'team-cymru' }], asnLookup: { enabled: true, queries: 0, cacheHits: 2, failures: 0 } }]))])) }
      for (const [i, c] of ['telecom', 'unicom', 'mobile'].entries()) {
        for (const row of Object.values(evidence.carriers[c]))
          row.hops[1].ips = [['202.96.209.133', '210.22.97.1', '211.136.112.200'][i]]
      }
      evidence = normalizeResult(evidence, client.uuid, 'shanghai', Date.now())
      const submitted = await raw('/result', { token: client.token, uuid: client.uuid, job_id: job.id, lease: job.lease, result: evidence }, false)
      assert.equal(submitted.status, 200)
      assert.equal(submitted.body.accepted, true)
      const pub = await raw('/summary', undefined, false)
      assert.equal(pub.status, 200)
      assert(pub.body.nodes[client.uuid])
      assert.doesNotMatch(JSON.stringify(pub.body), PRIVATE_FIELDS)
      assert.equal((await raw('/snapshot')).body.nodes[client.uuid].latest.carriers.telecom.tcp.hops[0].ips[0], '8.8.8.8')
    })
    await check('plugin configuration and route evidence survive actual backend restart', async () => {
      await stop()
      start()
      await ready()
      assert.deepEqual((await raw('/snapshot')).body.nodes[client.uuid].latest, evidence)
      assert.equal((await raw('/summary', undefined, false)).status, 200)
    })
    await check('public opt-out immediately removes access without deleting private evidence', async () => {
      await rpc('admin:setPluginConfiguration', { short: 'enhanced-route-probe', data: { ...config, publicSummaryEnabled: false } })
      assert.equal((await raw('/summary', undefined, false)).status, 403)
      assert.deepEqual((await raw('/snapshot')).body.nodes[client.uuid].latest, evidence)
    })
    writeFileSync(join(root, 'test-results/route-native.json'), `${JSON.stringify({ kind: 'official-1.6.1-isolated-native-plugin', routeData: 'synthetic; no network probing', checks }, null, 2)}\n`)
  }
  finally {
    await stop()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
