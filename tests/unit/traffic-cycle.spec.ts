import { expect, test } from '@playwright/test'
import { formatScheduleTime, schedulePeriod, validSchedule, validTimeZone } from '../../src/utils/resetSchedule'
import { compactReturnRoute, premiumManualRoute, returnRouteTime } from '../../src/utils/returnRouteDisplay'
import { ENHANCED_SETTINGS_GROUPS, settingGroup, THEME_FIELDS } from '../../src/utils/themeSettings'
import { trafficAccounting } from '../../src/utils/trafficAccounting'
import { changeTrafficReset, combineTrafficSnapshots, parseTrafficCycleConfig, resolveTrafficMetrics, TRAFFIC_METRICS, trafficByMode, trafficPeriod, trafficQueryRanges } from '../../src/utils/trafficCycle'

const A = '00000000-0000-4000-8000-000000000001'
const B = '00000000-0000-4000-8000-000000000002'
const at = (value: string) => Date.parse(value)
const iso = (value: number) => new Date(value).toISOString()
for (const day of [1, 5, 18, 28, 29, 30, 31]) {
  const date = `2026-10-${String(day).padStart(2, '0')}T00:00:00+08:00`
  const boundary = at(date)
  for (const [offset, side] of [[-1000, 'before'], [0, 'exact'], [1000, 'after']] as const) {
    test(`Shanghai reset ${day}, ${side}: half-open, non-drifting calendar cycle`, () => {
      const p = trafficPeriod(day, boundary + offset)
      expect(p.start).toBeLessThanOrEqual(boundary + offset)
      expect(p.end).toBeGreaterThan(boundary + offset)
      expect(side === 'before' ? p.end : p.start).toBe(boundary)
      expect(iso(p.start).slice(11)).toBe('16:00:00.000Z')
      expect(iso(p.end).slice(11)).toBe('16:00:00.000Z')
    })
  }
}
for (const row of [
  [31, '2026-02-28T00:00:00+08:00', '2026-02-28T00:00:00+08:00', '2026-03-31T00:00:00+08:00'],
  [31, '2024-02-29T00:00:00+08:00', '2024-02-29T00:00:00+08:00', '2024-03-31T00:00:00+08:00'],
  [31, '2024-02-28T23:59:59+08:00', '2024-01-31T00:00:00+08:00', '2024-02-29T00:00:00+08:00'],
  [30, '2026-02-28T00:00:00+08:00', '2026-02-28T00:00:00+08:00', '2026-03-30T00:00:00+08:00'],
  [29, '2026-02-28T00:00:00+08:00', '2026-02-28T00:00:00+08:00', '2026-03-29T00:00:00+08:00'],
  [31, '2026-04-30T00:00:00+08:00', '2026-04-30T00:00:00+08:00', '2026-05-31T00:00:00+08:00'],
  [31, '2026-12-31T00:00:00+08:00', '2026-12-31T00:00:00+08:00', '2027-01-31T00:00:00+08:00'],
  [1, '2027-01-01T00:00:00+08:00', '2027-01-01T00:00:00+08:00', '2027-02-01T00:00:00+08:00'],
] as const) {
  test(`short month/leap/cross-year ${row[0]} ${row[1]}`, () => {
    expect(trafficPeriod(row[0], at(row[1]))).toEqual({ start: at(row[2]), end: at(row[3]) })
  })
}
test('A reaches reset while B keeps exactly its own interval; modifying A never modifies B', () => {
  const boundary = at('2026-11-18T00:00:00+08:00')
  expect(trafficPeriod(18, boundary - 1000)).not.toEqual(trafficPeriod(18, boundary))
  expect(trafficPeriod(5, boundary - 1000)).toEqual(trafficPeriod(5, boundary))
  const before = changeTrafficReset(changeTrafficReset(undefined, A, 18), B, 5)
  const b = parseTrafficCycleConfig(before).document.nodes[B]
  const changed = changeTrafficReset(before, A, 31)
  expect(parseTrafficCycleConfig(changed).document.nodes[B]).toEqual(b)
  expect(parseTrafficCycleConfig(before).document.nodes[A]?.resetDay).toBe(18)
})
test('unset is truly unset, with no monthly-1 default, tag or name binding', () => {
  expect(parseTrafficCycleConfig(undefined).document.nodes).toEqual({})
  const raw = changeTrafficReset(undefined, A, 25)
  expect(parseTrafficCycleConfig(raw).document.nodes[A]?.resetDay).toBe(25)
  expect(JSON.parse(raw)).not.toHaveProperty('name')
  expect(parseTrafficCycleConfig(changeTrafficReset(raw, A, null)).document.nodes).toEqual({})
})
for (const invalid of [0, 32, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`reject invalid reset ${invalid}`, () => {
    expect(() => trafficPeriod(invalid)).toThrow()
    expect(() => changeTrafficReset(undefined, A, invalid)).toThrow()
  })
}
test('corrupt or unsupported historical config cannot be overwritten as an empty map', () => {
  for (const raw of ['{bad', { version: 1, timeZone: 'Not/AZone', nodes: {} }, { version: 1, timeZone: 'Asia/Shanghai', nodes: { Wendy: { resetDay: 5 } } }]) {
    expect(parseTrafficCycleConfig(raw).error).not.toBeNull()
    expect(() => changeTrafficReset(raw, A, 5)).toThrow()
  }
})

