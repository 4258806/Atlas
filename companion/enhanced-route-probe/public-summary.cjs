'use strict'
// Explicit opt-in projection. Never return hop IPs, tokens, leases, helper
// identities, queued jobs, fixtures or replayed captures to public visitors.
function publicSummary(snapshot, now = Date.now()) {
  const nodes = {}
  for (const [uuid, node] of Object.entries(snapshot.nodes)) {
    const result = node.latest
    if (!node.enabled || result?.schema !== 2 || result.source !== 'helper')
      continue
    const age = now - Date.parse(result.collectedAt)
    if (!Number.isFinite(age) || age < -300000 || age >= 86400000)
      continue
    const carriers = {}
    for (const carrier of ['telecom', 'unicom', 'mobile']) {
      const rows = result.protocols.map(p => result.carriers[carrier][p])
      const first = rows[0]
      const signature = row => JSON.stringify([row.status, row.reachedTarget, row.hops.map(h => [h.ttl, h.asns])])
      const consistent = rows.every(row => signature(row) === signature(first))
      carriers[carrier] = {
        direction: 'node-to-cn',
        target: first.target,
        status: consistent ? first.status : 'unknown',
        reachedTarget: consistent && first.reachedTarget,
        hops: consistent ? first.hops.map(h => ({ ttl: h.ttl, asns: [...h.asns] })) : [],
      }
    }
    nodes[uuid] = { enabled: true, state: 'completed', latest: {
      schema: 1,
      uuid,
      city: result.city,
      source: 'helper',
      collectedAt: result.collectedAt,
      carriers,
    } }
  }
  return { schema: 1, nodes }
}
module.exports = { publicSummary }
