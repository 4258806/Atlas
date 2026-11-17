export const DEFAULT_CARRIER_ORDER = ['unicom', 'telecom', 'mobile'] as const
export type CarrierKey = typeof DEFAULT_CARRIER_ORDER[number]
export const CARRIER_NAMES: Record<CarrierKey, string> = { unicom: '联通', telecom: '电信', mobile: '移动' }

export function carrierOrder(value: unknown): CarrierKey[] {
  const parts = typeof value === 'string' ? value.split(',').map(s => s.trim()) : []
  return parts.length === 3 && new Set(parts).size === 3 && parts.every(p => DEFAULT_CARRIER_ORDER.includes(p as CarrierKey))
    ? parts as CarrierKey[]
    : [...DEFAULT_CARRIER_ORDER]
}

export function validCarrierOrder(value: unknown): boolean {
  return typeof value === 'string' && carrierOrder(value).join(',') === value
}

/** Preserve gaps; never join a line over an unknown observation. */
export function pingLineSegments(values: Array<number | null>): string[] {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0)
  const min = Math.min(...finite)
  const range = Math.max(...finite) - min
  const segments: string[] = []
  let points: string[] = []
  const flush = () => {
    if (points.length)
      segments.push(points.join(' '))
    points = []
  }
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v) || v < 0) {
      flush()
      return
    }
    const x = values.length === 1 ? 50 : 1 + i / (values.length - 1) * 98
    const y = range === 0 ? 6 : 11 - (v - min) / range * 10
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  })
  flush()
  return segments
}
