<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useNodeTraffic } from '@/composables/useNodeTraffic'
import { saveTrafficReset } from '@/services/themeSettings.service'
import { useAppStore } from '@/stores/app'
import { stableValue } from '@/utils/enhancedManagement'
import { formatBytesWithConfig } from '@/utils/helper'
import { formatScheduleTime, validTimeZone } from '@/utils/resetSchedule'

const props = defineProps<{ node: NodeData }>()
const app = useAppStore()
const traffic = useNodeTraffic(() => props.node)
const { schedule, resetDay, ready, snapshot, used, basis, up, down, percentage, remaining } = traffic
const selectedDay = ref('')
const selectedZone = ref('Asia/Shanghai')
const selectedTime = ref('00:00')
const busy = ref(false)
const error = ref('')
const notice = ref('')
watch(schedule, (value) => {
  selectedDay.value = value ? String(value.resetDay) : ''
  selectedZone.value = value?.timeZone ?? 'Asia/Shanghai'
  selectedTime.value = `${String(value?.hour ?? 0).padStart(2, '0')}:${String(value?.minute ?? 0).padStart(2, '0')}`
}, { immediate: true })
function selection() {
  if (!selectedDay.value)
    return null
  const [hour, minute] = selectedTime.value.split(':').map(Number)
  return { ...schedule.value, resetDay: Number(selectedDay.value), timeZone: selectedZone.value, hour: hour!, minute: minute! }
}
const dateTime = (value: number | undefined) => value === undefined || !schedule.value ? '未设置' : formatScheduleTime(value, schedule.value.timeZone)
async function save() {
  if (busy.value)
    return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const data = await saveTrafficReset(props.node.uuid, selection(), schedule.value)
    app.publicSettings = data
    notice.value = '已保存并读回；仅重新计算本节点，不清零累计计数器。'
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败，请重新加载'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <tr :data-traffic-cycle-node="node.uuid" class="border-t border-border/50 align-top">
    <td class="max-w-44 px-2 py-3">
      <span class="block break-words font-medium">{{ node.name }}</span><code class="mt-1 block break-all text-[10px] text-muted-foreground">{{ node.uuid }}</code>
    </td>
    <td class="px-2 py-3">
      <label class="sr-only" :for="`reset-${node.uuid}`">{{ node.name }} 流量重置日</label>
      <select :id="`reset-${node.uuid}`" v-model="selectedDay" class="h-8 rounded-md border border-border bg-background px-2" :disabled="busy || !!app.trafficCycleConfig.error">
        <option value="">
          未设置
        </option><option v-for="day in 31" :key="day" :value="String(day)">
          每月 {{ day }} 日
        </option>
      </select>
      <label class="mt-2 block text-xs" :for="`zone-${node.uuid}`">时区（IANA / 固定偏移）</label>
      <input :id="`zone-${node.uuid}`" v-model="selectedZone" :aria-label="`${node.name} 重置时区`" placeholder="America/Los_Angeles 或 +08:00" class="mt-1 h-8 w-56 rounded-md border border-border bg-background px-2 text-xs" :disabled="busy || !selectedDay" :aria-invalid="!validTimeZone(selectedZone)">
      <label class="mt-2 block text-xs" :for="`time-${node.uuid}`">当地时间</label>
      <input :id="`time-${node.uuid}`" v-model="selectedTime" type="time" step="60" :aria-label="`${node.name} 重置时分`" class="mt-1 h-8 rounded-md border border-border bg-background px-2" :disabled="busy || !selectedDay">
      <p v-if="selectedDay && !validTimeZone(selectedZone)" role="alert" class="mt-1 text-xs text-destructive">
        请输入有效的 IANA 时区或 ±HH:MM。
      </p>
    </td>
    <td class="whitespace-nowrap px-2 py-3 text-xs">
      <span class="block">{{ dateTime(snapshot?.period.start) }}</span><span class="block text-muted-foreground">至 {{ dateTime(snapshot?.period.end) }}（不含）</span>
    </td>
    <td class="whitespace-nowrap px-2 py-3 text-xs">
      {{ dateTime(snapshot?.period.end) }}
    </td>
    <td class="px-2 py-3">
      <span data-cycle-used :data-traffic-basis="basis" :data-traffic-used="ready ? used : null" :data-traffic-percentage="ready ? percentage : null" :data-traffic-remaining="remaining">{{ ready && used !== null ? formatBytesWithConfig(used, app.byteDecimals) : resetDay ? snapshot?.status === 'loading' || !snapshot ? '读取中' : '数据不足' : '未设置' }}</span>
      <span v-if="ready" data-cycle-breakdown class="mt-1 block text-[10px] text-muted-foreground">↑ {{ formatBytesWithConfig(up ?? 0, app.byteDecimals) }} / ↓ {{ formatBytesWithConfig(down ?? 0, app.byteDecimals) }}</span>
      <span v-if="remaining !== null && percentage !== null" data-cycle-quota class="mt-1 block text-[10px] text-muted-foreground">剩余 {{ formatBytesWithConfig(remaining, app.byteDecimals) }} · {{ percentage.toFixed(1) }}%</span>
      <span class="mt-1 block max-w-52 text-[10px] text-muted-foreground">{{ snapshot?.reason ?? '仅保留原始累计流量，不假定每月 1 日' }}</span>
    </td>
    <td class="min-w-32 px-2 py-3">
      <Button size="sm" :disabled="busy || !!app.trafficCycleConfig.error || (!!selectedDay && (!validTimeZone(selectedZone) || !/^\d{2}:\d{2}$/.test(selectedTime))) || stableValue(selection()) === stableValue(schedule ?? null)" :aria-label="`保存 ${node.name} 流量周期`" @click="save">
        {{ busy ? '保存中' : '保存' }}
      </Button><p v-if="error" role="alert" class="mt-1 max-w-52 text-xs text-destructive">
        {{ error }}
      </p><p v-if="notice" role="status" class="mt-1 max-w-52 text-xs text-success">
        {{ notice }}
      </p>
    </td>
  </tr>
</template>
