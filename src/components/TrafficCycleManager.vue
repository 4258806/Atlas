<script setup lang="ts">
import TrafficCycleRow from '@/components/TrafficCycleRow.vue'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'

const app = useAppStore()
const nodes = useNodesStore()
</script>

<template>
  <section aria-label="流量周期" data-traffic-cycle-manager class="space-y-3 rounded-lg border border-border/60 p-3">
    <h3 class="font-semibold">
      流量周期
    </h3>
    <p class="text-xs text-muted-foreground">
      每台独立保存时区、每月 1–31 日和时分。IANA 时区自动处理夏令时；固定偏移不会随季节变化。短月份取最后一天，下月恢复原日期；夏令时跳过的时刻按实际时差顺延，重复时刻取第一次。区间左闭右开，不删除累计计数器或历史。历史精度不能覆盖重置分钟时显示数据不足，不估算账单。
    </p>
    <p v-if="app.trafficCycleConfig.error" role="alert" class="text-sm text-destructive">
      {{ app.trafficCycleConfig.error }}
    </p>
    <div class="max-w-full overflow-x-auto">
      <table class="w-full min-w-[850px] text-left text-sm">
        <thead>
          <tr>
            <th class="px-2 py-2">
              节点 / UUID
            </th><th class="px-2 py-2">
              独立重置计划
            </th><th class="px-2 py-2">
              当前计费周期起止时间
            </th><th class="px-2 py-2">
              下次重置日期
            </th><th class="px-2 py-2">
              本周期已使用流量
            </th><th class="px-2 py-2">
              逐台保存
            </th>
          </tr>
        </thead>
        <tbody><TrafficCycleRow v-for="node in nodes.nodes" :key="node.uuid" :node="node" /></tbody>
      </table>
    </div>
    <p v-if="!nodes.nodes.length" class="text-xs text-muted-foreground">
      暂无可管理节点。
    </p>
  </section>
</template>
