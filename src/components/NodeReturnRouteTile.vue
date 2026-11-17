<script setup lang="ts">
import { computed } from 'vue'
import { useNodeReturnRoutes } from '@/composables/useNodeReturnRoutes'
import { useAppStore } from '@/stores/app'
import { RETURN_CARRIER_NAMES } from '@/utils/returnRouteClassification'
import { compactReturnRoute, returnRouteTime } from '@/utils/returnRouteDisplay'
import { resolveReturnRoutes } from '@/utils/returnRoutes'

const props = defineProps<{ uuid: string }>()
const app = useAppStore()
const { entries, visible, protocolEvidence } = useNodeReturnRoutes(() => props.uuid)
const ordered = computed(() => app.carrierOrder.flatMap(c => entries.value.filter(e => e.carrier === c)).map((entry) => {
  const paths = protocolEvidence.value?.[entry.carrier]
  const trace = paths?.tcp ?? paths?.udp
  if (!trace || entry.source === 'manual' || entry.protocolState === 'same' || entry.status === 'expired')
    return entry
  const selected = resolveReturnRoutes({ version: 1, nodes: { [props.uuid]: { manual: {}, auto: { [entry.carrier]: trace } } } }, props.uuid, true, app.returnRouteTtlHours, app.returnRouteNow).find(e => e.carrier === entry.carrier)!
  return { ...selected, status: 'unknown' as const, protocolState: 'single' as const, detail: `首页单独显示 ${paths?.tcp ? 'TCP' : 'UDP'} 观测；${entry.detail}；${selected.detail}` }
}))
</script>

<template>
  <section v-if="visible" data-node-route-tile class="col-span-2 min-w-0 rounded-lg bg-slate-500/5 text-[11px] text-muted-foreground" :class="!app.connectionCountsVisible && 'col-start-2'" aria-label="三网回程观测" @click.stop @keydown.stop>
    <details class="min-w-0">
      <summary class="grid cursor-pointer list-none grid-cols-3 gap-1 [&::-webkit-details-marker]:hidden" aria-label="查看三网回程摘要详情">
        <span v-for="entry in ordered" :key="entry.carrier" :data-route-tile-carrier="entry.carrier" class="flex min-w-0 flex-col gap-0.5" :title="`${entry.label} · ${returnRouteTime(entry.at)} · ${entry.detail}`">
          <span>{{ RETURN_CARRIER_NAMES[entry.carrier] }}</span>
          <span class="truncate tabular-nums">{{ compactReturnRoute(entry) }}</span>
        </span>
      </summary>
      <div class="mt-2 space-y-1 break-words border-t border-border/50 pt-1" data-route-tile-details>
        <p>节点 → 国内目标；自动摘要优先展示单条 TCP 观测（无 TCP 时取 UDP），不合并分歧路径；非商业线路认证。</p>
        <p v-for="entry in ordered" :key="entry.carrier">
          {{ RETURN_CARRIER_NAMES[entry.carrier] }}：{{ entry.label }} · {{ returnRouteTime(entry.at) }} · {{ entry.detail }}
        </p>
      </div>
    </details>
  </section>
</template>
