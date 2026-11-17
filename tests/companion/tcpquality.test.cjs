const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const test = require('node:test')
const { normalizeQuality, QualityCoordinator } = require('../../companion/enhanced-route-probe/tcpquality.cjs')
const { qualityFixture } = require('../fixtures/tcpquality.cjs')

const UUID = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'
const now = Date.now()
const policy = { enabled: true, nodes: { [UUID]: { enabled: true, city: 'shanghai', periodMinutes: 60, collector: 'tcpquality' } } }
test('native lease enforces one-hour starts, no overlap, replay safety and restart persistence', () => {
  let n = 0
  const c = new QualityCoordinator(() => (++n).toString(16).padStart(48, '0'))
  const first = c.poll(UUID, policy, '0.4.0', now).job
  assert(first)
  assert.equal(c.poll(UUID, policy, '0.4.0', now + 60000).job, null)
  const report = qualityFixture(UUID, new Date(now + 1000).toISOString())
  assert.throws(() => c.accept(UUID, report, policy, 'f'.repeat(48), now + 2000))
  assert.throws(() => c.accept(OTHER, qualityFixture(OTHER, report.collectedAt), policy, first.id, now + 2000))
  c.accept(UUID, report, policy, first.id, now + 2000)
  c.accept(UUID, report, policy, first.id, now + 3000)
  const restored = new QualityCoordinator(() => 'e'.repeat(48))
  restored.importState(JSON.parse(JSON.stringify(c.exportState())))
  assert.equal(restored.poll(UUID, policy, '0.4.0', now + 3599999).job, null)
  assert(restored.poll(UUID, policy, '0.4.0', now + 3600000).job)
  assert.throws(() => restored.accept(UUID, report, policy, first.id, now + 3601000))
  const publicView = restored.project({ schema: 1, nodes: {} }, policy)
  assert.equal(publicView.nodes[UUID].quality.variants.ipv4.carriers.mobile.groups[0].label, 'CN2GIA')
  assert(!/token|lease|acceptedId|expiresAt|startedAt/.test(JSON.stringify(publicView)))
  assert.deepEqual(restored.project({ schema: 1, nodes: {} }, { ...policy, enabled: false }).nodes, {})
})
test('reject forged identity, provenance, duplicate provinces, unsafe labels, invalid counts/statistics and extra fields', () => {
  const valid = qualityFixture(UUID, new Date(now).toISOString())
  assert.deepEqual(normalizeQuality(valid, UUID, now), valid)
  const bad = [
    r => r.uuid = OTHER,
    r => r.upstreamCommit = '0'.repeat(40),
    r => r.collectedAt = new Date(now + 600001).toISOString(),
    r => r.command = 'sh',
    r => r.variants.ipv4.carriers.telecom.groups[0].label = '<img src=x>',
    r => r.variants.ipv4.carriers.telecom.groups[0].label = '1.2.3.4',
    r => r.variants.ipv4.carriers.telecom.groups[0].provinces[0] = 1,
    r => r.variants.ipv4.carriers.telecom.total = 30,
    r => r.variants.ipv4.carriers.telecom.latencyMs = -1,
    r => r.variants.ipv4.carriers.telecom.retransmissionPercent = 101,
    r => r.variants.ipv6.carriers = r.variants.ipv4.carriers,
  ]
  for (const mutate of bad) {
    const r = structuredClone(valid)
    mutate(r)
    assert.throws(() => normalizeQuality(r, UUID, now))
  }
})
test('Python attachment parser preserves protocol differences and rejects out-of-scope output', () => {
  execFileSync(process.env.ATLAS_TEST_PYTHON || 'python3', ['tests/companion/test_tcpquality.py'], { cwd: path.resolve(__dirname, '../..'), stdio: 'pipe' })
})
