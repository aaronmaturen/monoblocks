<script setup lang="ts">
import { useToolStore, type Tool } from '../stores/tools'
import { useHistoryStore } from '../stores/history'
import { useAppStore } from '../stores/app'

const toolStore = useToolStore()
const historyStore = useHistoryStore()
const appStore = useAppStore()

const tools: Array<{ id: Tool; label: string }> = [
  { id: 'pan', label: 'Pan' },
  { id: 'select', label: 'Select' },
  { id: 'brush', label: 'Brush' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'line', label: 'Line' },
  { id: 'text', label: 'Text' },
  { id: 'eraser', label: 'Eraser' },
]

const historyTools: Array<{ id: Tool; label: string }> = [
  { id: 'undo', label: 'Undo' },
  { id: 'redo', label: 'Redo' },
  { id: 'recenter', label: 'Recenter' },
  { id: 'reset', label: 'Reset Canvas' },
]

// Need to emit event to parent for recenter functionality
const emit = defineEmits<{
  recenter: []
  undo: []
  redo: []
  reset: []
  about: []
  export: []
  copy: []
  share: []
}>()

const selectTool = (toolId: Tool) => {
  // Handle immediate action tools
  if (toolId === 'undo') {
    emit('undo')
    return // Don't change tool
  } else if (toolId === 'redo') {
    emit('redo')
    return // Don't change tool
  } else if (toolId === 'recenter') {
    emit('recenter')
    return // Don't change tool
  } else if (toolId === 'reset') {
    console.log('[ToolBar] Reset button clicked, emitting reset event')
    emit('reset')
    return // Don't change tool
  }

  // Set the selected tool
  toolStore.setTool(toolId)
}
</script>

<template>
  <div class="floating-toolbar">
    <div class="toolbar-container">
      <!-- History Tools -->
      <button
        v-for="tool in historyTools"
        :key="tool.id"
        :class="[
          'tool-button',
          'history-button',
          {
            active: toolStore.currentTool === tool.id,
            disabled:
              (tool.id === 'undo' && !historyStore.canUndo()) ||
              (tool.id === 'redo' && !historyStore.canRedo()),
          },
        ]"
        @click="selectTool(tool.id)"
        :title="tool.label"
        :disabled="
          (tool.id === 'undo' && !historyStore.canUndo()) ||
          (tool.id === 'redo' && !historyStore.canRedo())
        "
      >
        <!-- Undo Icon -->
        <i v-if="tool.id === 'undo'" class="fa-thumbprint fa-light fa-undo"></i>

        <!-- Redo Icon -->
        <i v-if="tool.id === 'redo'" class="fa-thumbprint fa-light fa-redo"></i>

        <!-- Recenter Icon -->
        <i v-if="tool.id === 'recenter'" class="fa-thumbprint fa-light fa-house"></i>

        <!-- Reset Canvas Icon -->
        <i v-if="tool.id === 'reset'" class="fa-thumbprint fa-light fa-file"></i>
      </button>

      <!-- Separator -->
      <div class="separator"></div>

      <!-- Main Tools -->
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="['tool-button', { active: toolStore.currentTool === tool.id }]"
        @click="selectTool(tool.id)"
        :title="tool.label"
      >
        <!-- Pan Icon -->
        <i v-if="tool.id === 'pan'" class="fa-thumbprint fa-light fa-hand"></i>

        <!-- Brush Icon -->
        <i v-if="tool.id === 'brush'" class="fa-thumbprint fa-light fa-pencil"></i>

        <!-- Rectangle Icon -->
        <i v-if="tool.id === 'rectangle'" class="fa-thumbprint fa-light fa-rectangle"></i>

        <!-- Diamond Icon -->
        <i v-if="tool.id === 'diamond'" class="fa-duotone fa-solid fa-rhombus"></i>

        <!-- Line Icon -->
        <i v-if="tool.id === 'line'" class="fa-thumbprint fa-light fa-arrow-right"></i>

        <!-- Text Icon -->
        <i v-if="tool.id === 'text'" class="fa-thumbprint fa-light fa-font"></i>

        <!-- Select Icon -->
        <i v-if="tool.id === 'select'" class="fa-thumbprint fa-light fa-location-arrow"></i>

        <!-- Eraser Icon -->
        <i v-if="tool.id === 'eraser'" class="fa-thumbprint fa-light fa-wand-magic-sparkles"></i>
      </button>

      <!-- Separator -->
      <div class="separator"></div>

      <!-- Copy Button -->
      <button class="tool-button" @click="emit('copy')" title="Copy to Clipboard">
        <i class="fa-thumbprint fa-light fa-clone"></i>
      </button>

      <!-- Share Button -->
      <button class="tool-button" @click="emit('share')" title="Share Link">
        <i class="fa-thumbprint fa-light fa-share-nodes"></i>
      </button>

      <!-- Export Button -->
      <button class="tool-button" @click="emit('export')" title="Export to PNG">
        <i class="fa-thumbprint fa-light fa-arrow-down-to-line"></i>
      </button>

      <!-- Separator -->
      <div class="separator"></div>

      <!-- Dark Mode Toggle -->
      <button
        class="tool-button"
        @click="appStore.toggleDarkMode()"
        :title="appStore.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <i class="fa-thumbprint fa-light fa-circle-half-stroke"></i>
      </button>

      <!-- About Button -->
      <button class="tool-button" @click="emit('about')" title="About MonoBlocks Professional">
        <i class="fa-thumbprint fa-light fa-question"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.floating-toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: auto;
}

