import type { ResetSchedule } from '@/utils/resetSchedule'
import { schedulePeriod, validSchedule, validTimeZone } from '@/utils/resetSchedule'

export const TRAFFIC_TIME_ZONE = 'Asia/Shanghai'
export const TRAFFIC_CONFIG_KEY = 'trafficCycleConfig'
export const TRAFFIC_METRICS = ['traffic.up', 'traffic.down', 'net.total.up', 'net.total.down'] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HOUR = 3600000
// Same reset-aware plausibility bound as Komari 1.6.0, per original sample,
// NOT per rollup bucket. Never clamp a real aggregate to a small quota.
const MAX_SAMPLE_BYTES = 64 * 1024 ** 3

export interface TrafficCycleConfig { version: 2, timeZone?: string, nodes: Record<string, ResetSchedule>, [key: string]: unknown }
export interface TrafficPeriod { start: number, end: number }
export type TrafficCycleStatus = 'loading' | 'ready' | 'partial' | 'insufficient' | 'unsupported' | 'error'
export interface TrafficCycleSnapshot {
  status: TrafficCycleStatus
  period: TrafficPeriod
  asOf: number
  up: number | null
  down: number | null
  reason: string
  /** Earliest returned increment, not a claim of continuous coverage. */
  observedFrom?: number
}
interface Point { time: number, value: number, count: number }

export function isNodeUUID(value: string): boolean {
  return UUID.test(value)
}
export function validResetDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31
}
export function parseTrafficCycleConfig(raw: unknown): { document: TrafficCycleConfig, error: string | null } {
  const empty: TrafficCycleConfig = { version: 2, nodes: {} }
  if (raw === undefined || raw === null || raw === '')
    return { document: empty, error: null }
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![1, 2].includes(value.version) || !value.nodes || typeof value.nodes !== 'object' || Array.isArray(value.nodes) || Object.keys(value.nodes).length > 5000 || (value.version === 1 && !validTimeZone(value.timeZone)))
      throw new Error('schema')
    const document = structuredClone(value) as TrafficCycleConfig
    for (const [uuid, node] of Object.entries(value.nodes)) {
      const row = node as Record<string, unknown>
      if (!UUID.test(uuid) || !row || Array.isArray(row) || !validResetDay(row.resetDay))
        throw new Error('node')
      const migrated = value.version === 1
        ? { ...row, timeZone: row.timeZone ?? value.timeZone, hour: row.hour ?? 0, minute: row.minute ?? 0 }
        : row
      if (!validSchedule(migrated))
        throw new Error('schedule')
      document.nodes[uuid] = migrated
    }
    document.version = 2
    return { document, error: null }
  }
  catch {
    return { document: empty, error: '流量周期配置无效；不会按月初重置或覆盖原配置' }
  }
}
export function changeTrafficReset(raw: unknown, uuid: string, resetDay: number | ResetSchedule | null): string {
  const parsed = parseTrafficCycleConfig(raw)
  const schedule = typeof resetDay === 'number'
    ? { ...parsed.document.nodes[uuid], resetDay, timeZone: parsed.document.nodes[uuid]?.timeZone ?? TRAFFIC_TIME_ZONE, hour: parsed.document.nodes[uuid]?.hour ?? 0, minute: parsed.document.nodes[uuid]?.minute ?? 0 }
    : resetDay
  if (parsed.error || !UUID.test(uuid) || (schedule !== null && !validSchedule(schedule)))
    throw new Error('无效的 UUID、重置日或已有周期配置；未写入')
  if (resetDay === null)
    delete parsed.document.nodes[uuid]
  else
    parsed.document.nodes[uuid] = { ...parsed.document.nodes[uuid], ...schedule! }
  const serialized = JSON.stringify(parsed.document)
  if (parseTrafficCycleConfig(serialized).error)
    throw new Error('流量周期配置超过支持范围；未写入')
  return serialized
}
/** Numeric legacy calls keep the original Shanghai-midnight meaning. */
export function trafficPeriod(resetDay: number | ResetSchedule, now = Date.now()): TrafficPeriod {
  return schedulePeriod(typeof resetDay === 'number' ? { resetDay, timeZone: TRAFFIC_TIME_ZONE, hour: 0, minute: 0 } : resetDay, now)
}
export function trafficByMode(up: number, down: number, mode: string | undefined): number {
  switch (mode) {
    case 'up': return up
    case 'down': return down
    case 'min': return Math.min(up, down)
    case 'max': return Math.max(up, down)
    default: return up + down
  }
}
export function trafficSnapshot(status: TrafficCycleStatus, period: TrafficPeriod, asOf: number, reason: string): TrafficCycleSnapshot {
  return { status, period, asOf, up: null, down: null, reason }
}

