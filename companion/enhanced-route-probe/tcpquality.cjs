'use strict'
// Atlas's bounded inter-process result contract. No upstream GPL classifier code.
const { keys, UUID } = require('./protocol.cjs')

const UPSTREAM = 'db52fc60523320fc4a34b5c369f28be38df21d13'
const VARIANTS = ['ipv4', 'ipv6', 'udp4', 'udp6', 'large4']
const CARRIERS = ['telecom', 'unicom', 'mobile']
const VERSION = /^0\.4\.0(?:\+git\.[0-9a-f]{7,40})?$/
const HASH = /^[a-f0-9]{64}$/
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/
const LABEL = /^[A-Z0-9][\w .+>/-]{0,47}$/i
const JOB = /^[a-f0-9]{48}$/
const IP_TEXT = /(?:\d{1,3}\.){3}\d{1,3}/
function assert(value) {
  if (!value)
    throw new TypeError('invalid TcpQuality observation')
}
function normalizeQuality(report, uuid, now = Date.now(), live = true) {
  keys(report, ['schema', 'uuid', 'source', 'scope', 'collectedAt', 'upstreamCommit', 'collectorVersion', 'reportHash', 'variants'])
  assert(report.schema === 1 && UUID.test(uuid) && report.uuid === uuid && report.source === 'TcpQuality' && report.scope === 'three-carrier')
  assert(report.upstreamCommit === UPSTREAM && VERSION.test(report.collectorVersion))
  assert(typeof report.reportHash === 'string' && HASH.test(report.reportHash))
  assert(typeof report.collectedAt === 'string' && TIME.test(report.collectedAt))
  const time = Date.parse(report.collectedAt)
  assert(Number.isFinite(time) && new Date(time).toISOString() === report.collectedAt)
  if (live)
    assert(time <= now + 300000 && time >= now - 86400000)
  keys(report.variants, VARIANTS)
  assert(Object.keys(report.variants).length === 5)
  for (const variant of VARIANTS) {
    const section = report.variants[variant]
    keys(section, ['status', 'carriers'])
    assert(['measured', 'unavailable', 'failed'].includes(section.status))
    keys(section.carriers, CARRIERS)
    if (section.status !== 'measured') {
      assert(Object.keys(section.carriers).length === 0)
      continue
    }
    assert(Object.keys(section.carriers).length === 3)
    let observations = 0
    for (const carrier of CARRIERS) {
      const row = section.carriers[carrier]
      keys(row, ['total', 'groups', 'latencyMs', 'retransmissionPercent'])
      assert(Number.isInteger(row.total) && row.total >= 0 && row.total <= 31 && Array.isArray(row.groups) && row.groups.length <= 31)
      for (const [key, max] of [['latencyMs', 120000], ['retransmissionPercent', 100]])
        assert(row[key] === null || (typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= max))
      const provinces = new Set()
      const labels = new Set()
      for (const group of row.groups) {
        keys(group, ['label', 'provinces'])
        assert(typeof group.label === 'string' && LABEL.test(group.label) && !IP_TEXT.test(group.label) && !labels.has(group.label))
        labels.add(group.label)
        assert(Array.isArray(group.provinces) && group.provinces.length >= 1 && group.provinces.length <= 31)
        for (const province of group.provinces) {
          assert(Number.isInteger(province) && province >= 0 && province < 31 && !provinces.has(province))
          provinces.add(province)
        }
      }
      assert(provinces.size === row.total)
      observations += row.total
    }
    assert(observations > 0)
  }
  assert(JSON.stringify(report).length <= 14500)
  return JSON.parse(JSON.stringify(report))
}
class QualityCoordinator {
  constructor(makeId) {
    this.makeId = makeId
    this.reports = {}
    this.schedules = {}
  }

  importState(value) {
    keys(value, ['schema', 'reports', 'schedules'])
    assert(value.schema === 1)
    keys(value.reports, Object.keys(value.reports))
    assert(Object.keys(value.reports).length <= 200)
    this.reports = Object.fromEntries(Object.entries(value.reports).map(([id, report]) => [id, normalizeQuality(report, id, Date.now(), false)]))
    keys(value.schedules, Object.keys(value.schedules))
    assert(Object.keys(value.schedules).length <= 200)
    for (const [id, row] of Object.entries(value.schedules)) {
      keys(row, ['id', 'startedAt', 'expiresAt', 'acceptedId'])
      assert(UUID.test(id) && JOB.test(row.id) && Number.isFinite(row.startedAt) && Number.isFinite(row.expiresAt) && row.expiresAt === row.startedAt + 1920000 && (row.acceptedId === null || row.acceptedId === row.id))
    }
    this.schedules = JSON.parse(JSON.stringify(value.schedules))
  }

  exportState() { return { schema: 1, reports: this.reports, schedules: this.schedules } }

  poll(uuid, config, version, now = Date.now()) {
    assert(VERSION.test(version))
    const policy = config.nodes[uuid]
    if (!config.enabled || !policy?.enabled || policy.collector !== 'tcpquality')
      return { schema: 1, job: null, wait_seconds: 60 }
    const old = this.schedules[uuid]
    const due = old ? old.startedAt + policy.periodMinutes * 60000 : 0
    if ((old && !old.acceptedId && old.expiresAt > now) || due > now)
      return { schema: 1, job: null, wait_seconds: Math.max(60, Math.ceil((due - now) / 1000)) }
    const id = this.makeId()
    assert(JOB.test(id))
    this.schedules[uuid] = { id, startedAt: now, expiresAt: now + 1920000, acceptedId: null }
    return { schema: 1, job: { id, kind: 'tcpquality-three-carrier', expiresAt: now + 1920000, scope: 'three-carrier' } }
  }

  accept(uuid, report, config, jobId, now = Date.now()) {
    assert(config.enabled && config.nodes[uuid]?.enabled && config.nodes[uuid]?.collector === 'tcpquality')
    const next = normalizeQuality(report, uuid, now)
    const old = this.reports[uuid]
    const lease = this.schedules[uuid]
    assert(lease && JOB.test(jobId) && lease.id === jobId)
    if (lease.acceptedId === jobId && JSON.stringify(next) === JSON.stringify(old))
      return
    assert(lease.expiresAt >= now && !lease.acceptedId && Date.parse(next.collectedAt) >= lease.startedAt - 300000)
    assert(!old || Date.parse(next.collectedAt) > Date.parse(old.collectedAt) || JSON.stringify(next) === JSON.stringify(old))
    this.reports[uuid] = next
    this.schedules[uuid] = { ...lease, acceptedId: jobId }
  }

  project(snapshot, config) {
    const nodes = { ...snapshot.nodes }
    for (const [id, quality] of Object.entries(this.reports)) {
      if (!config.enabled || !config.nodes[id]?.enabled || config.nodes[id]?.collector !== 'tcpquality')
        continue
      nodes[id] = { ...(nodes[id] || { enabled: true, state: 'completed', latest: null }), quality }
    }
    return { ...snapshot, nodes }
  }
}
module.exports = { UPSTREAM, VARIANTS, normalizeQuality, QualityCoordinator }