for (const [zone, day, hour, minute, instant] of [
  ['Asia/Shanghai', 8, 23, 10, '2026-12-08T15:10:00Z'],
  ['UTC', 1, 0, 0, '2026-12-01T00:00:00Z'],
  ['America/Los_Angeles', 1, 0, 0, '2026-07-01T07:00:00Z'],
  ['America/Los_Angeles', 1, 0, 0, '2026-12-01T08:00:00Z'],
  ['America/New_York', 1, 0, 0, '2026-12-01T05:00:00Z'],
  ['America/Los_Angeles', 8, 2, 30, '2026-03-08T10:30:00Z'],
  ['America/Los_Angeles', 1, 1, 30, '2026-11-01T08:30:00Z'],
  ['Europe/Berlin', 29, 2, 30, '2026-03-29T01:30:00Z'],
  ['Australia/Lord_Howe', 4, 2, 15, '2026-10-03T15:45:00Z'],
  ['Pacific/Apia', 30, 0, 0, '2011-12-30T10:00:00Z'],
  ['Asia/Kathmandu', 1, 0, 0, '2026-11-30T18:15:00Z'],
  ['+08:00', 8, 23, 10, '2026-12-08T15:10:00Z'],
] as const) {
  test(`independent boundary ${zone} ${instant}`, () => {
    const schedule = { resetDay: day, timeZone: zone, hour, minute }
    const timestamp = at(instant)
    expect(schedulePeriod(schedule, timestamp - 1).end).toBe(timestamp)
    expect(schedulePeriod(schedule, timestamp).start).toBe(timestamp)
    expect(schedulePeriod(schedule, timestamp + 1).start).toBe(timestamp)
  })
}

test('all runtime IANA zones accept independent minute schedules', () => {
  const zones = Intl.supportedValuesOf('timeZone')
  expect(zones.length).toBeGreaterThan(300)
  const now = at('2026-12-08T15:10:00Z')
  for (const timeZone of zones) {
    const period = schedulePeriod({ resetDay: 8, timeZone, hour: 23, minute: 10 }, now)
    expect(period.start, timeZone).toBeLessThanOrEqual(now)
    expect(period.end, timeZone).toBeGreaterThan(now)
    expect(period.end - period.start, timeZone).toBeGreaterThan(27 * 86400000)
  }
})

