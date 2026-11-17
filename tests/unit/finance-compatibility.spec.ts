import type { NodeData } from '../../src/stores/nodes'
import { expect, test } from '@playwright/test'
import { parseRateQuote } from '../../src/services/exchangeRates.service'
import {
  applyExchangeRateOverrides,
  calculateMeteredEstimate,
  calculateMonthlyCostCNY,
  calculateMonthlyCostNative,
  calculateRemainingValueNative,
  clearExchangeRateOverrides,
  clearStoredMeteredEstimateSettings,
  DEFAULT_EXCHANGE_RATES,
  formatFinanceAmount,
  formatNativeAmount,
  getDailyExchangeRates,
  getPriceCNY,
  getStoredFinanceCurrency,
  getStoredMeteredEstimateSettings,
  nativeCurrency,
  normalizeCurrency,
  setExchangeRateOverride,
  setStoredFinanceCurrency,
  setStoredMeteredEstimateSettings,
  SUPPORTED_CURRENCIES,
} from '../../src/utils/financeHelper'

// Deterministic unit fixtures, not evidence of a live exchange-rate provider.
const descriptors = new Map(['localStorage', 'window', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
let values: Map<string, string>
const realNow = Date.now
function primary(rates = DEFAULT_EXCHANGE_RATES) {
  return { result: 'success', base_code: 'CNY', time_last_update_unix: Math.floor(Date.now() / 1000) - 60, time_next_update_unix: Math.floor(Date.now() / 1000) + 3600, rates }
}
test.beforeEach(() => {
  values = new Map()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } })
})
test.afterEach(() => {
  Date.now = realNow
  for (const [key, descriptor] of descriptors) {
    if (descriptor)
      Object.defineProperty(globalThis, key, descriptor)
    else
      Reflect.deleteProperty(globalThis, key)
  }
})

for (const currency of SUPPORTED_CURRENCIES) {
  test(`existing ${currency} conversion and display are preserved`, () => {
    const node = { currency, price: DEFAULT_EXCHANGE_RATES[currency] * 100 } as NodeData
    expect(getPriceCNY(node, DEFAULT_EXCHANGE_RATES)).toBeCloseTo(100)
    expect(normalizeCurrency(currency)).toBe(currency)
    expect(formatFinanceAmount(node.price, currency).symbol).toBeTruthy()
  })
}

test('exactly thirteen currencies include SGD aliases and recurring cost', () => {
  expect(new Set(SUPPORTED_CURRENCIES).size).toBe(13)
  expect(normalizeCurrency('S$')).toBe('SGD')
  expect(normalizeCurrency(' sgd ')).toBe('SGD')
  const rates = { ...DEFAULT_EXCHANGE_RATES, SGD: 0.2 }
  expect(calculateMonthlyCostCNY({ price: 20, currency: 'SGD', billing_cycle: 30 } as NodeData, rates)).toBe(100)
  expect(formatFinanceAmount(20, 'SGD')).toEqual({ currency: 'SGD', symbol: 'S$', value: '20.00' })
})

test('SGD currency and manual override persist without mutating base rates', () => {
  setStoredFinanceCurrency('SGD')
  expect(getStoredFinanceCurrency()).toBe('SGD')
  setExchangeRateOverride('SGD', 0.25)
  setExchangeRateOverride('CNY', 2)
  setExchangeRateOverride('USD', Number.NaN)
  const rates = applyExchangeRateOverrides(DEFAULT_EXCHANGE_RATES)
  expect(rates.SGD).toBe(0.25)
  expect(rates.CNY).toBe(1)
  expect(DEFAULT_EXCHANGE_RATES.SGD).toBe(0.188746)
  expect(getPriceCNY({ price: 25, currency: 'SGD' } as NodeData, rates)).toBe(100)
  clearExchangeRateOverrides()
  expect(applyExchangeRateOverrides(DEFAULT_EXCHANGE_RATES)).toEqual(DEFAULT_EXCHANGE_RATES)
})

test('existing metered estimator uses machine totals and saves SGD settings', () => {
  const settings = { currency: 'SGD' as const, trafficMode: 'sum' as const, trafficRate: 2, timeRate: 3, manualHours: 4, oneTimeFee: 5 }
  setStoredMeteredEstimateSettings('test-node', settings)
  expect(getStoredMeteredEstimateSettings('test-node')).toEqual(settings)
  const result = calculateMeteredEstimate({ net_total_up: 1024 ** 4, net_total_down: 2 * 1024 ** 4 } as NodeData, settings)
  expect(result.trafficBytes).toBe(3 * 1024 ** 4)
  expect(result.totalCost).toBe(23)
  clearStoredMeteredEstimateSettings('test-node')
  expect(getStoredMeteredEstimateSettings('test-node').currency).toBe('USD')
})

test('online response fixture is cached with SGD; the second call does not fetch', async () => {
  let requests = 0
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => {
    requests++
    return Response.json(primary({ ...DEFAULT_EXCHANGE_RATES, SGD: 0.25 }))
  } })
  const first = await getDailyExchangeRates()
  expect(first.source).toBe('network')
  expect(first.rates.SGD).toBe(0.25)
  const second = await getDailyExchangeRates()
  expect(second.source).toBe('cache')
  expect(second.rates).toEqual(first.rates)
  expect(requests).toBe(1)
})

