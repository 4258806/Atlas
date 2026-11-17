<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { CARRIER_NAMES, carrierOrder } from '@/utils/displayPreferences'

const props = defineProps<{ modelValue: string, disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const dragged = ref<number | null>(null)
const grabbed = ref<number | null>(null)
function move(from: number, to: number) {
  if (props.disabled || from < 0 || from > 2 || to < 0 || to > 2 || from === to)
    return
  const order = carrierOrder(props.modelValue)
  order.splice(to, 0, order.splice(from, 1)[0]!)
  emit('update:modelValue', order.join(','))
}
function drop(index: number) {
  if (dragged.value !== null)
    move(dragged.value, index)
  dragged.value = null
}
function keydown(event: KeyboardEvent, index: number) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    grabbed.value = grabbed.value === index ? null : index
  }
  if (event.key === 'Escape') {
    event.stopPropagation()
    event.preventDefault()
    grabbed.value = null
  }
  if (grabbed.value === index && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    const target = index + (event.key === 'ArrowUp' ? -1 : 1)
    if (target >= 0 && target <= 2) {
      move(index, target)
      grabbed.value = target
    }
  }
}
</script>

<template>
  <div data-carrier-order-editor class="space-y-2">
    <p class="text-xs text-muted-foreground">
      拖动行调整；触屏可用上移／下移。键盘空格选取，再用方向键移动；保存本分类后全站生效。
    </p>
    <div v-for="(key, i) in carrierOrder(modelValue)" :key="key" :data-order-carrier="key" :draggable="!disabled" class="flex items-center gap-2 rounded-md border border-border px-3 py-2" @dragstart="dragged = i" @dragend="dragged = null" @dragover.prevent @drop.prevent="drop(i)">
      <button type="button" :aria-label="`拖动${CARRIER_NAMES[key]}排序`" :aria-pressed="grabbed === i" :disabled="disabled" class="cursor-grab rounded px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring" @keydown="keydown($event, i)">
        ⠿ {{ CARRIER_NAMES[key] }}
      </button>
      <span class="ml-auto flex gap-1">
        <Button type="button" size="sm" variant="outline" :aria-label="`上移${CARRIER_NAMES[key]}`" :disabled="disabled || i === 0" @click="move(i, i - 1)">↑</Button>
        <Button type="button" size="sm" variant="outline" :aria-label="`下移${CARRIER_NAMES[key]}`" :disabled="disabled || i === 2" @click="move(i, i + 1)">↓</Button>
      </span>
    </div>
    <span role="status" class="text-xs text-muted-foreground">{{ carrierOrder(modelValue).map(k => CARRIER_NAMES[k]).join(' → ') }}</span>
  </div>
</template>
