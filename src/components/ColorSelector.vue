<script setup lang="ts">
import { useColorStore, type Color } from '../stores/colors'
import { useToolStore } from '../stores/tools'
import { useShapesStore } from '../stores/shapes'

const colorStore = useColorStore()
const toolStore = useToolStore()
const shapesStore = useShapesStore()

const selectColor = (color: Color) => {
  colorStore.setSelectedColor(color)
  
  // If we're editing a shape's color, update it
  if (toolStore.editingShapeId) {
    shapesStore.updateShapeColor(toolStore.editingShapeId, color.hex)
    toolStore.setEditingShapeId(null) // Clear the editing state
  }
  
  colorStore.hideColorSelector()
  // Return to previous tool after selecting color
  toolStore.returnToPreviousTool()
}

const closeColorSelector = () => {
  // Clear editing state if closing without selecting
  if (toolStore.editingShapeId) {
    toolStore.setEditingShapeId(null)
  }
  
  colorStore.hideColorSelector()
  // Return to previous tool when closing without selecting
  toolStore.returnToPreviousTool()
}
</script>

<template>
  <div v-if="colorStore.isColorSelectorVisible" class="color-selector">
    <div class="color-palette">
      <div class="palette-header">
        <span>4-bit Color Palette</span>
        <button @click="closeColorSelector()" class="close-button">×</button>
      </div>
      <div class="color-grid">
        <button
          v-for="color in colorStore.colors"
          :key="color.hex"
          :class="['color-swatch', { 
            selected: colorStore.selectedColor.hex === color.hex 
          }]"
          :style="{ backgroundColor: color.hex }"
          @click="selectColor(color)"
          :title="color.name"
        >
          <div v-if="colorStore.selectedColor.hex === color.hex" class="selected-indicator">✓</div>
        </button>
      </div>
      <div class="selected-color-info">
        <div class="selected-color-preview" :style="{ backgroundColor: colorStore.selectedColor.hex }"></div>
        <div class="selected-color-details">
          <div class="color-name">{{ colorStore.selectedColor.name }}</div>
          <div class="color-hex">{{ colorStore.selectedColor.hex }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-selector {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
  pointer-events: auto;
}

.color-palette {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-medium);
  backdrop-filter: var(--backdrop-blur);
  padding: 16px;
  min-width: 200px;
}

.palette-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-swatch-border);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.color-swatch:hover {
  border-color: var(--color-swatch-border-hover);
  transform: scale(1.1);
}

.color-swatch.selected {
  border-color: var(--border-active);
  border-width: 3px;
  transform: scale(1.05);
}

.selected-indicator {
  color: var(--text-white);
  font-weight: bold;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.7);
  font-size: 12px;
}

.selected-color-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}

.selected-color-preview {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-swatch-border);
  border-radius: 4px;
}

.selected-color-details {
  flex: 1;
}

.color-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.color-hex {
  font-family: var(--mono-font-family);
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
}
</style>