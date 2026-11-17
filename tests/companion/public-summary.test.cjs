const assert = require('node:assert/strict')
const { test } = require('node:test')
const { policy } = require('../../companion/enhanced-route-probe/protocol.cjs')
const { publicSummary } = require('../../companion/enhanced-route-probe/public-summary.cjs')

const id = '00000000-0000-4000-8000-000000000001'
const now = Date.parse('2026-11-17T00:00:00Z')
function snapshot(source = 'helper', age = 0) {
  const at = new Date(now - age).toISOString()
  return { schema: 1, nodes: { [id]: { enabled: true, seenAt: now, helperVersion: 'private', job: { lease: 'secret' }, latest: {
    schema: 2,
    uuid: id,
    city: 'shanghai',
    source,
    collectedAt: at,
    protocols: ['tcp', 'udp'],
    carriers: Object.fromEntries(['telecom', 'unicom', 'mobile'].map(c => [c, Object.fromEntries(['tcp', 'udp'].map(p => [p, { protocol: p, target: `shanghai-${c}`, collectedAt: at, status: 'ok', reachedTarget: true, hops: [{ ttl: 1, ips: ['8.8.8.8'], asns: [4134], asnSource: 'team-cymru', prefixHints: ['163'] }], asnLookup: { enabled: true, queries: 1, cacheHits: 0, failures: 0 } }]))])),
  } } } }
}
test('public projection strips IPs, jobs, helper metadata and prefix hints without mutating raw evidence', () => {
  const raw = snapshot()
  const before = JSON.stringify(raw)
  const result = publicSummary(raw, now)
  assert.equal(Object.keys(result.nodes).length, 1)
  assert.deepEqual(result.nodes[id].latest.carriers.telecom.hops, [{ ttl: 1, asns: [4134] }])
  assert.doesNotMatch(JSON.stringify(result), /8\.8\.8\.8|secret|private|prefixHints|seenAt|lease/)
  assert.equal(JSON.stringify(raw), before)
})
test('public summary excludes disabled, expired, future, fixture and replay results', () => {
  for (const source of ['fixture', 'replay']) assert.deepEqual(publicSummary(snapshot(source), now).nodes, {})
  for (const age of [86400000, -300001]) assert.deepEqual(publicSummary(snapshot('helper', age), now).nodes, {})
  const raw = snapshot()
  raw.nodes[id].enabled = false
  assert.deepEqual(publicSummary(raw, now).nodes, {})
})
test('public summaries require a boolean opt-in; existing policy shape remains compatible', () => {
  assert.deepEqual(policy({}), { enabled: false, nodes: {} })
  assert.equal(policy({ publicSummaryEnabled: true }).publicSummaryEnabled, true)
  assert.throws(() => policy({ publicSummaryEnabled: 'true' }))
})

test('disagreeing protocols retain only the TCP observation and mark it uncertain', () => {
  const raw = snapshot()
  raw.nodes[id].latest.carriers.telecom.udp.hops[0].asns = [4809]
  const row = publicSummary(raw, now).nodes[id].latest.carriers.telecom
  assert.equal(row.status, 'unknown')
  assert.deepEqual(row.hops, [{ ttl: 1, asns: [4134] }])
  assert.doesNotMatch(JSON.stringify(row), /4809/)
})
