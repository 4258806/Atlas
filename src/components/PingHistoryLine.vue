<script setup lang="ts">
import { computed } from 'vue'
import { pingLineSegments } from '@/utils/displayPreferences'

const props = defineProps<{ values: Array<number | null>, label: string }>()
const segments = computed(() => pingLineSegments(props.values))
</script>

<template>
  <svg data-ping-line viewBox="0 0 100 12" preserveAspectRatio="none" role="img" :aria-label="`${label}${segments.length ? '' : ' · 无采样数据'}`" class="block h-full w-full overflow-visible text-emerald-500">
    <title>{{ label }}{{ segments.length ? '' : ' · 无采样数据' }}</title>
    <template v-for="(points, i) in segments" :key="i">
      <circle v-if="!points.includes(' ')" :cx="points.split(',')[0]" :cy="points.split(',')[1]" r="1" fill="currentColor" />
      <polyline v-else :points="points" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    </template>
  </svg>
</template>
