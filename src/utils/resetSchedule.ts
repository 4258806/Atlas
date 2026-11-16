import { Temporal } from '@js-temporal/polyfill'

export interface ResetSchedule {
  resetDay: number
  timeZone: string
  hour: number
  minute: number
  /** Retained when migrating an existing schedule; the UI edits minutes only. */
  second?: number
}

const integer = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max

export function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100 || value !== value.trim())
    return false
  try {
    Temporal.ZonedDateTime.from({ year: 2026, month: 1, day: 1, timeZone: value })
    return true
  }
  catch { return false }
}

export function validSchedule(value: unknown): value is ResetSchedule {
  const row = value as ResetSchedule | null
  return Boolean(row && typeof row === 'object' && !Array.isArray(row)
    && integer(row.resetDay, 1, 31) && validTimeZone(row.timeZone)
    && integer(row.hour, 0, 23) && integer(row.minute, 0, 59)
    && (row.second === undefined || integer(row.second, 0, 59)))
}

/** IANA rules from runtime ICU, also supports fixed offsets such as +08:00. */
export function schedulePeriod(schedule: ResetSchedule, now = Date.now()): { start: number, end: number } {
  if (!validSchedule(schedule) || !Number.isSafeInteger(now))
    throw new Error('需要有效的逐节点时区、日期和时间')
  const local = Temporal.Instant.fromEpochMilliseconds(now).toZonedDateTimeISO(schedule.timeZone)
  if (local.year < 2000 || local.year > 9998)
    throw new Error('不支持的计费日历年份')
  const month = Temporal.PlainYearMonth.from({ year: local.year, month: local.month })
  const boundary = (offset: number) => {
    const target = month.add({ months: offset })
    return Temporal.ZonedDateTime.from({
      year: target.year,
      month: target.month,
      day: Math.min(schedule.resetDay, target.daysInMonth),
      hour: schedule.hour,
      minute: schedule.minute,
      second: schedule.second ?? 0,
      timeZone: schedule.timeZone,
    }, { disambiguation: 'compatible', overflow: 'reject' }).epochMilliseconds
  }
  // Calendar month arithmetic, not a fixed number of hours/days. For a gap,
  // shift forward by the actual offset change; for an overlap choose earlier.
  const current = boundary(0)
  return now >= current ? { start: current, end: boundary(1) } : { start: boundary(-1), end: current }
}

export function formatScheduleTime(instant: number, timeZone: string): string {
  const zoned = Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(timeZone)
  return `${zoned.toPlainDate()} ${String(zoned.hour).padStart(2, '0')}:${String(zoned.minute).padStart(2, '0')} ${timeZone} (UTC${zoned.offset})`
}
