import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { parseProbeSnapshot } from '../../src/utils/routeProbeSnapshot'
import { parseTcpQuality, QUALITY_PROVINCES, qualityAge, qualityGrade, qualityRoute } from '../../src/utils/tcpQuality'

const { qualityFixture } = createRequire(import.meta.url)('../fixtures/tcpquality.cjs')
const UUID = '00000000-0000-4000-8000-000000000001'
const AT = '2026-07-25T11:00:00.000Z'
test('reported CN2GIA remains distinct from mixed large packets and unavailable IPv6', () => {
  const report = parseTcpQuality(qualityFixture(UUID, AT), UUID)
  expect(QUALITY_PROVINCES).toHaveLength(31)
  expect(QUALITY_PROVINCES[29]).toBe('上海')
  const normal = qualityRoute(report, 'unicom', 'ipv4', 24, Date.parse(AT))
  expect(normal.label).toBe('CN2GIA')
  expect(qualityGrade(normal)).toEqual({ label: '精品', tone: 'premium' })
  const large = qualityRoute(report, 'unicom', 'large4', 24, Date.parse(AT))
  expect(large.status).toBe('unknown')
  expect(large.detail).toContain('163->4837 1/31')
  expect(qualityGrade(large).label).toBe('混合')
  expect(qualityRoute(report, 'telecom', 'ipv6', 24, Date.parse(AT)).label).toBe('不可用')
  expect(qualityRoute(report, 'mobile', 'ipv4', 24, Date.parse(AT) + 86400000).status).toBe('expired')
  expect(qualityAge(AT, Date.parse(AT) + 3600000)).toBe('1小时前')
})
test('new snapshot data cannot publish unsafe labels or other-node reports', () => {
  const report = qualityFixture(UUID, AT)
  expect(parseProbeSnapshot({ schema: 1, nodes: { [UUID]: { enabled: true, state: 'completed', latest: null, quality: report } } }).nodes[UUID]?.quality?.source).toBe('TcpQuality')
  for (const label of ['<svg onload=1>', '1.2.3.4', 'https://example.com']) {
    const bad = structuredClone(report)
    bad.variants.ipv4.carriers.telecom.groups[0].label = label
    expect(() => parseTcpQuality(bad, UUID)).toThrow()
  }
  expect(() => parseTcpQuality(report, '00000000-0000-4000-8000-000000000002')).toThrow()
})
