import type { ComputedRef } from 'vue'
import type { CurrencyCode, ExchangeRateSource } from '@/utils/financeHelper'
import { useIntervalFn } from '@vueuse/core'
import { onActivated, onDeactivated, onMounted, onScopeDispose, ref, watch } from 'vue'
import { getSummaryExchangeRates, unavailableRates } from '@/services/exchangeRates.service'
import { applyExchangeRateOverrides } from '@/utils/financeHelper'

export function useSummaryRates(required: ComputedRef<CurrencyCode[]>, enabled: ComputedRef<boolean>) {
  const rates = ref(unavailableRates())
  const dailyRates = ref(unavailableRates())
  const source = ref<ExchangeRateSource | 'loading'>('loading')
  const updatedAt = ref<number | null>(null)
  const provider = ref('')
  let disposed = false
  let active = true
  let revision = 0
  async function refresh() {
    if (!enabled.value || disposed || !active)
      return
    const version = ++revision
    const quote = await getSummaryExchangeRates(required.value)
    if (disposed || version !== revision)
      return
    dailyRates.value = quote.rates
    rates.value = applyExchangeRateOverrides(quote.rates)
    source.value = quote.source
    updatedAt.value = quote.updatedAt
    provider.value = quote.provider
  }
  watch(() => [enabled.value, required.value.join(',')], () => void refresh(), { immediate: true })
  useIntervalFn(() => void refresh(), 60000)
  onActivated(() => {
    active = true
    void refresh()
  })
  onDeactivated(() => {
    active = false
    revision++
  })
  const visible = () => {
    if (document.visibilityState === 'visible')
      void refresh()
  }
  onMounted(() => document.addEventListener('visibilitychange', visible))
  onScopeDispose(() => {
    disposed = true
    document.removeEventListener('visibilitychange', visible)
  })
  return { rates, dailyRates, source, updatedAt, provider, refresh }
}
