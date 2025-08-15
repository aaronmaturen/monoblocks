<template>
  <div v-if="isVisible" class="text-input-overlay" :style="overlayStyle">
    <input
      ref="inputRef"
      v-model="text"
      class="text-input"
      :style="inputStyle"
      @keydown="handleKeyDown"
      @input="handleInput"
      placeholder="Type here..."
      autofocus
    />
    <div class="text-preview" :style="previewStyle">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useToolStore } from '@/stores/tools'
import { useColorStore } from '@/stores/colors'

const toolStore = useToolStore()
const colorStore = useColorStore()

const isVisible = ref(false)
const text = ref('')
const position = ref({ x: 0, y: 0 })
const gridSize = 16
const inputRef = ref<HTMLInputElement>()

const emit = defineEmits<{
  confirm: [text: string, x: number, y: number]
  cancel: []
}>()

const overlayStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}))

const inputStyle = computed(() => ({
  color: colorStore.selectedColor.hex,
  fontSize: `${gridSize * 0.8}px`,
  fontFamily: 'monospace',
  width: `${Math.max(100, text.value.length * gridSize * 0.6)}px`,
}))

const previewStyle = computed(() => ({
  color: colorStore.selectedColor.hex,
  fontSize: `${gridSize * 0.8}px`,
  fontFamily: 'monospace',
}))

const show = (x: number, y: number) => {
  position.value = { x, y }
  text.value = ''
  isVisible.value = true
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const hide = () => {
  isVisible.value = false
  text.value = ''
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (text.value.trim()) {
      emit('confirm', text.value, position.value.x, position.value.y)
      hide()
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
    hide()
  }
}

const handleInput = () => {
  // Auto-resize based on text length
}

// Watch for tool changes
watch(() => toolStore.currentTool, (newTool) => {
  if (newTool !== 'text' && isVisible.value) {
    emit('cancel')
    hide()
  }
})

defineExpose({
  show,
  hide
})
</script>

<style scoped>
.text-input-overlay {
  position: fixed;
  z-index: 1001;
  pointer-events: auto;
}

.text-input {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #007acc;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  min-width: 100px;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.text-preview {
  position: absolute;
  top: -25px;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  display: none; /* Hidden for now, can be enabled if needed */
}

.text-input::placeholder {
  color: #999;
  font-style: italic;
}

.text-input:focus {
  border-color: #005a9e;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>