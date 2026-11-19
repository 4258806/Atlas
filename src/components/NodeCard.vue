<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { useIntersectionObserver } from '@vueuse/core'
import { computed, ref, useTemplateRef } from 'vue'
import NodeHeaderTags from '@/components/NodeHeaderTags.vue'
import NodeReturnRoutes from '@/components/NodeReturnRoutes.vue'
import NodeReturnRouteTile from '@/components/NodeReturnRouteTile.vue'
import PingHistoryLine from '@/components/PingHistoryLine.vue'
import { CardX } from '@/components/ui/card-x'
import { DataTooltip } from '@/components/ui/data-tooltip'
import { ProgressThin } from '@/components/ui/progress-thin'

import { useNodeCarrierPingSource } from '@/composables/useNodeCarrierPingSource'
import { useNodeTraffic } from '@/composables/useNodeTraffic'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, formatDateTime, getStatus, getUptimeDays } from '@/utils/helper'
import { getDiskPercentage, getMemoryPercentage, hasTrafficLimit } from '@/utils/nodeMetricsHelper'
import { getOSImage, getOSName } from '@/utils/osImageHelper'
import { getRegionCode, getRegionDisplayName } from '@/utils/regionHelper'
import { formatCurrencyValue, formatPriceWithCycle, getDaysUntilExpired, getExpireStatus, getRemainingValue, isFreePrice } from '@/utils/tagHelper'

const props = withDefaults(defineProps<{
  node: NodeData
  reduceMotion?: boolean
  pingEnabled?: boolean
}>(), {
  reduceMotion: false,
  pingEnabled: true,
})
const emit = defineEmits<{
  click: []
  pingClick: []
}>()
const appStore = useAppStore()

const isFavorite = computed(() => appStore.isFavoriteNode(props.node.uuid))

function toggleFavorite(): void {
  appStore.toggleFavoriteNode(props.node.uuid)
}

function handleKeyboardOpen(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ')
    return
  event.preventDefault()
  emit('click')
}

interface RemainingInfoTag {
  icon: string
  text?: string
  prefix?: string
  value?: string
  unit?: string
  className?: string
}

const NODE_METRIC_ICONS = {
  cpu: 'tabler:cpu',
  memory: 'icon-park-outline:memory',
  disk: 'tabler:server-2',
  traffic: 'tabler:arrows-transfer-up-down',
} as const

const isMiniNodeCard = computed(() => appStore.nodeCardSize === 'mini')
const showReturnRouteSplit = computed(() => appStore.returnRouteHomeTileEnabled && appStore.returnRoutesVisible)
const nodeCardXSize = computed(() => appStore.nodeCardSize === 'large' ? 'large' : 'medium')
const nodeCardContentClass = computed(() => appStore.nodeCardSize === 'large' ? 'gap-4' : isMiniNodeCard.value ? 'gap-2' : 'gap-3')
const nodeCardContentPaddingClass = computed(() => isMiniNodeCard.value ? 'pb-2 flex-1 flex flex-col @max-[380px]/card:px-3' : 'flex-1 flex flex-col @max-[380px]/card:px-3')
const nodeCardMetricGridClass = 'grid-cols-3'
const nodeCardMetricBoxClass = computed(() => isMiniNodeCard.value
  ? 'px-1 py-1'
  : appStore.nodeCardSize === 'compact' ? 'px-1.5 py-1.5' : 'px-2 py-1.5')
const nodeCardCarrierPingPanelClass = computed(() => {
  if (appStore.nodeCardSize === 'large')
    return 'h-[128px] gap-2 p-2'
  if (appStore.nodeCardSize === 'comfortable')
    return 'h-[120px] gap-1.5 p-2'
  if (isMiniNodeCard.value)
    return 'h-[92px] gap-1 p-1'
  return 'h-[112px] gap-1.5 p-1.5'
})

const formatBytes = (bytes: number) => formatBytesWithConfig(bytes, appStore.byteDecimals)
const formatBytesPerSecond = (bytes: number) => formatBytesPerSecondWithConfig(bytes, appStore.byteDecimals)
function formatConnectionCount(value: number | undefined): string {
  return props.node.online && typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value).toLocaleString('en-US')
    : '—'
}
const offlineTime = computed(() => formatDateTime(props.node.time))

