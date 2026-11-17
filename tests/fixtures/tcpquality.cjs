'use strict'
// Synthetic only. Never submit this fixture to a production node.
function qualityFixture(uuid = '00000000-0000-4000-8000-000000000001', at = '2026-07-25T11:00:00.000Z') {
  const row = () => ({ total: 31, groups: [{ label: 'CN2GIA', provinces: Array.from({ length: 31 }, (_, i) => i) }], latencyMs: 160, retransmissionPercent: 0 })
  const measured = () => ({ status: 'measured', carriers: Object.fromEntries(['telecom', 'unicom', 'mobile'].map(c => [c, row()])) })
  const report = { schema: 1, uuid, source: 'TcpQuality', scope: 'three-carrier', collectedAt: at, upstreamCommit: 'db52fc60523320fc4a34b5c369f28be38df21d13', collectorVersion: '0.4.0', reportHash: 'a'.repeat(64), variants: { ipv4: measured(), ipv6: { status: 'unavailable', carriers: {} }, udp4: measured(), udp6: { status: 'unavailable', carriers: {} }, large4: measured() } }
  report.variants.large4.carriers.unicom.groups = [{ label: 'CN2GIA', provinces: Array.from({ length: 30 }, (_, i) => i) }, { label: '163->4837', provinces: [30] }]
  return report
}
module.exports = { qualityFixture }