test('v1 migration preserves timezone patches, hidden seconds and other nodes', () => {
  const legacy = { version: 1, timeZone: 'UTC', future: { preserved: true }, nodes: {
    [A]: { resetDay: 1 },
    [B]: { resetDay: 8, timeZone: 'Asia/Shanghai', hour: 23, minute: 10, second: 17, future: 'preserved' },
  } }
  const before = JSON.stringify(legacy)
  const migrated = parseTrafficCycleConfig(legacy)
  expect(migrated.error).toBeNull()
  expect(migrated.document.nodes[A]).toMatchObject({ resetDay: 1, timeZone: 'UTC', hour: 0, minute: 0 })
  const updated = parseTrafficCycleConfig(changeTrafficReset(legacy, A, { resetDay: 5, timeZone: 'America/Los_Angeles', hour: 12, minute: 34 }))
  expect(updated.document.nodes[B]).toEqual(legacy.nodes[B])
  expect(updated.document.future).toEqual(legacy.future)
  expect(JSON.stringify(legacy)).toBe(before)
  const changedDay = parseTrafficCycleConfig(changeTrafficReset(legacy, B, 9)).document.nodes[B]!
  expect(changedDay.second).toBe(17)
  expect(formatScheduleTime(schedulePeriod(changedDay, at('2026-12-10T00:00:00Z')).start, changedDay.timeZone)).toBe('2026-12-09 23:10 Asia/Shanghai (UTC+08:00)')
})

test('month end is clamped without drifting the retained requested day or local minute', () => {
  const schedule = { resetDay: 31, timeZone: 'America/Los_Angeles', hour: 23, minute: 10 }
  expect(schedulePeriod(schedule, at('2026-02-28T23:10:00-08:00'))).toEqual({ start: at('2026-02-28T23:10:00-08:00'), end: at('2026-03-31T23:10:00-07:00') })
  expect(schedule.resetDay).toBe(31)
})