test('per-node native costs remain independent while one summary currency is selected', () => {
  const now = new Date('2026-11-17T00:00:00Z')
  const usd = { price: 9.9, currency: 'USD', billing_cycle: 30, expired_at: '2026-12-02T00:00:00Z' } as NodeData
  const cny = { ...usd, price: 804.6, currency: 'CNY', billing_cycle: 180 } as NodeData
  setStoredFinanceCurrency('EUR')
  expect(getStoredFinanceCurrency()).toBe('EUR')
  expect(calculateMonthlyCostNative(usd)).toBe(9.9)
  expect(calculateRemainingValueNative(usd, now)).toBeCloseTo(4.95)
  expect(calculateMonthlyCostNative(cny)).toBeCloseTo(134.1)
  expect(calculateRemainingValueNative(usd, now)).toBeCloseTo(4.95)
  expect(calculateRemainingValueNative(cny, now)).toBeCloseTo(67.05)
})

test('node currency follows its input even outside the old summary selector', async () => {
  const node = { price: 10, currency: 'AUD', billing_cycle: 30 } as NodeData
  expect(nativeCurrency('AUD')).toBe('AUD')
  expect(nativeCurrency('credits')).toBe('credits')
  expect(formatNativeAmount(10, 'AUD')).toBe('10.00 AUD')
  expect(formatNativeAmount(10, 'credits')).toBe('10.00 credits')
  expect(calculateMonthlyCostNative(node)).toBe(10)
  expect(Number.isNaN(getPriceCNY(node, DEFAULT_EXCHANGE_RATES))).toBe(true)
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => Response.json(primary({ ...DEFAULT_EXCHANGE_RATES, AUD: 0.2 })) })
  const quote = await getDailyExchangeRates(['AUD', 'CNY'])
  expect(quote.source).toBe('network')
  expect(getPriceCNY(node, quote.rates)).toBe(50)
  expect(formatNativeAmount(10, node.currency)).toBe('10.00 AUD')
})

test('backup accepts only needed currencies and never fills missing RUB/VND with invented rates', async () => {
  let requests = 0
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (url: string) => {
    requests++
    return url.includes('er-api') ? new Response('', { status: 503 }) : Response.json({ base: 'CNY', date: new Date(Date.now()).toISOString().slice(0, 10), rates: { USD: 0.14 } })
  } })
  const quote = await getDailyExchangeRates(['CNY', 'USD'])
  expect(quote.provider).toBe('Frankfurter')
  expect(quote.source).toBe('network')
  expect(quote.rates.USD).toBe(0.14)
  expect(Number.isNaN(quote.rates.RUB)).toBe(true)
  const missing = await getDailyExchangeRates(['RUB'])
  expect(missing.source).toBe('unavailable')
  expect(Number.isNaN(missing.rates.RUB)).toBe(true)
  expect(requests).toBe(4)
})

test('provider expiration refreshes within the same date and outages are bounded', async () => {
  let now = Date.UTC(2026, 10, 17, 10)
  Date.now = () => now
  let requests = 0
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => {
    requests++
    return Response.json(primary())
  } })
  await getDailyExchangeRates()
  now += 3600001
  expect((await getDailyExchangeRates()).source).toBe('network')
  expect(requests).toBe(2)
  now += 3600001
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => {
    requests++
    return new Response('', { status: 503 })
  } })
  expect((await getDailyExchangeRates()).source).toBe('stale-cache')
  expect((await getDailyExchangeRates()).source).toBe('stale-cache')
  expect(requests).toBe(4)
})

test('malformed base, dates, values and provider timestamps fail closed', () => {
  const now = Date.now()
  for (const patch of [{ base_code: 'USD' }, { result: 'error' }, { time_last_update_unix: now / 1000 + 1000 }, { time_next_update_unix: now / 1000 - 1 }, { rates: { USD: '0.14' } }, { rates: { CNY: 2, USD: 0.14 } }])
    expect(parseRateQuote('primary', { ...primary(), ...patch }, now)).toBeNull()
  expect(parseRateQuote('backup', { base: 'CNY', date: '2026-02-31', rates: { USD: 0.14 } }, now)).toBeNull()
})

test('an outage without a trustworthy cache never silently supplies hardcoded rates', async () => {
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => new Response('', { status: 503 }) })
  const missing = await getDailyExchangeRates(['USD'])
  expect(missing.source).toBe('unavailable')
  expect(Number.isNaN(missing.rates.USD)).toBe(true)
  expect(formatFinanceAmount(Number.NaN, 'USD').value).toBe('汇率不可用')
})

test('both provider failures preserve a stale SGD cache rather than inventing a rate', async () => {
  values.set('komari_finance_exchange_rates_cny_v1', JSON.stringify({ base: 'CNY', date: '2000-01-01', fetchedAt: 1, rates: { ...DEFAULT_EXCHANGE_RATES, SGD: 0.22 } }))
  let requests = 0
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => {
    requests++
    return new Response('', { status: 503 })
  } })
  const result = await getDailyExchangeRates()
  expect(result.source).toBe('stale-cache')
  expect(result.rates.SGD).toBe(0.22)
  expect(requests).toBe(2)
})