.toolbar-container {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  backdrop-filter: var(--backdrop-blur);
  padding: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.tool-button {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  position: relative;
}

/* Fun color palette for icons */
.tool-button i {
  transition: all 0.2s ease;
}

/* History Tools - Cool Blues & Purples */
.tool-button:has(.fa-undo) i {
  color: var(--icon-undo);
}
.tool-button:has(.fa-redo) i {
  color: var(--icon-redo);
}
.tool-button:has(.fa-house) i {
  color: var(--icon-recenter);
}
.tool-button:has(.fa-file) i {
  color: var(--icon-reset);
}

/* Navigation & Selection - Warm Greens */
.tool-button:has(.fa-hand) i {
  color: var(--icon-pan);
}
.tool-button:has(.fa-location-arrow) i {
  color: var(--icon-select);
}

/* Drawing Tools - Vibrant Colors */
.tool-button:has(.fa-pencil) i {
  color: var(--icon-brush);
}
.tool-button:has(.fa-rectangle) i {
  color: var(--icon-rectangle);
}
.tool-button:has(.fa-diamond) i {
  color: var(--icon-diamond);
}
.tool-button:has(.fa-arrow-right) i {
  color: var(--icon-line);
}
.tool-button:has(.fa-font) i {
  color: var(--icon-text);
}

/* Special Tools - Bright Accents */
.tool-button:has(.fa-wand-magic-sparkles) i {
  color: var(--icon-eraser);
}

/* Utility Icons */
.tool-button:has(.fa-grid) i {
  color: #a855f7; /* Purple */
}
.tool-button:has(.fa-clone) i {
  color: #10b981; /* Emerald */
}
.tool-button:has(.fa-share-nodes) i {
  color: #8b5cf6; /* Purple */
}
.tool-button:has(.fa-arrow-down-to-line) i {
  color: #14b8a6; /* Teal */
}
.tool-button:has(.fa-circle-half-stroke) i {
  color: #f59e0b; /* Amber */
}
.tool-button:has(.fa-question) i {
  color: #6366f1; /* Indigo */
}

.tool-button:hover {
  background: var(--bg-hover);
  transform: scale(1.05);
}

.tool-button:hover i {
  filter: brightness(1.2) saturate(1.3);
}

.tool-button.active {
  background: var(--bg-active);
  transform: scale(1.05);
}

.tool-button.active i {
  color: var(--text-white) !important;
  filter: brightness(1) saturate(1);
}

.tool-button.active:hover {
  background: var(--bg-active-hover);
}

.tool-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.separator {
  width: 1px;
  height: 32px;
  background: var(--border-light);
  margin: 0 4px;
}

/* Smooth transitions */
.tool-button i {
  transition: transform 0.2s ease;
}

.tool-button:active i {
  transform: scale(0.95);
}
</style>