test('invalid zones and local times fail closed', () => {
  const schedule = { resetDay: 8, timeZone: 'UTC', hour: 23, minute: 10 }
  for (const timeZone of ['', 'Not/AZone', '+25:00', ' UTC', 'UTC+8']) {
    expect(validTimeZone(timeZone)).toBe(false)
    expect(() => schedulePeriod({ ...schedule, timeZone })).toThrow()
  }
  for (const patch of [{ hour: 24 }, { minute: 60 }, { minute: 1.5 }, { second: 60 }])
    expect(validSchedule({ ...schedule, ...patch })).toBe(false)
  expect(parseTrafficCycleConfig({ version: 3, nodes: {} }).error).not.toBeNull()
})
const now = at('2026-11-18T00:01:00+08:00')
const period = trafficPeriod(18, now)
function metrics(uuid = A, withBaseline = true) {
  return { series: TRAFFIC_METRICS.map(key => ({
    metric_key: key,
    entity_id: uuid,
    downsampled: false,
    points: key.startsWith('net.total.')
      ? [{ time: iso(withBaseline ? period.start - 1000 : period.start + 2000), value: 2000000000000, count: 1 }]
      : [{ time: iso(period.start), value: 100, count: 1 }, { time: iso(period.start + 20000), value: 20, count: 1 }, { time: iso(now - 1000), value: 30, count: 1 }],
  })) }
}
test('native reset-aware incremental history survives raw counter reset and preserves input', () => {
  const data = metrics()
  data.series[2]!.points.push({ time: iso(now - 1000), value: 5, count: 1 })
  const before = structuredClone(data)
  const result = resolveTrafficMetrics(data, A, period, now)
  expect(result).toMatchObject({ status: 'ready', up: 150, down: 150 })
  expect(data).toEqual(before)
})
for (const [mode, expected] of [['up', 100], ['down', 300], ['min', 100], ['max', 300], ['sum', 400], ['unknown-old-mode', 400]] as const) {
  test(`original billing mode ${mode} is unchanged`, () => expect(trafficByMode(100, 300, mode)).toBe(expected))
}
test('missing starting history never becomes a fake 0 GB or lifetime total', () => {
  expect(resolveTrafficMetrics(metrics(A, false), A, period, now)).toMatchObject({ status: 'insufficient', up: null, down: null })
  const result = resolveTrafficMetrics({ series: [] }, A, period, now)
  expect(result.status).toBe('insufficient')
  expect(result.up).toBeNull()
})
test('an empty new period is zero only with a retained, reliable baseline', () => {
  expect(resolveTrafficMetrics(metrics(), A, period, period.start)).toMatchObject({ status: 'ready', up: 0, down: 0 })
  expect(resolveTrafficMetrics(metrics(A, false), A, period, period.start).status).toBe('insufficient')
})
test('right boundary belongs to the next period, never both', () => {
  const data = metrics()
  data.series[0]!.points.push({ time: iso(now), value: 999, count: 1 })
  expect(resolveTrafficMetrics(data, A, period, now).up).toBe(150)
})
test('another UUID cannot supply a baseline or alter current usage', () => {
  expect(resolveTrafficMetrics(metrics(B), A, period, now).status).toBe('insufficient')
  const first = resolveTrafficMetrics(metrics(A), A, period, now)
  resolveTrafficMetrics(metrics(B), B, trafficPeriod(5, now), now)
  expect(resolveTrafficMetrics(metrics(A), A, period, now)).toEqual(first)
})
for (const value of [-1, null, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER, 64 * 1024 ** 3 + 1]) {
  test(`invalid/reset-spike history ${String(value)} refuses quota`, () => {
    const data = metrics()
    data.series[0]!.points[0]!.value = value as number
    expect(resolveTrafficMetrics(data, A, period, now)).toMatchObject({ status: 'insufficient', up: null })
  })
}
test('zero measured increments remain legitimate zero, not missing data', () => {
  const data = metrics()
  for (const series of data.series.filter(s => s.metric_key.startsWith('traffic.'))) {
    for (const p of series.points) p.value = 0
  }
  expect(resolveTrafficMetrics(data, A, period, now)).toMatchObject({ status: 'ready', up: 0, down: 0 })
})
test('an internal history hole is insufficient; measured zero buckets restore coverage without changing usage', () => {
  const data = metrics()
  const later = period.start + 4 * 3600000
  for (const series of data.series.filter(s => s.metric_key.startsWith('traffic.')))
    series.points.at(-1)!.time = iso(later - 1000)
  expect(resolveTrafficMetrics(data, A, period, later)).toMatchObject({ status: 'insufficient', up: null, down: null })
  for (const series of data.series.filter(s => s.metric_key.startsWith('traffic.'))) {
    for (const hour of [1, 2, 3])
      series.points.push({ time: iso(period.start + hour * 3600000), value: 0, count: 1 })
  }
  expect(resolveTrafficMetrics(data, A, period, later)).toMatchObject({ status: 'ready', up: 150, down: 150 })
})
test('rollups must sum increments, not average or endpoint-difference counters', () => {
  const data = metrics() as { series: Array<Record<string, unknown>> }
  for (const row of data.series) {
    row.downsampled = true
    row.interval_seconds = 60
    row.downsample_algorithm = String(row.metric_key).startsWith('traffic.') ? 'sum' : 'last'
  }
  expect(resolveTrafficMetrics(data, A, period, now).status).toBe('ready')
  data.series[0]!.downsample_algorithm = 'avg'
  expect(resolveTrafficMetrics(data, A, period, now).status).toBe('insufficient')
})

