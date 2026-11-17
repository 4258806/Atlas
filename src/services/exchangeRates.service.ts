import type { ExchangeRates, ExchangeRateSource } from '@/utils/financeHelper'
import { requestManager } from '@/services/request.service'
import { SUPPORTED_CURRENCIES } from '@/utils/financeHelper'

export interface RateResult {
  rates: ExchangeRates
  source: ExchangeRateSource
  updatedAt: number | null
  provider: string
  expiresAt: number
}
interface Quote { rates: ExchangeRates, fetchedAt: number, updatedAt: number, expiresAt: number, provider: string }
const KEY = 'komari_finance_exchange_rates_cny_v2'
const DAY = 86400000
const QUOTE_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_CURRENCY = /^[A-Z]{3}$/
const inflight = new Map<string, Promise<RateResult>>()

export function unavailableRates(): ExchangeRates {
  return Object.fromEntries(SUPPORTED_CURRENCIES.map(code => [code, code === 'CNY' ? 1 : Number.NaN])) as ExchangeRates
}
function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  }
  catch { return null }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  }
  catch { /* Storage denial does not prevent current-session conversion. */ }
}
function ratesFrom(raw: unknown): ExchangeRates | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const result = unavailableRates()
  for (const [code, value] of Object.entries(raw)) {
    if (!ISO_CURRENCY.test(code))
      continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1e12 || (code === 'CNY' && value !== 1))
      return null
    result[code] = value
  }
  return result
}
function covers(rates: ExchangeRates, codes: string[]) {
  return codes.every((code) => {
    const rate = rates[code]
    return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
  })
}
function cached(): Quote | null {
  const value = read(KEY) as Quote & { base?: string } | null
  const rates = ratesFrom(value?.rates)
  const now = Date.now()
  if (value?.base === 'CNY' && rates && Number.isFinite(value.fetchedAt) && value.fetchedAt <= now && Number.isFinite(value.updatedAt) && value.updatedAt <= now + 300000 && Number.isFinite(value.expiresAt) && value.expiresAt <= value.fetchedAt + DAY && typeof value.provider === 'string')
    return { ...value, rates, expiresAt: now - value.updatedAt > 7 * DAY ? 0 : value.expiresAt }
  const legacy = read('komari_finance_exchange_rates_cny_v1') as { rates?: unknown, fetchedAt?: number, base?: string } | null
  const oldRates = ratesFrom(legacy?.rates)
  return legacy?.base === 'CNY' && oldRates && Number.isFinite(legacy.fetchedAt) && legacy.fetchedAt! <= now
    ? { rates: oldRates, fetchedAt: legacy.fetchedAt!, updatedAt: legacy.fetchedAt!, expiresAt: 0, provider: '旧缓存（来源时间未验证）' }
    : null
}

export function parseRateQuote(provider: 'primary' | 'backup', raw: unknown, now = Date.now()): Quote | null {
  const data = raw as Record<string, unknown> | null
  const rates = ratesFrom(data?.rates)
  if (!data || !rates)
    return null
  let updatedAt: number
  let expiresAt: number
  if (provider === 'primary') {
    if (data.result !== 'success' || data.base_code !== 'CNY' || typeof data.time_last_update_unix !== 'number' || typeof data.time_next_update_unix !== 'number')
      return null
    updatedAt = data.time_last_update_unix * 1000
    expiresAt = Math.min(data.time_next_update_unix * 1000, now + DAY)
  }
  else {
    if (data.base !== 'CNY' || typeof data.date !== 'string' || !QUOTE_DATE.test(data.date))
      return null
    updatedAt = Date.parse(`${data.date}T00:00:00Z`)
    if (!Number.isFinite(updatedAt) || new Date(updatedAt).toISOString().slice(0, 10) !== data.date)
      return null
    expiresAt = Math.min(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate() + 1), now + DAY)
  }
  if (!Number.isFinite(updatedAt) || updatedAt > now + 300000 || now - updatedAt > 7 * DAY || !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt <= updatedAt)
    return null
  return { rates, fetchedAt: now, updatedAt, expiresAt, provider: provider === 'primary' ? 'ExchangeRate-API' : 'Frankfurter' }
}

export async function getSummaryExchangeRates(required: string[] = SUPPORTED_CURRENCIES): Promise<RateResult> {
  const codes = [...new Set(['CNY', ...required])].sort()
  const key = codes.join(',')
  const now = Date.now()
  if (codes.some(code => !ISO_CURRENCY.test(code)))
    return { rates: unavailableRates(), source: 'unavailable', updatedAt: null, provider: '', expiresAt: 0 }
  if (codes.length === 1 && codes[0] === 'CNY')
    return { rates: unavailableRates(), source: 'cache', updatedAt: null, provider: 'CNY 本币（无需换算）', expiresAt: now + DAY }
  const quote = cached()
  const result = (item: Quote, source: ExchangeRateSource): RateResult => ({ rates: item.rates, source, updatedAt: item.updatedAt, provider: item.provider, expiresAt: item.expiresAt })
  if (quote && quote.fetchedAt <= now && quote.updatedAt <= now + 300000 && quote.expiresAt > now && quote.expiresAt <= quote.fetchedAt + DAY && covers(quote.rates, codes))
    return result(quote, 'cache')
  const retryKey = `${KEY}:retry:${key}`
  const fallback = (): RateResult => quote && covers(quote.rates, codes)
    ? result(quote, 'stale-cache')
    : { rates: unavailableRates(), source: 'unavailable', updatedAt: null, provider: '', expiresAt: 0 }
  const retry = read(retryKey)
  if (typeof retry === 'number' && retry > now && retry <= now + 900000)
    return fallback()
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      for (const [provider, url] of [
        ['primary', 'https://open.er-api.com/v6/latest/CNY'],
        ['backup', 'https://api.frankfurter.app/latest?from=CNY'],
      ] as const) {
        try {
          const raw = await requestManager.run(`finance:rates:${provider}`, async (signal) => {
            const response = await fetch(url, { signal })
            if (!response.ok)
              throw new Error('rate provider unavailable')
            return response.json()
          }, { retryAttempts: 0, timeout: 5000 })
          const fresh = parseRateQuote(provider, raw, Date.now())
          if (fresh && covers(fresh.rates, codes)) {
            write(KEY, { ...fresh, base: 'CNY', rates: Object.fromEntries(Object.entries(fresh.rates).filter(([, rate]) => Number.isFinite(rate))) })
            return result(fresh, 'network')
          }
        }
        catch { /* Try the existing backup; never invent a missing currency. */ }
      }
      write(retryKey, Date.now() + 900000)
      return fallback()
    })().finally(() => inflight.delete(key)))
  }
  return inflight.get(key)!
}