/** Keep recent unsealed buckets at minute precision and closed history below the hour tier. */
export function trafficQueryRanges(period: TrafficPeriod, asOf: number): Array<{ start: number, end: number, maxPoints: number }> {
  const split = Math.ceil(period.start / HOUR) * HOUR
  const edges: number[][] = []
  let cursor = period.start
  if (split > cursor && split < asOf) {
    edges.push([cursor, split, 60000])
    cursor = split
  }
  // Komari selects a materialized backing tier. A newly extended retention
  // policy need not have any hour rows yet. Half-hour output uses the durable
  // five-minute tier; the two-hour tail also avoids its ten-minute seal grace.
  const closed = Math.floor((asOf - 2 * HOUR) / HOUR) * HOUR
  if (closed > cursor) {
    edges.push([cursor, closed, HOUR / 2])
    cursor = closed
  }
  edges.push([cursor, asOf, 60000])
  return edges.map(([start, end, width]) => ({ start: start!, end: end!, maxPoints: Math.max(1, Math.ceil((end! - start! + HOUR) / width!)) }))
}

export function combineTrafficSnapshots(snapshots: TrafficCycleSnapshot[], period: TrafficPeriod, asOf: number): TrafficCycleSnapshot {
  if (!snapshots.length)
    return trafficSnapshot('insufficient', period, asOf, '缺少可靠的周期分段历史')
  let cursor = period.start
  let up = 0
  let down = 0
  let observed = 0
  let partial = false
  let observedFrom = Number.POSITIVE_INFINITY
  for (const part of snapshots) {
    if (part.period.start !== cursor || part.asOf !== part.period.end)
      return trafficSnapshot('insufficient', period, asOf, '周期分段存在缺口或重叠')
    if ((part.status === 'ready' || part.status === 'partial') && part.up !== null && part.down !== null) {
      if (!Number.isSafeInteger(part.up) || !Number.isSafeInteger(part.down) || part.up < 0 || part.down < 0)
        return trafficSnapshot('insufficient', period, asOf, '周期分段包含无效增量')
      up += part.up
      down += part.down
      observed++
      observedFrom = Math.min(observedFrom, part.observedFrom ?? part.period.start)
    }
    partial ||= part.status !== 'ready'
    cursor = part.asOf
  }
  if (cursor !== asOf || !Number.isSafeInteger(up + down))
    return trafficSnapshot('insufficient', period, asOf, '周期分段不完整或超出安全精度')
  if (!observed)
    return trafficSnapshot('insufficient', period, asOf, snapshots[0]!.reason)
  return { status: partial ? 'partial' : 'ready', period, asOf, up, down, observedFrom, reason: partial ? `周期历史不完整；仅显示自 ${new Date(observedFrom).toISOString()} 起已记录的原生增量，缺失时段及剩余额度未知` : '原生增量：重置边缘、闭合历史与近期分钟分段求和' }
}
/**
 * Only native, summable, reset-aware deltas. Counter snapshots prove coverage;
 * subtracting counter endpoints or silently treating missing history as zero
 * would lose resets and is deliberately forbidden here.
 */
