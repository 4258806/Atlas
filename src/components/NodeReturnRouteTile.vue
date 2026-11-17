<script setup lang="ts">
import { computed } from 'vue'
import { useNodeReturnRoutes } from '@/composables/useNodeReturnRoutes'
import { useAppStore } from '@/stores/app'
import { RETURN_CARRIER_NAMES } from '@/utils/returnRouteClassification'
import { returnRouteTime } from '@/utils/returnRouteDisplay'
import { QUALITY_PROVINCES, QUALITY_VARIANT_NAMES, QUALITY_VARIANTS, qualityAge, qualityGrade, qualityRoute } from '@/utils/tcpQuality'

const props = defineProps<{ uuid: string }>()
const app = useAppStore()
const { entries, visible, quality } = useNodeReturnRoutes(() => props.uuid)
const ordered = computed(() => app.carrierOrder.map((carrier) => {
  const legacy = entries.value.find(e => e.carrier === carrier)!
  return quality.value && legacy.source !== 'manual' ? qualityRoute(quality.value, carrier, 'ipv4', app.returnRouteTtlHours, app.returnRouteNow) : legacy
}))
const colors = { telecom: 'bg-blue-500 ring-blue-400/25', unicom: 'bg-rose-500 ring-rose-400/25', mobile: 'bg-emerald-500 ring-emerald-400/25' }
const gradeClasses = { premium: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300', optimized: 'border-sky-400/20 bg-sky-500/10 text-sky-600 dark:text-sky-300', ordinary: 'border-amber-400/20 bg-amber-500/10 text-amber-600 dark:text-amber-300', unknown: 'border-border/50 bg-muted/30 text-muted-foreground' }
const at = computed(() => quality.value?.collectedAt ?? ordered.value.find(e => e.at)?.at ?? null)
</script>

<template>
  <section v-if="visible" data-node-route-tile class="col-span-2 min-w-0 rounded-xl border border-border/50 bg-slate-500/5 text-[11px] text-muted-foreground shadow-inner backdrop-blur-sm" :class="!app.connectionCountsVisible && 'col-start-2'" aria-label="三网回程观测" @click.stop @keydown.stop>
    <details class="min-w-0">
      <summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden" aria-label="查看三网回程摘要详情">
        <span class="flex items-center justify-between gap-1 border-b border-border/40 px-2 py-1.5">
          <span class="font-medium text-foreground/90">三网回程</span>
          <time v-if="at" :datetime="at" class="shrink-0 text-[10px] opacity-70" :title="returnRouteTime(at)">{{ qualityAge(at, app.returnRouteNow) }}</time>
          <span v-else class="text-[10px] opacity-70">未测</span>
        </span>
        <span class="grid gap-2 px-2 py-2.5">
          <span v-for="entry in ordered" :key="entry.carrier" :data-route-tile-carrier="entry.carrier" :data-route-status="entry.status" class="flex min-w-0 items-center gap-1" :title="`${entry.label} · ${returnRouteTime(entry.at)} · ${entry.detail}`">
            <span class="flex shrink-0 items-center gap-1 text-foreground/85"><span class="mr-0.5 size-1.5 rounded-full ring-[3px]" :class="colors[entry.carrier]" aria-hidden="true" />{{ RETURN_CARRIER_NAMES[entry.carrier] }}</span>
            <svg class="h-3 w-4 shrink-0 opacity-60" :class="entry.carrier === 'telecom' ? 'text-blue-400' : entry.carrier === 'unicom' ? 'text-rose-400' : 'text-emerald-400'" viewBox="0 0 20 12" fill="none" aria-hidden="true"><circle cx="3" cy="6" r="2" stroke="currentColor" /><path d="M6 6h10m-3-3 3 3-3 3" stroke="currentColor" /></svg>
            <span class="min-w-0 flex-1 truncate rounded-full border border-border/50 bg-background/20 px-1.5 py-0.5 text-center font-medium text-foreground/90">{{ entry.label }}</span>
            <span class="shrink-0 rounded-md border px-1 py-0.5 text-[10px]" :class="gradeClasses[qualityGrade(entry).tone]">{{ qualityGrade(entry).label }}</span>
          </span>
        </span>
      </summary>
      <div class="space-y-2 break-words border-t border-border/40 px-2 py-2" data-route-tile-details>
        <p>{{ quality ? 'TcpQuality · 各协议／地址族独立观测；线路等级为采集器分类，非运营商认证。' : '旧采集结果或手动配置；未取得新采样时不推断线路。' }}</p>
        <time v-if="at" :datetime="at">{{ returnRouteTime(at) }}</time>
        <template v-if="quality">
          <div v-for="variant in QUALITY_VARIANTS" :key="variant" :data-quality-variant="variant" class="space-y-1 rounded-md border border-border/40 p-1.5">
            <p class="font-medium text-foreground/90">
              {{ QUALITY_VARIANT_NAMES[variant] }} <span class="font-normal text-muted-foreground">{{ quality.variants[variant].status === 'unavailable' ? '不可用' : quality.variants[variant].status === 'failed' ? '未取得结果' : '' }}</span>
            </p>
            <template v-if="quality.variants[variant].status === 'measured'">
              <div v-for="carrier in app.carrierOrder" :key="carrier">
                <p>{{ RETURN_CARRIER_NAMES[carrier] }}：{{ qualityRoute(quality, carrier, variant, app.returnRouteTtlHours, app.returnRouteNow).detail }}</p>
                <p v-for="group in quality.variants[variant].carriers[carrier]?.groups ?? []" :key="group.label" class="text-[10px] opacity-75">
                  {{ group.label }}：{{ group.provinces.map(p => QUALITY_PROVINCES[p]).join('、') }}
                </p>
              </div>
            </template>
          </div>
        </template>
        <template v-else>
          <p v-for="entry in ordered" :key="entry.carrier">
            {{ RETURN_CARRIER_NAMES[entry.carrier] }}：{{ entry.label }} · {{ entry.detail }}
          </p>
        </template>
      </div>
    </details>
  </section>
</template>