const cpuStatus = computed(() => getStatus(props.node.cpu ?? 0))
const memPercentage = computed(() => getMemoryPercentage(props.node))
const memStatus = computed(() => getStatus(memPercentage.value))
const swapTooltip = computed(() => {
  const used = formatBytes(Math.max(0, props.node.swap ?? 0))
  const total = Math.max(0, props.node.swap_total ?? 0)
  return total > 0 ? `Swap 已用 ${used} / 总计 ${formatBytes(total)}` : `Swap 已用 ${used}`
})
const diskPercentage = computed(() => getDiskPercentage(props.node))
const diskStatus = computed(() => getStatus(diskPercentage.value))

const pingRoot = useTemplateRef<ComponentPublicInstance>('pingRoot')
const pingVisible = ref(false)
const { isSupported } = useIntersectionObserver(
  pingRoot,
  (entries) => {
    pingVisible.value = entries.at(-1)?.isIntersecting ?? false
  },
  { rootMargin: '200px 0px' },
)
const { carrierDisplays, isTransit } = useNodeCarrierPingSource(
  () => props.node,
  () => props.pingEnabled && (!isSupported.value || pingVisible.value),
)

const { used: trafficUsed, percentage, remaining: trafficRemaining, label: trafficLabel, up: trafficUp, down: trafficDown, available: trafficReady, basis: trafficBasis } = useNodeTraffic(() => props.node)
const trafficUsedPercentage = computed(() => percentage.value ?? 0)
const trafficPercentageText = computed(() => !trafficReady.value ? '—' : hasTrafficLimit(props.node) ? `${trafficUsedPercentage.value.toFixed(1)}%` : '∞')
const trafficTooltip = computed(() => trafficBasis.value === 'machine-cumulative' ? '未设置流量周期；比例仅为累计参考，不是周期配额，不计算周期剩余额度' : !trafficReady.value ? '周期历史数据不足，未估算剩余额度' : trafficRemaining.value === null ? '本周期用量；未设置流量上限' : `本周期剩余 ${formatBytes(trafficRemaining.value)}`)

const nodeMessage = computed(() => props.node.message?.trim() ?? '')
const nodeMessageTooltip = computed(() => {
  const message = nodeMessage.value
  if (!message)
    return ''
  const updatedAt = props.node.status_updated_at ? `\n更新时间：${formatDateTime(props.node.status_updated_at)}` : ''
  return `${message}${updatedAt}`
})

// 流量状态颜色
const trafficStatus = computed(() => {
  if (!hasTrafficLimit(props.node))
    return 'success'

  if (trafficUsedPercentage.value >= 95)
    return 'error'
  if (trafficUsedPercentage.value >= 80)
    return 'warning'
  if (trafficUsedPercentage.value >= 60)
    return 'info'
  return 'success'
})

const trafficPercentageClass = computed(() => {
  if (!hasTrafficLimit(props.node))
    return 'text-muted-foreground'

  if (trafficUsedPercentage.value >= 95)
    return 'text-destructive'
  if (trafficUsedPercentage.value >= 80)
    return 'text-warning'
  if (trafficUsedPercentage.value >= 60)
    return 'text-warning'
  return 'text-success'
})

// 是否显示金额：未登录且开启「未登录隐藏价格」时不显示价格 / 剩余价值，
// 但在线天数、剩余天数等非金额信息仍然展示
const showPrice = computed(() => appStore.privateFeaturesAllowed || !appStore.hidePriceWhenLoggedOut)

const uptimeDaysText = computed(() => {
  const days = getUptimeDays(props.node.uptime)
  return appStore.lang === 'zh-CN' ? `在线 ${days} 天` : `${days} days online`
})

const priceText = computed(() => {
  const node = props.node
  if (node.price === 0 || !showPrice.value)
    return ''
  return formatPriceWithCycle(node.price, node.billing_cycle, node.currency, appStore.lang)
})

