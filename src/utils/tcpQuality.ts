import type { ReturnCarrier } from './returnRouteClassification'
import type { ReturnRouteDisplay } from './returnRoutes'

export const TCPQUALITY_COMMIT = 'db52fc60523320fc4a34b5c369f28be38df21d13'
const QUALITY_VERSION = /^0\.4\.[01](?:\+git\.[0-9a-f]{7,40})?$/
const QUALITY_HASH = /^[a-f0-9]{64}$/
const QUALITY_TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/
const QUALITY_LABEL = /^[A-Z0-9][\w .+>/-]{0,47}$/i
const PREMIUM = /^(?:CN2GIA|CTGGIA|9929|CMIN2)$/
const OPTIMIZED = /^(?:CN2GT|CMI|10099)$/
const ORDINARY = /^(?:163|4837|CMNET)$/
const IP_TEXT = /(?:\d{1,3}\.){3}\d{1,3}/
export const QUALITY_VARIANTS = ['ipv4', 'ipv6', 'udp4', 'udp6', 'large4'] as const
export type QualityVariant = typeof QUALITY_VARIANTS[number]
export const QUALITY_VARIANT_NAMES: Record<QualityVariant, string> = { ipv4: 'IPv4', ipv6: 'IPv6', udp4: 'UDP IPv4', udp6: 'UDP IPv6', large4: 'IPv4 大包' }
export const QUALITY_PROVINCES = ['河北', '山西', '辽宁', '吉林', '黑龙江', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '海南', '四川', '贵州', '云南', '陕西', '甘肃', '青海', '内蒙古', '广西', '西藏', '宁夏', '新疆', '北京', '天津', '上海', '重庆']
export interface QualityCarrier { total: number, groups: { label: string, provinces: number[] }[], latencyMs: number | null, retransmissionPercent: number | null }
export interface QualitySection { status: 'measured' | 'unavailable' | 'failed', carriers: Partial<Record<ReturnCarrier, QualityCarrier>> }
export interface TcpQualityReport { schema: 1, uuid: string, source: 'TcpQuality', scope: 'three-carrier', collectedAt: string, upstreamCommit: string, collectorVersion: string, reportHash: string, variants: Record<QualityVariant, QualitySection> }
function requireQuality(value: unknown): asserts value {
  if (!value)
    throw new Error('invalid TcpQuality observation')
}
function fields(value: unknown, allowed: string[]): asserts value is Record<string, unknown> {
  requireQuality(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => allowed.includes(k)))
}
export function parseTcpQuality(input: unknown, uuid: string): TcpQualityReport {
  fields(input, ['schema', 'uuid', 'source', 'scope', 'collectedAt', 'upstreamCommit', 'collectorVersion', 'reportHash', 'variants'])
  requireQuality(input.schema === 1 && input.uuid === uuid && input.source === 'TcpQuality' && input.scope === 'three-carrier' && input.upstreamCommit === TCPQUALITY_COMMIT)
  requireQuality(typeof input.collectorVersion === 'string' && QUALITY_VERSION.test(input.collectorVersion))
  requireQuality(typeof input.reportHash === 'string' && QUALITY_HASH.test(input.reportHash))
  requireQuality(typeof input.collectedAt === 'string' && QUALITY_TIME.test(input.collectedAt) && Number.isFinite(Date.parse(input.collectedAt)) && new Date(input.collectedAt).toISOString() === input.collectedAt)
  fields(input.variants, [...QUALITY_VARIANTS])
  requireQuality(Object.keys(input.variants).length === 5)
  for (const variant of QUALITY_VARIANTS) {
    const section = input.variants[variant]
    fields(section, ['status', 'carriers'])
    requireQuality(['measured', 'unavailable', 'failed'].includes(String(section.status)))
    fields(section.carriers, ['telecom', 'unicom', 'mobile'])
    if (section.status !== 'measured') {
      requireQuality(Object.keys(section.carriers).length === 0)
      continue
    }
    requireQuality(Object.keys(section.carriers).length === 3)
    let observations = 0
    for (const row of Object.values(section.carriers)) {
      fields(row, ['total', 'groups', 'latencyMs', 'retransmissionPercent'])
      requireQuality(typeof row.total === 'number' && Number.isInteger(row.total) && row.total >= 0 && row.total <= 31 && Array.isArray(row.groups) && row.groups.length <= 31)
      for (const [key, max] of [['latencyMs', 120000], ['retransmissionPercent', 100]] as const)
        requireQuality(row[key] === null || (typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= max))
      const seen = new Set<number>()
      const labels = new Set<string>()
      for (const group of row.groups) {
        fields(group, ['label', 'provinces'])
        requireQuality(typeof group.label === 'string' && QUALITY_LABEL.test(group.label) && !IP_TEXT.test(group.label) && !labels.has(group.label))
        labels.add(group.label)
        requireQuality(Array.isArray(group.provinces) && group.provinces.length > 0 && group.provinces.length <= 31)
        for (const p of group.provinces) {
          requireQuality(typeof p === 'number' && Number.isInteger(p) && p >= 0 && p < 31 && !seen.has(p))
          seen.add(p)
        }
      }
      requireQuality(seen.size === row.total)
      observations += row.total
    }
    requireQuality(observations > 0)
  }
  requireQuality(JSON.stringify(input).length <= 14500)
  return input as unknown as TcpQualityReport
}
export function qualityRoute(report: TcpQualityReport, carrier: ReturnCarrier, variant: QualityVariant, ttlHours: number, now: number): ReturnRouteDisplay {
  const section = report.variants[variant]
  const row = section.carriers[carrier]
  const base = { carrier, source: 'auto' as const, at: report.collectedAt }
  if (Date.parse(report.collectedAt) > now + 300000)
    return { ...base, label: '时间异常', status: 'unknown', detail: '采集时间晚于当前时间' }
  if (now - Date.parse(report.collectedAt) >= ttlHours * 3600000)
    return { ...base, label: '已过期', status: 'expired', detail: '旧结果保留，等待再次采集' }
  if (section.status === 'unavailable')
    return { ...base, label: '不可用', status: 'not-detected', detail: `${QUALITY_VARIANT_NAMES[variant]} 没有可用连接` }
  if (section.status === 'failed' || !row?.total)
    return { ...base, label: '未测', status: 'not-detected', detail: '没有本运营商的有效采样' }
  const groups = [...row.groups].sort((a, b) => b.provinces.length - a.provinces.length || a.label.localeCompare(b.label))
  const known = groups.filter(g => !['Hidden', 'failed', 'SKIP', 'FAIL'].includes(g.label))
  const first = known[0]
  if (!first)
    return { ...base, label: '未识别线路', status: 'unknown', detail: `${row.total} 个省份均未识别线路` }
  const mixed = groups.length > 1
  return { ...base, label: first.label, status: mixed ? 'unknown' : 'fresh-auto', detail: `TcpQuality · ${QUALITY_VARIANT_NAMES[variant]} · ${mixed ? '存在混合线路；' : ''}${groups.map(g => `${g.label} ${g.provinces.length}/${row.total}`).join('；')}；采集器识别结果，非运营商认证` }
}
export function qualityGrade(entry: ReturnRouteDisplay): { label: string, tone: 'premium' | 'optimized' | 'ordinary' | 'unknown' } {
  if (entry.status === 'expired')
    return { label: '过期', tone: 'unknown' }
  if (entry.status === 'unknown')
    return { label: entry.detail.includes('混合') ? '混合' : '待核', tone: 'unknown' }
  if (!['fresh-auto', 'manual'].includes(entry.status))
    return { label: '未测', tone: 'unknown' }
  if (PREMIUM.test(entry.label))
    return { label: '精品', tone: 'premium' }
  if (OPTIMIZED.test(entry.label))
    return { label: '优化', tone: 'optimized' }
  if (ORDINARY.test(entry.label))
    return { label: '普通', tone: 'ordinary' }
  return { label: '观测', tone: 'unknown' }
}
export function qualityAge(at: string | null, now: number): string {
  if (!at)
    return '未测'
  const seconds = Math.max(0, Math.floor((now - Date.parse(at)) / 1000))
  if (!Number.isFinite(seconds))
    return '未测'
  if (seconds < 60)
    return '刚刚'
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}分钟前`
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}小时前`
  return `${Math.floor(seconds / 86400)}天前`
}