export function resolveTrafficMetrics(raw: unknown, uuid: string, period: TrafficPeriod, asOf: number): TrafficCycleSnapshot {
  const missing = (reason: string) => trafficSnapshot('insufficient', period, asOf, reason)
  try {
    if (!isNodeUUID(uuid) || !Number.isFinite(asOf) || asOf < period.start || asOf > period.end)
      return missing('计费区间无效')
    const data = raw as { series?: unknown[], start?: string, end?: string }
    if (!data || !Array.isArray(data.series) || data.series.length > 16)
      return missing('流量历史协议不兼容')
    const points = new Map<string, Point[]>()
    let interval = 1000
    for (const metric of data.series) {
      const row = metric as { metric_key: string, entity_id: string, points: Array<{ time: string, value: unknown, count?: number }> | null, count?: number, downsampled?: boolean, downsample_algorithm?: string, interval_seconds?: number }
      const empty = row.points === null && row.count === 0
      if (row.entity_id !== uuid || !TRAFFIC_METRICS.includes(row.metric_key as typeof TRAFFIC_METRICS[number]) || points.has(row.metric_key) || (!Array.isArray(row.points) && !empty) || (row.points?.length ?? 0) > 200000)
        return missing('历史节点身份或指标不一致')
      const step = row.downsampled ? Number(row.interval_seconds) * 1000 : 1000
      if (!Number.isFinite(step) || step <= 0 || step > HOUR || HOUR % step !== 0)
        return missing('历史聚合精度不足以按重置边界计费')
      if (row.downsampled && period.start % step !== 0)
        return missing('历史聚合跨越重置分钟；需要覆盖该边界的更细原生增量')
      if (row.downsampled && row.downsample_algorithm !== (row.metric_key.startsWith('traffic.') ? 'sum' : 'last'))
        return missing('流量历史没有使用可求和的原生增量')
      interval = Math.max(interval, step)
      const seen = new Set<number>()
      const normalized: Point[] = []
      for (const point of row.points ?? []) {
        const time = Date.parse(point.time)
        const count = point.count ?? 1
        if (!Number.isFinite(time) || typeof point.value !== 'number' || !Number.isSafeInteger(point.value) || point.value < 0 || !Number.isSafeInteger(count) || count < 1 || seen.has(time))
          return missing('历史包含缺失、重复或异常流量样本')
        if (row.metric_key.startsWith('traffic.') && point.value / count > MAX_SAMPLE_BYTES)
          return missing('历史流量增量异常，未计入配额')
        seen.add(time)
        normalized.push({ time, value: point.value, count })
      }
      points.set(row.metric_key, normalized.sort((a, b) => a.time - b.time))
    }
    if (points.size !== TRAFFIC_METRICS.length)
      return missing('缺少可靠的上传、下载或周期起点历史')
    const baseline = ['net.total.up', 'net.total.down'].every(key => points.get(key)!.some(p => p.time <= period.start && p.time >= period.start - HOUR))
    if (asOf === period.start)
      return baseline ? { status: 'ready', period, asOf, up: 0, down: 0, reason: '有可靠起点的新周期空区间' } : missing('周期起点缺少可靠历史；未假设起点为零')
    const totals: number[] = []
    let complete = baseline
    let observedFrom = Number.POSITIVE_INFINITY
    for (const key of ['traffic.up', 'traffic.down']) {
      const records = points.get(key)!.filter(p => p.time >= period.start && p.time < asOf)
      if (!records.length)
        return missing('当前周期没有已记录的上传或下载增量')
      observedFrom = Math.min(observedFrom, records[0]!.time)
      if (records[0]!.time > period.start + HOUR || asOf - records.at(-1)!.time > interval + 90000)
        complete = false
      if (records.some((point, index) => index > 0 && point.time - records[index - 1]!.time > HOUR + 90000))
        complete = false
      const sum = records.reduce((value, p) => value + p.value, 0)
      if (!Number.isSafeInteger(sum))
        return missing('累计增量超出安全精度')
      totals.push(sum)
    }
    if (!Number.isSafeInteger(totals[0]! + totals[1]!))
      return missing('累计增量超出安全精度')
    return { status: complete ? 'ready' : 'partial', period, asOf, up: totals[0]!, down: totals[1]!, observedFrom, reason: complete ? 'Komari 原生流量增量（保留重启/回绕处理）' : '周期起点、内部或近期历史不完整；仅显示已记录的原生增量，不计算完整周期配额' }
  }
  catch {
    return missing('流量历史无效；未更改累计计数器')
  }
}