// 第三列：剩余天数（始终） + 剩余价值（仅在允许显示金额时），带图标与相邻列对齐
const remainingInfoTags = computed<RemainingInfoTag[]>(() => {
  const node = props.node
  const lang = appStore.lang
  if (node.price === 0 || isFreePrice(node.price)) {
    return [
      { icon: 'tabler:calendar-stats', text: lang === 'zh-CN' ? '长期' : 'Long-term' },
      { icon: 'tabler:coins', text: lang === 'zh-CN' ? '免费' : 'Free' },
    ]
  }
  const days = getDaysUntilExpired(node.expired_at)
  const status = getExpireStatus(node.expired_at)
  const items: RemainingInfoTag[] = []
  const expiryClass = status === 'expired' || status === 'critical'
    ? 'text-destructive'
    : status === 'warning' ? 'text-warning' : 'text-muted-foreground'

  if (status === 'unknown') {
    items.push({ icon: 'tabler:calendar-stats', text: '-', className: expiryClass })
  }
  else if (status === 'expired') {
    items.push({ icon: 'tabler:calendar-stats', text: lang === 'zh-CN' ? '已过期' : 'Expired', className: expiryClass })
  }
  else if (status === 'long_term') {
    items.push({ icon: 'tabler:calendar-stats', text: lang === 'zh-CN' ? '长期' : 'Long-term', className: expiryClass })
  }
  else if (lang === 'zh-CN') {
    items.push({ icon: 'tabler:calendar-stats', prefix: '剩余', value: String(days), unit: '天', className: expiryClass })
  }
  else {
    items.push({ icon: 'tabler:calendar-stats', prefix: 'left', value: String(days), unit: 'days', className: expiryClass })
  }

  if (showPrice.value) {
    const text = isFreePrice(node.price)
      ? lang === 'zh-CN' ? '无' : 'N/A'
      : formatCurrencyValue(getRemainingValue(node.price, node.billing_cycle, node.expired_at), node.currency)
    items.push({ icon: 'tabler:coins', text })
  }
  return items
})

function getRegionAltText(region: string): string {
  return getRegionDisplayName(region) || getRegionCode(region)
}

function hasRegion(region: string | null | undefined): boolean {
  return Boolean(region?.trim())
}
</script>