test('hour rollups crossing a minute boundary are insufficient, never prorated', () => {
  const end = at('2026-12-08T15:11:00Z')
  const p = schedulePeriod({ resetDay: 8, timeZone: 'Asia/Shanghai', hour: 23, minute: 10 }, end)
  const series = TRAFFIC_METRICS.map(key => ({
    metric_key: key,
    entity_id: A,
    downsampled: true,
    downsample_algorithm: key.startsWith('traffic.') ? 'sum' : 'last',
    interval_seconds: 3600,
    points: [{ time: iso(p.start), value: 10, count: 1 }],
  }))
  expect(resolveTrafficMetrics({ series }, A, p, end)).toMatchObject({ status: 'insufficient', up: null })
  for (const row of series) row.interval_seconds = 60
  expect(resolveTrafficMetrics({ series }, A, p, end).status).toBe('ready')
})

test('minute edge and hourly body form a bounded, contiguous query plan', () => {
  const start = at('2026-12-08T15:10:00Z')
  const end = at('2027-01-07T15:11:00Z')
  const p = { start, end: at('2027-01-08T15:10:00Z') }
  const ranges = trafficQueryRanges(p, end)
  expect(ranges).toHaveLength(2)
  expect(ranges[0]).toEqual({ start, end: at('2026-12-08T16:00:00Z'), maxPoints: 110 })
  expect(ranges[1]!.start).toBe(ranges[0]!.end)
  expect(ranges[1]!.end).toBe(end)
  expect(ranges[1]!.maxPoints).toBeLessThan(800)
  const parts = ranges.map(range => ({ status: 'ready' as const, period: { start: range.start, end: range.end }, asOf: range.end, up: 10, down: 20, reason: 'explicit offline segment' }))
  expect(combineTrafficSnapshots(parts, p, end)).toMatchObject({ status: 'ready', up: 20, down: 40 })
  expect(combineTrafficSnapshots([parts[0]!, parts[0]!], p, end).status).toBe('insufficient')
  expect(combineTrafficSnapshots([], p, start).status).toBe('insufficient')
  expect(combineTrafficSnapshots([{ ...parts[0]!, status: 'insufficient', up: null, down: null }], p, end).up).toBeNull()
  expect(trafficQueryRanges({ start: ranges[1]!.start, end: p.end }, end)).toHaveLength(1)
})
test('duplicate samples and unsupported coarse aggregation cannot double count', () => {
  const data = metrics()
  data.series[0]!.points.push({ ...data.series[0]!.points[0]! })
  expect(resolveTrafficMetrics(data, A, period, now).status).toBe('insufficient')
})
test('five groups preserve every original field and expose the cycle only under nodes', () => {
  expect(ENHANCED_SETTINGS_GROUPS.map(g => g.label)).toEqual(['基础与首页', '节点与卡片', '线路与延迟', '外观与背景', '高级设置'])
  expect(settingGroup('trafficCycleConfig')).toBe('nodes')
  expect(new Set(THEME_FIELDS.map(f => f.key)).size).toBe(THEME_FIELDS.length)
  expect(settingGroup('returnRouteConfig')).toBe('routes')
  expect(settingGroup('exportSecondaryPassword')).toBe('advanced')
})
test('short return labels retain uncertainty rather than certifying GIA', () => {
  const row = { carrier: 'telecom', status: 'unknown', source: 'auto', label: 'CN2（GIA 候选，未认证）', at: null, detail: '' } as const
  expect(compactReturnRoute(row)).toBe('CN2GIA?')
  expect(compactReturnRoute({ ...row, status: 'expired' })).toBe('过期')
  expect(compactReturnRoute({ ...row, status: 'not-detected' })).toBe('未测')
})

for (const [mode, rawUsed, cycleUsed] of [['up', 100, 120], ['down', 200, 200], ['min', 100, 120], ['max', 200, 200], ['sum', 300, 320]] as const) {
  test(`shared ${mode} accounting preserves cumulative counters and separates cycle quota`, () => {
    const node = Object.freeze({ net_total_up: 100 * 1024 ** 4, net_total_down: 200 * 1024 ** 4, traffic_limit: 1024 ** 4, traffic_limit_type: mode })
    const before = JSON.stringify(node)
    const raw = trafficAccounting(node, undefined, null)
    expect(raw).toMatchObject({ basis: 'machine-cumulative', label: '累计流量', used: rawUsed * 1024 ** 4, remaining: null, ready: false, available: true, percentage: 100 })
    const snapshot = { ...resolveTrafficMetrics(metrics(), A, period, now), up: 120 * 1024 ** 3, down: 200 * 1024 ** 3 }
    const cycle = trafficAccounting(node, 18, snapshot)
    expect(cycle).toMatchObject({ basis: 'billing-cycle', ready: true, available: true, up: 120 * 1024 ** 3, down: 200 * 1024 ** 3, used: cycleUsed * 1024 ** 3, remaining: node.traffic_limit - cycleUsed * 1024 ** 3, percentage: cycleUsed / 1024 * 100 })
    expect(trafficAccounting(node, 31, null)).toMatchObject({ basis: 'unavailable', used: null, percentage: null, remaining: null })
    expect(JSON.stringify(node)).toBe(before)
    expect(trafficAccounting(node, undefined, null).used).toBe(raw.used)
  })
}
for (const status of ['loading', 'insufficient', 'error', 'unsupported'] as const) {
  test(`${status} cycle never falls back to lifetime quota or invents zero usage`, () => {
    const snapshot = { status, period, asOf: now, up: null, down: null, reason: 'explicit failure fixture' }
    expect(trafficAccounting({ net_total_up: 9999, net_total_down: 9999, traffic_limit: 100 }, 18, snapshot)).toMatchObject({ basis: 'unavailable', used: null, up: null, down: null, percentage: null, remaining: null })
  })
}
test('a measured empty cycle, unlimited quota and an exceeded quota remain distinct', () => {
  const snapshot = { ...resolveTrafficMetrics(metrics(), A, period, now), up: 0, down: 0 }
  expect(trafficAccounting({ traffic_limit: 100 }, 18, snapshot)).toMatchObject({ used: 0, percentage: 0, remaining: 100, basis: 'billing-cycle' })
  expect(trafficAccounting({ traffic_limit: 0 }, 18, snapshot)).toMatchObject({ used: 0, percentage: null, remaining: null, basis: 'billing-cycle' })
  expect(trafficAccounting({ traffic_limit: 100 }, 18, { ...snapshot, up: 120 })).toMatchObject({ used: 120, percentage: 100, remaining: 0 })
  expect(trafficAccounting(undefined, undefined, null)).toMatchObject({ used: null, percentage: null, remaining: null })
  expect(trafficAccounting({ net_total_up: 100 }, undefined, null, 'corrupt config')).toMatchObject({ used: null, label: '数据不足', remaining: null })
})
test('manual labels are lossless, known aliases compact and candidate text never gains a premium icon', () => {
  const entry = { carrier: 'telecom', status: 'manual', source: 'manual', label: '管理员指定 & <线路>', at: null, detail: '' } as const
  expect(compactReturnRoute(entry)).toBe(entry.label)
  expect(compactReturnRoute({ ...entry, label: '不是 GIA（未认证）' })).toBe('不是 GIA（未认证）')
  expect(premiumManualRoute({ ...entry, label: '不是 GIA（未认证）' })).toBe(false)
  for (const [label, short] of [['CN2 GT', 'CN2'], ['CMIN2', 'CMI2'], ['CTGNET GIA', 'CTGGIA'], ['10099/CUG', '10099']])
    expect(compactReturnRoute({ ...entry, label: label! })).toBe(short)
})
test('UTC evidence timestamps retain their instant independently of billing timezone', () => {
  expect(returnRouteTime('2026-07-25T11:00:00Z')).toBe('2026-07-25 11:00 UTC')
  expect(returnRouteTime('2026-07-25T19:00:00+08:00')).toBe('2026-07-25 11:00 UTC')
  expect(returnRouteTime('invalid')).toBe('时间未提供')
})