<template>
  <CardX
    ref="pingRoot"
    hoverable
    :size="nodeCardXSize"
    header-class="@max-[380px]/card:px-3"
    :content-class="nodeCardContentPaddingClass"
    class="node-card @container/card w-full h-full cursor-pointer border-none shadow-[0_0_0_3px] shadow-transparent transition-all duration-200 rounded-xl"
    :class="[!props.node.online && '!shadow-destructive/30']"
    role="button"
    tabindex="0"
    :aria-label="`查看节点 ${props.node.name} 详情`"
    @click="emit('click')"
    @keydown="handleKeyboardOpen"
  >
    <!-- 头部：在线点 + 名称 -->
    <template #header>
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative size-2.5 shrink-0">
          <span
            class="size-2.5 rounded-full block"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
          <span
            v-if="!props.reduceMotion"
            class="animate-ping absolute inset-0 rounded-full opacity-60"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
        </div>
        <span class="text-sm font-bold flex-1 min-w-0 truncate">{{ props.node.name }}</span>
        <DataTooltip
          v-if="nodeMessage"
          :content="nodeMessageTooltip"
          placement="top"
          as="span"
          class="inline-flex shrink-0 text-amber-500"
          content-class="w-56 whitespace-pre-line leading-snug text-left"
        >
          <Icon icon="tabler:alert-triangle-filled" width="14" height="14" aria-label="节点消息" />
        </DataTooltip>
      </div>
    </template>

    <!-- 头部右侧：OS + 国旗 -->
    <template #header-extra>
      <div class="flex gap-1.5 items-center shrink-0">
        <button
          type="button"
          class="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-slate-500/10 hover:text-amber-500"
          :class="isFavorite && 'text-amber-500'"
          :aria-label="isFavorite ? `取消收藏 ${props.node.name}` : `收藏 ${props.node.name}`"
          :title="isFavorite ? '取消收藏' : '收藏节点'"
          @click.stop="toggleFavorite"
          @keydown.stop
        >
          <Icon :icon="isFavorite ? 'tabler:star-filled' : 'tabler:star'" width="14" height="14" />
        </button>
        <img :src="getOSImage(props.node.os)" :alt="getOSName(props.node.os)" class="size-4">
        <img
          v-if="hasRegion(props.node.region)"
          :src="`/images/flags/${getRegionCode(props.node.region)}.svg`"
          :alt="getRegionAltText(props.node.region)"
          class="size-5 shrink-0"
        >
      </div>
    </template>

    <template #default>
      <div class="flex flex-1 flex-col relative" :class="nodeCardContentClass">
        <!-- 在线天数固定展示，价格独立展示，单行标签保持并列卡片高度一致 -->
        <div data-node-header-meta class="relative z-20 -mt-1 flex min-w-0 items-center justify-between gap-2 @max-[380px]/card:gap-1">
          <div class="flex min-w-0 items-center gap-1.5 @max-[380px]/card:gap-1 whitespace-nowrap">
            <span class="inline-flex h-5 shrink-0 items-center text-[11px] @max-[380px]/card:text-[10px] px-2 @max-[380px]/card:px-1.5 rounded-full bg-slate-500/10 text-muted-foreground leading-none">
              {{ uptimeDaysText }}
            </span>
            <span
              v-if="priceText"
              class="inline-flex h-5 min-w-0 items-center truncate text-[11px] @max-[380px]/card:text-[10px] px-2 @max-[380px]/card:px-1.5 rounded-full bg-slate-500/10 text-muted-foreground leading-none"
            >
              {{ priceText }}
            </span>
          </div>
          <NodeHeaderTags :tags="props.node.tags" :visible="appStore.customTagsVisible" />
        </div>

        <!-- 四项进度条 -->
        <div v-if="isMiniNodeCard" class="grid grid-cols-[3fr_2fr] gap-x-4 gap-y-2">
          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-xs">
                <span class="inline-flex items-center text-sky-500" role="img" title="CPU" aria-label="CPU">
                  <Icon :icon="NODE_METRIC_ICONS.cpu" data-node-metric-icon="cpu" width="12" height="12" aria-hidden="true" />
                </span>
                <span class="tabular-nums font-medium">{{ (props.node.cpu ?? 0).toFixed(1) }}%</span>
              </div>
              <ProgressThin :percentage="props.node.cpu ?? 0" :status="cpuStatus" :height="4" />
            </div>

            <div class="flex flex-col gap-1" :title="swapTooltip">
              <div class="flex justify-between text-xs">
                <span class="inline-flex items-center text-emerald-500" role="img" title="内存" aria-label="内存">
                  <Icon :icon="NODE_METRIC_ICONS.memory" data-node-metric-icon="memory" width="12" height="12" aria-hidden="true" />
                </span>
                <span class="tabular-nums font-medium">{{ memPercentage.toFixed(1) }}%</span>
              </div>
              <ProgressThin :percentage="memPercentage" :status="memStatus" :height="4" />
            </div>

            <div class="col-span-2 text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.ram ?? 0) }} / {{ formatBytes(props.node.mem_total ?? 0) }}
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.traffic" data-node-metric-icon="traffic" width="12" height="12" class="shrink-0 text-violet-500" aria-hidden="true" />
                <span class="truncate" :title="trafficTooltip">{{ trafficLabel }}</span>
              </span>
              <span class="tabular-nums font-medium" :class="trafficPercentageClass">
                {{ trafficPercentageText }}
              </span>
            </div>
            <ProgressThin v-if="hasTrafficLimit(props.node)" :percentage="trafficUsedPercentage" :status="trafficStatus" :height="4" :class="!trafficReady && 'opacity-30'" :aria-hidden="!trafficReady || undefined" />
            <div class="text-[11px] truncate" data-machine-traffic :data-traffic-basis="trafficBasis" :data-traffic-used="trafficUsed" :data-traffic-percentage="percentage" :data-traffic-remaining="trafficRemaining" :title="trafficTooltip" :class="trafficUsedPercentage >= 95 ? 'text-destructive' : 'text-muted-foreground'">
              {{ trafficUsed === null ? trafficLabel : formatBytes(trafficUsed) }}
              <template v-if="hasTrafficLimit(props.node)">
                / {{ formatBytes(props.node.traffic_limit) }}
              </template>
              <template v-else>
                / ∞
              </template>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <!-- CPU -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.cpu" data-node-metric-icon="cpu" width="13" height="13" class="shrink-0 text-sky-500" aria-hidden="true" />
                <span class="truncate">CPU</span>
              </span>
              <span class="tabular-nums font-medium">{{ (props.node.cpu ?? 0).toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="props.node.cpu ?? 0" :status="cpuStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ (props.node.load ?? 0).toFixed(2) }}, {{ (props.node.load5 ?? 0).toFixed(2) }}, {{ (props.node.load15 ?? 0).toFixed(2) }}
            </div>
          </div>

          <!-- 内存 -->
          <div class="flex flex-col gap-1" :title="swapTooltip">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.memory" data-node-metric-icon="memory" width="13" height="13" class="shrink-0 text-emerald-500" aria-hidden="true" />
                <span class="truncate">内存</span>
              </span>
              <span class="tabular-nums font-medium">{{ memPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="memPercentage" :status="memStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.ram ?? 0) }} / {{ formatBytes(props.node.mem_total ?? 0) }}
            </div>
          </div>

          <!-- 硬盘 -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.disk" data-node-metric-icon="disk" width="13" height="13" class="shrink-0 text-orange-500" aria-hidden="true" />
                <span class="truncate">硬盘</span>
              </span>
              <span class="tabular-nums font-medium">{{ diskPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="diskPercentage" :status="diskStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.disk ?? 0) }} / {{ formatBytes(props.node.disk_total ?? 0) }}
            </div>
          </div>

          <!-- 流量（分级颜色） -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.traffic" data-node-metric-icon="traffic" width="13" height="13" class="shrink-0 text-violet-500" aria-hidden="true" />
                <span class="truncate" :title="trafficTooltip">{{ trafficLabel }}</span>
              </span>
              <span class="tabular-nums font-medium" :class="trafficPercentageClass">
                {{ trafficPercentageText }}
              </span>
            </div>
            <ProgressThin v-if="hasTrafficLimit(props.node)" :percentage="trafficUsedPercentage" :status="trafficStatus" :height="4" :class="!trafficReady && 'opacity-30'" :aria-hidden="!trafficReady || undefined" />
            <div class="text-[11px] truncate" data-machine-traffic :data-traffic-basis="trafficBasis" :data-traffic-used="trafficUsed" :data-traffic-percentage="percentage" :data-traffic-remaining="trafficRemaining" :title="trafficTooltip" :class="trafficUsedPercentage >= 95 ? 'text-destructive' : 'text-muted-foreground'">
              {{ trafficUsed === null ? trafficLabel : formatBytes(trafficUsed) }}
              <template v-if="hasTrafficLimit(props.node)">
                / {{ formatBytes(props.node.traffic_limit) }}
              </template>
              <template v-else>
                / ∞
              </template>
            </div>
          </div>
        </div>

        <!-- 中间 5 信息块：开启三网回程双栏时，左侧 2x2 网络概览 + 右侧三网回程 -->
        <div
          v-if="showReturnRouteSplit"
          class="grid grid-cols-2 gap-1.5 items-stretch @max-[315px]/card:grid-cols-1"
        >
          <div class="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-400/20 dark:border-white/10 bg-slate-500/5 text-[11px] shadow-inner backdrop-blur-sm">
            <div class="flex items-center justify-between gap-1 border-b border-slate-400/20 dark:border-white/10 px-2.5 @max-[380px]/card:px-2 py-1.5">
              <span class="font-medium text-foreground/90">网络概览</span>
              <span class="text-[10px] text-muted-foreground/70">{{ appStore.connectionCountsVisible ? '实时' : '状态' }}</span>
            </div>
            <div class="grid flex-1 grid-cols-2">
              <!-- 实时网速 -->
              <div class="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden border-b border-r border-slate-400/15 dark:border-white/8 px-2 @max-[380px]/card:px-1.5 py-1.5">
                <span class="text-[10px] leading-none text-muted-foreground/70">网速</span>
                <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-success flex items-center gap-1 min-w-0">
                  <Icon icon="tabler:chevron-up" width="11" height="11" class="shrink-0" />
                  <span class="truncate min-w-0 tabular-nums">{{ formatBytesPerSecond(props.node.net_out ?? 0) }}</span>
                </div>
                <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-blue-600 dark:text-sky-400 flex items-center gap-1 min-w-0">
                  <Icon icon="tabler:chevron-down" width="11" height="11" class="shrink-0" />
                  <span class="truncate min-w-0 tabular-nums">{{ formatBytesPerSecond(props.node.net_in ?? 0) }}</span>
                </div>
              </div>

              <!-- 总流量 -->
              <div class="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden border-b border-slate-400/15 dark:border-white/8 px-2 @max-[380px]/card:px-1.5 py-1.5">
                <span class="text-[10px] leading-none text-muted-foreground/70">总流量</span>
                <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground flex items-center gap-1 min-w-0" data-machine-direction="up">
                  <Icon icon="tabler:upload" width="11" height="11" class="shrink-0" />
                  <span class="truncate min-w-0 tabular-nums">{{ trafficUp === null ? '—' : formatBytes(trafficUp ?? 0) }}</span>
                </div>
                <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground flex items-center gap-1 min-w-0" data-machine-direction="down">
                  <Icon icon="tabler:download" width="11" height="11" class="shrink-0" />
                  <span class="truncate min-w-0 tabular-nums">{{ trafficDown === null ? '—' : formatBytes(trafficDown ?? 0) }}</span>
                </div>
              </div>

              <!-- 剩余天数+价格 或 负载 -->
              <div
                class="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden px-2 @max-[380px]/card:px-1.5 py-1.5"
                :class="appStore.connectionCountsVisible ? 'border-r border-slate-400/15 dark:border-white/8' : 'col-span-2'"
              >
                <span class="text-[10px] leading-none text-muted-foreground/70">{{ remainingInfoTags.length ? '到期' : '负载' }}</span>
                <template v-if="remainingInfoTags.length">
                  <div
                    v-for="(item, i) in remainingInfoTags" :key="i"
                    class="text-[11px] @max-[380px]/card:text-[10px] leading-tight flex items-center gap-0.5 min-w-0 overflow-hidden"
                    :class="item.className ?? 'text-muted-foreground'"
                  >
                    <Icon :icon="item.icon" width="11" height="11" class="shrink-0" />
                    <span v-if="item.text" class="truncate min-w-0">{{ item.text }}</span>
                    <span v-else class="truncate min-w-0">
                      <span v-if="item.prefix">{{ item.prefix }}</span>
                      <span v-if="item.value" class="tabular-nums">{{ item.value }}</span>
                      <span v-if="item.unit">{{ item.unit }}</span>
                    </span>
                  </div>
                </template>
                <template v-else>
                  <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground truncate tabular-nums">
                    {{ (props.node.load ?? 0).toFixed(2) }}
                  </div>
                  <div class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground truncate tabular-nums">
                    {{ (props.node.load5 ?? 0).toFixed(2) }} / {{ (props.node.load15 ?? 0).toFixed(2) }}
                  </div>
                </template>
              </div>

              <!-- Dual-panel connection counts -->
              <div
                v-if="appStore.connectionCountsVisible"
                data-node-connections
                class="flex min-w-0 flex-col justify-center gap-0.5 overflow-hidden px-2 @max-[380px]/card:px-1.5 py-1.5"
              >
                <span class="text-[10px] leading-none text-muted-foreground/70">连接</span>
                <div v-if="appStore.showTcpConnections" data-node-connection="tcp" class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground flex items-center justify-between gap-1 min-w-0">
                  <span class="shrink-0">TCP</span>
                  <span class="truncate min-w-0 tabular-nums" :title="formatConnectionCount(props.node.connections)">{{ formatConnectionCount(props.node.connections) }}</span>
                </div>
                <div v-if="appStore.showUdpConnections" data-node-connection="udp" class="text-[11px] @max-[380px]/card:text-[10px] leading-tight text-muted-foreground flex items-center justify-between gap-1 min-w-0">
                  <span class="shrink-0">UDP</span>
                  <span class="truncate min-w-0 tabular-nums" :title="formatConnectionCount(props.node.connections_udp)">{{ formatConnectionCount(props.node.connections_udp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Homepage return-route tile -->
          <NodeReturnRouteTile :uuid="props.node.uuid" class="h-full" />
        </div>

        <!-- 三列：网速 / 总流量 / 剩余天数+价格或负载；下一行显示连接数（未开启首页回程双栏时） -->
        <div v-else class="grid gap-1.5" :class="nodeCardMetricGridClass">
          <!-- 实时网速 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <div class="text-[11px] text-success flex items-center gap-1">
              <Icon icon="tabler:chevron-up" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytesPerSecond(props.node.net_out ?? 0) }}</span>
            </div>
            <div class="text-[11px] text-blue-600 dark:text-sky-400 flex items-center gap-1">
              <Icon icon="tabler:chevron-down" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytesPerSecond(props.node.net_in ?? 0) }}</span>
            </div>
          </div>

          <!-- 总流量 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <div class="text-[11px] text-muted-foreground flex items-center gap-1" data-machine-direction="up">
              <Icon icon="tabler:upload" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ trafficUp === null ? '—' : formatBytes(trafficUp ?? 0) }}</span>
            </div>
            <div class="text-[11px] text-muted-foreground flex items-center gap-1" data-machine-direction="down">
              <Icon icon="tabler:download" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ trafficDown === null ? '—' : formatBytes(trafficDown ?? 0) }}</span>
            </div>
          </div>

          <!-- 第三列：有价格显示剩余天数+价格，否则显示负载 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <template v-if="remainingInfoTags.length">
              <div
                v-for="(item, i) in remainingInfoTags" :key="i"
                class="text-[11px] flex items-center gap-0.5"
                :class="item.className ?? 'text-muted-foreground'"
              >
                <Icon :icon="item.icon" width="11" height="11" class="shrink-0" />
                <span v-if="item.text" class="truncate min-w-0 overflow-hidden">{{ item.text }}</span>
                <template v-else>
                  <span v-if="item.prefix" class="shrink-0">{{ item.prefix }}</span>
                  <span v-if="item.value" class="shrink-0 tabular-nums">{{ item.value }}</span>
                  <span v-if="item.unit" class="shrink-0">{{ item.unit }}</span>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ (props.node.load ?? 0).toFixed(2) }}
              </div>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ (props.node.load5 ?? 0).toFixed(2) }} / {{ (props.node.load15 ?? 0).toFixed(2) }}
              </div>
            </template>
          </div>

          <!-- TCP/UDP connection counts -->
          <div
            v-if="appStore.connectionCountsVisible"
            data-node-connections
            class="grid grid-rows-2 gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden"
            :class="nodeCardMetricBoxClass"
          >
            <div v-if="appStore.showTcpConnections" data-node-connection="tcp" class="text-[11px] text-muted-foreground flex items-center justify-between gap-1">
              <span class="shrink-0">TCP</span>
              <span class="truncate min-w-0 tabular-nums" :title="formatConnectionCount(props.node.connections)">{{ formatConnectionCount(props.node.connections) }}</span>
            </div>
            <div v-if="appStore.showUdpConnections" data-node-connection="udp" class="text-[11px] text-muted-foreground flex items-center justify-between gap-1">
              <span class="shrink-0">UDP</span>
              <span class="truncate min-w-0 tabular-nums" :title="formatConnectionCount(props.node.connections_udp)">{{ formatConnectionCount(props.node.connections_udp) }}</span>
            </div>
          </div>
          <!-- /TCP/UDP connection counts -->
        </div>

        <!-- 联通 / 电信 / 移动三网延迟 + 丢包 -->
        <div class="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            data-node-ping-bars="latency"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardCarrierPingPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :aria-label="`${props.node.name} 三网延迟监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="text-muted-foreground">延迟</span>
              <span class="text-[10px] text-muted-foreground/70">{{ isTransit ? (appStore.lang === 'zh-CN' ? '中转估算' : 'Transit estimate') : '三网' }}</span>
            </div>

            <div class="grid min-h-0 flex-1 grid-rows-3 gap-1">
              <div
                v-for="carrier in carrierDisplays"
                :key="`${carrier.key}-latency`"
                :data-carrier-ping="`${carrier.key}-latency`"
                class="flex min-h-0 min-w-0 flex-col gap-[2px]"
                :title="carrier.latencyTooltip"
              >
                <div class="flex min-w-0 items-center justify-between gap-1 text-[10px] leading-none">
                  <span class="flex min-w-0 items-center gap-1 text-muted-foreground">
                    <span class="size-1.5 shrink-0 rounded-full" :class="carrier.dotClass" />
                    <span class="truncate">{{ carrier.label }}</span>
                  </span>
                  <span class="shrink-0 tabular-nums font-medium">{{ carrier.latencyDisplay }}</span>
                </div>
                <div v-if="appStore.pingDisplayStyle === 'line'" class="h-1.5 min-w-0">
                  <PingHistoryLine :values="carrier.latencyHistory" :label="carrier.latencyTooltip" />
                </div>
                <div
                  v-else
                  class="grid h-1.5 min-w-0 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
                  :style="{ gridTemplateColumns: `repeat(${carrier.latencyBars.length}, minmax(0, 1fr))` }"
                >
                  <DataTooltip
                    v-for="bar in carrier.latencyBars" :key="bar.key"
                    placement="top" :content="bar.tooltip" class="h-full w-full"
                  >
                    <span
                      class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                      :class="bar.className"
                    />
                  </DataTooltip>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            data-node-ping-bars="loss"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardCarrierPingPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :aria-label="`${props.node.name} 三网丢包监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="text-muted-foreground">丢包</span>
              <span class="text-[10px] text-muted-foreground/70">{{ isTransit ? (appStore.lang === 'zh-CN' ? '中转估算' : 'Transit estimate') : '三网' }}</span>
            </div>

            <div class="grid min-h-0 flex-1 grid-rows-3 gap-1">
              <div
                v-for="carrier in carrierDisplays"
                :key="`${carrier.key}-loss`"
                :data-carrier-ping="`${carrier.key}-loss`"
                class="flex min-h-0 min-w-0 flex-col gap-[2px]"
                :title="carrier.lossTooltip"
              >
                <div class="flex min-w-0 items-center justify-between gap-1 text-[10px] leading-none">
                  <span class="flex min-w-0 items-center gap-1 text-muted-foreground">
                    <span class="size-1.5 shrink-0 rounded-full" :class="carrier.dotClass" />
                    <span class="truncate">{{ carrier.label }}</span>
                  </span>
                  <span class="shrink-0 tabular-nums font-medium">{{ carrier.lossDisplay }}</span>
                </div>
                <div v-if="appStore.pingDisplayStyle === 'line'" class="h-1.5 min-w-0">
                  <PingHistoryLine :values="carrier.lossHistory" :label="carrier.lossTooltip" />
                </div>
                <div
                  v-else
                  class="grid h-1.5 min-w-0 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
                  :style="{ gridTemplateColumns: `repeat(${carrier.lossBars.length}, minmax(0, 1fr))` }"
                >
                  <DataTooltip
                    v-for="bar in carrier.lossBars" :key="bar.key"
                    placement="top" :content="bar.tooltip" class="h-full w-full"
                  >
                    <span
                      class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                      :class="bar.className"
                    />
                  </DataTooltip>
                </div>
              </div>
            </div>
          </button>
        </div>

        <NodeReturnRoutes v-if="!appStore.returnRouteHomeTileEnabled" :uuid="props.node.uuid" />

        <!-- 离线遮罩 -->
        <div
          v-if="!props.node.online"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-white/20 dark:bg-black/20 backdrop-blur-[2px]"
        >
          <div class="text-sm font-semibold text-destructive">
            离线
          </div>
          <div class="text-[11px] text-muted-foreground mt-1">
            {{ offlineTime }}
          </div>
        </div>
      </div>
    </template>
  </CardX>
</template>

<style scoped>
.node-card {
  position: relative;
  overflow: hidden;
}
</style>
