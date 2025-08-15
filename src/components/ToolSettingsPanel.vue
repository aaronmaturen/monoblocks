<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useToolStore, RECTANGLE_BORDER_STYLES } from '../stores/tools'
import { useLayersStore } from '../stores/layers'
import { useColorStore } from '../stores/colors'

const toolStore = useToolStore()
const layersStore = useLayersStore()
const colorStore = useColorStore()

const isCollapsed = ref(false)
const selectedShape = computed(() => layersStore.getSelectedShape())

// Load collapsed state from localStorage
onMounted(() => {
  const savedState = localStorage.getItem('monoblocks-panel-collapsed')
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true'
  }
})

// Save collapsed state to localStorage when it changes
watch(isCollapsed, (newValue) => {
  localStorage.setItem('monoblocks-panel-collapsed', String(newValue))
})

const toolDisplayNames: Record<string, string> = {
  pan: 'Pan Tool',
  brush: 'Brush Tool',
  rectangle: 'Rectangle Tool',
  line: 'Line Tool',
  text: 'Text Tool',
  select: 'Select Tool',
  eraser: 'Eraser Tool',
  eyedropper: 'Eyedropper Tool',
  undo: 'Undo',
  redo: 'Redo',
  recenter: 'Recenter View'
}

const currentToolName = computed(() => {
  // If we have a selected shape in select mode, show the shape's tool name
  if (toolStore.currentTool === 'select' && selectedShape.value) {
    return toolDisplayNames[selectedShape.value.type] || selectedShape.value.type
  }
  return toolDisplayNames[toolStore.currentTool] || toolStore.currentTool
})

// Determine which tool panel to show - either current tool or selected shape's type
const activeToolType = computed(() => {
  if (toolStore.currentTool === 'select' && selectedShape.value) {
    return selectedShape.value.type
  }
  return toolStore.currentTool
})

const hasSettings = computed(() => {
  return ['brush', 'rectangle', 'line', 'text'].includes(activeToolType.value)
})

// Hide the entire panel for pan, eraser, eyedropper, and select tools (unless select has a selected shape)
const showPanel = computed(() => {
  if (toolStore.currentTool === 'pan') return false
  if (toolStore.currentTool === 'eraser') return false
  if (toolStore.currentTool === 'eyedropper') return false
  if (toolStore.currentTool === 'select' && !selectedShape.value) return false
  return true
})

// Helper function to show border preview
const getBorderPreview = () => {
  const borderStyle = toolStore.rectangleBorderStyle || 'single'
  const style = RECTANGLE_BORDER_STYLES[borderStyle]
  if (!style) return '┌─┐\n│ │\n└─┘' // Fallback preview
  const fillChar = toolStore.rectangleFillChar || ' '
  return `${style.topLeft}${style.horizontal}${style.horizontal}${style.horizontal}${style.topRight}
${style.vertical}${fillChar}${fillChar}${fillChar}${style.vertical}
${style.vertical}${fillChar}${fillChar}${fillChar}${style.vertical}
${style.bottomLeft}${style.horizontal}${style.horizontal}${style.horizontal}${style.bottomRight}`
}

// Handle color selection for selected shape
const openColorPaletteForShape = () => {
  if (selectedShape.value) {
    // Store the current shape ID so we know what to update
    if (toolStore.setEditingShapeId) {
      toolStore.setEditingShapeId(selectedShape.value.id)
    }
    // Open the color selector
    if (colorStore.toggleColorSelector) {
      colorStore.toggleColorSelector()
    }
  }
}
</script>

<template>
  <div v-if="showPanel" :class="['tool-settings-panel', { collapsed: isCollapsed }]">
    <div class="panel-header" @click="isCollapsed = !isCollapsed">
      <span class="panel-title">Tool Settings</span>
      <button class="collapse-btn" :title="isCollapsed ? 'Expand panel' : 'Collapse panel'">
        <i :class="['fa-thumbprint', 'fa-light', isCollapsed ? 'fa-plus' : 'fa-minus']"></i>
      </button>
    </div>
    
    <Transition name="panel-slide">
      <div v-if="!isCollapsed" class="panel-content">
      <!-- Tool-specific settings -->
      <div v-if="hasSettings" class="settings-section">
        <!-- Brush Tool Settings -->
        <div v-if="activeToolType === 'brush'" class="tool-settings">
          <div class="section-label">{{ selectedShape ? 'Selected Brush' : 'Brush Settings' }}</div>
          
          <!-- Name field for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Name</label>
            <input 
              type="text" 
              :value="selectedShape.name" 
              @input="(e) => layersStore.updateShapeName(selectedShape.id, (e.target as HTMLInputElement).value)"
              class="text-input" 
            />
          </div>
          
          <div class="setting-item">
            <label>Character</label>
            <template v-if="selectedShape">
              <input 
                type="text" 
                class="fill-input" 
                :value="selectedShape.toolSettings?.character || '█'"
                @input="(e) => layersStore.updateShapeSettings(selectedShape.id, { character: (e.target as HTMLInputElement).value })"
                placeholder="Drawing character"
                maxlength="1"
              />
            </template>
            <template v-else>
              <button 
                class="character-selector-btn"
                @click="toolStore.toggleCharacterPalette()"
                :title="`Current character: ${toolStore.selectedCharacter}`"
              >
                <span class="character-display">{{ toolStore.selectedCharacter }}</span>
                <i class="fa-thumbprint fa-light fa-chevron-down"></i>
              </button>
            </template>
          </div>
          
          <div class="setting-item">
            <label>Color</label>
            <div 
              class="color-preview" 
              :style="{ backgroundColor: selectedShape ? selectedShape.color : colorStore.selectedColor.hex }"
              @click="selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()"
              title="Click to change color"
            >
              {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
            </div>
          </div>
          
          <!-- Shape info for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Size</label>
            <div class="info-text">{{ selectedShape.data.size }} cells</div>
          </div>
        </div>

        <!-- Rectangle Tool Settings -->
        <div v-if="activeToolType === 'rectangle'" class="tool-settings">
          <div class="section-label">{{ selectedShape ? 'Selected Rectangle' : 'Rectangle Settings' }}</div>
          
          <!-- Name field for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Name</label>
            <input 
              type="text" 
              :value="selectedShape.name" 
              @input="(e) => layersStore.updateShapeName(selectedShape.id, (e.target as HTMLInputElement).value)"
              class="text-input" 
            />
          </div>
          
          <div class="setting-item">
            <label>Border Style</label>
            <select 
              class="select-input" 
              :value="selectedShape ? (selectedShape.toolSettings?.borderStyle || 'single') : (toolStore.rectangleBorderStyle || 'single')"
              @change="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { borderStyle: (e.target as HTMLSelectElement).value }) : toolStore.setRectangleBorderStyle && toolStore.setRectangleBorderStyle((e.target as HTMLSelectElement).value)"
            >
              <option value="single">Single Line</option>
              <option value="double">Double Line</option>
              <option value="thick">Thick Line</option>
              <option value="rounded">Rounded</option>
              <option value="dashed">Dashed</option>
              <option value="solid">Solid Block</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Fill Character</label>
            <div class="fill-preset-options">
              <button 
                class="fill-preset-btn"
                @click="selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: '' }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar('')"
                :class="{ active: selectedShape ? (!selectedShape.toolSettings?.fillChar || selectedShape.toolSettings?.fillChar === '') : (!toolStore.rectangleFillChar || toolStore.rectangleFillChar === '') }"
                title="No fill (empty)"
              >
                <span style="font-family: monospace;">&nbsp;</span>
              </button>
              <button 
                class="fill-preset-btn"
                @click="selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: '░' }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar('░')"
                :class="{ active: selectedShape ? selectedShape.toolSettings?.fillChar === '░' : toolStore.rectangleFillChar === '░' }"
                title="Light shade (25%)"
              >
                <span style="font-family: monospace;">░</span>
              </button>
              <button 
                class="fill-preset-btn"
                @click="selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: '▒' }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar('▒')"
                :class="{ active: selectedShape ? selectedShape.toolSettings?.fillChar === '▒' : toolStore.rectangleFillChar === '▒' }"
                title="Medium shade (50%)"
              >
                <span style="font-family: monospace;">▒</span>
              </button>
              <button 
                class="fill-preset-btn"
                @click="selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: '▓' }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar('▓')"
                :class="{ active: selectedShape ? selectedShape.toolSettings?.fillChar === '▓' : toolStore.rectangleFillChar === '▓' }"
                title="Dark shade (75%)"
              >
                <span style="font-family: monospace;">▓</span>
              </button>
              <button 
                class="fill-preset-btn"
                @click="selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: '█' }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar('█')"
                :class="{ active: selectedShape ? selectedShape.toolSettings?.fillChar === '█' : toolStore.rectangleFillChar === '█' }"
                title="Solid (100%)"
              >
                <span style="font-family: monospace;">█</span>
              </button>
            </div>
            <div class="fill-custom-input">
              <input 
                type="text" 
                class="fill-input" 
                :value="selectedShape ? (selectedShape.toolSettings?.fillChar || '') : (toolStore.rectangleFillChar || '')"
                @input="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { fillChar: (e.target as HTMLInputElement).value }) : toolStore.setRectangleFillChar && toolStore.setRectangleFillChar((e.target as HTMLInputElement).value)"
                placeholder="Custom character (or leave empty)"
                maxlength="1"
              />
            </div>
          </div>
          <div class="setting-item">
            <label>Shadow</label>
            <div class="checkbox-wrapper">
              <input 
                type="checkbox" 
                class="checkbox-input" 
                :checked="selectedShape ? (selectedShape.toolSettings?.shadow || false) : toolStore.rectangleShadow"
                @change="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { shadow: (e.target as HTMLInputElement).checked }) : toolStore.setRectangleShadow && toolStore.setRectangleShadow((e.target as HTMLInputElement).checked)"
              />
              <span class="checkbox-label">{{ selectedShape ? 'Has drop shadow' : 'Add drop shadow' }}</span>
            </div>
          </div>
          <div v-if="!selectedShape" class="setting-item">
            <label>Preview</label>
            <div class="border-preview">
              <pre class="preview-box">{{ getBorderPreview() }}</pre>
            </div>
          </div>
          <div class="setting-item">
            <label>Color</label>
            <div 
              class="color-preview" 
              :style="{ backgroundColor: selectedShape ? selectedShape.color : colorStore.selectedColor.hex }"
              @click="selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()"
              title="Click to change color"
            >
              {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
            </div>
          </div>
          
          <!-- Shape info for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Size</label>
            <div class="info-text">{{ selectedShape.data.size }} cells</div>
          </div>
        </div>

        <!-- Line Tool Settings -->
        <div v-if="activeToolType === 'line'" class="tool-settings">
          <div class="section-label">{{ selectedShape ? 'Selected Line' : 'Line Settings' }}</div>
          
          <!-- Name field for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Name</label>
            <input 
              type="text" 
              :value="selectedShape.name" 
              @input="(e) => layersStore.updateShapeName(selectedShape.id, (e.target as HTMLInputElement).value)"
              class="text-input" 
            />
          </div>
          <div class="setting-item">
            <label>Line Style</label>
            <select 
              class="select-input" 
              :value="selectedShape ? (selectedShape.toolSettings?.lineStyle || 'single') : (toolStore.lineStyle || 'single')"
              @change="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { lineStyle: (e.target as HTMLSelectElement).value }) : toolStore.setLineStyle && toolStore.setLineStyle((e.target as HTMLSelectElement).value)"
            >
              <option value="single">Single Line</option>
              <option value="double">Double Line</option>
              <option value="thick">Thick Line</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="arrow">Arrow</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Start Style</label>
            <select 
              class="select-input" 
              :value="selectedShape ? (selectedShape.toolSettings?.lineStartStyle || 'none') : (toolStore.lineStartStyle || 'none')"
              @change="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { lineStartStyle: (e.target as HTMLSelectElement).value }) : toolStore.setLineStartStyle && toolStore.setLineStartStyle((e.target as HTMLSelectElement).value)"
            >
              <option value="none">None</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </div>
          <div class="setting-item">
            <label>End Style</label>
            <select 
              class="select-input" 
              :value="selectedShape ? (selectedShape.toolSettings?.lineEndStyle || 'arrow') : (toolStore.lineEndStyle || 'arrow')"
              @change="(e) => selectedShape ? layersStore.updateShapeSettings(selectedShape.id, { lineEndStyle: (e.target as HTMLSelectElement).value }) : toolStore.setLineEndStyle && toolStore.setLineEndStyle((e.target as HTMLSelectElement).value)"
            >
              <option value="none">None</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Color</label>
            <div 
              class="color-preview" 
              :style="{ backgroundColor: selectedShape ? selectedShape.color : colorStore.selectedColor.hex }"
              @click="selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()"
              title="Click to change color"
            >
              {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
            </div>
          </div>
          
          <!-- Shape info for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Size</label>
            <div class="info-text">{{ selectedShape.data.size }} cells</div>
          </div>
        </div>

        <!-- Text Tool Settings -->
        <div v-if="activeToolType === 'text'" class="tool-settings">
          <div class="section-label">{{ selectedShape ? 'Selected Text' : 'Text Settings' }}</div>
          
          <!-- Name field for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Name</label>
            <input 
              type="text" 
              :value="selectedShape.name" 
              @input="(e) => layersStore.updateShapeName(selectedShape.id, (e.target as HTMLInputElement).value)"
              class="text-input" 
            />
          </div>
          
          <!-- Content field for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Content</label>
            <textarea 
              :value="selectedShape.toolSettings?.content || ''"
              @input="(e) => {
                layersStore.updateShapeSettings(selectedShape.id, { ...selectedShape.toolSettings, content: (e.target as HTMLTextAreaElement).value })
                if (window.regenerateShape) window.regenerateShape(selectedShape.id)
              }"
              class="text-area"
              rows="3"
              placeholder="Enter text content..."
            />
          </div>
          
          <!-- Content field for new text (not used since we get it from dialog) -->
          <div v-if="!selectedShape" class="setting-item">
            <label>Instructions</label>
            <div class="info-text">Draw a box, then enter text content</div>
          </div>
          
          <div class="setting-item">
            <label>Horizontal Align</label>
            <select 
              class="select-input"
              :value="selectedShape ? (selectedShape.toolSettings?.horizontalAlign || 'left') : toolStore.textHorizontalAlign"
              @change="(e) => {
                if (selectedShape) {
                  layersStore.updateShapeSettings(selectedShape.id, { ...selectedShape.toolSettings, horizontalAlign: (e.target as HTMLSelectElement).value })
                  if (window.regenerateShape) window.regenerateShape(selectedShape.id)
                } else {
                  toolStore.setTextHorizontalAlign && toolStore.setTextHorizontalAlign((e.target as HTMLSelectElement).value as any)
                }
              }"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>Vertical Align</label>
            <select 
              class="select-input"
              :value="selectedShape ? (selectedShape.toolSettings?.verticalAlign || 'top') : toolStore.textVerticalAlign"
              @change="(e) => {
                if (selectedShape) {
                  layersStore.updateShapeSettings(selectedShape.id, { ...selectedShape.toolSettings, verticalAlign: (e.target as HTMLSelectElement).value })
                  if (window.regenerateShape) window.regenerateShape(selectedShape.id)
                } else {
                  toolStore.setTextVerticalAlign && toolStore.setTextVerticalAlign((e.target as HTMLSelectElement).value as any)
                }
              }"
            >
              <option value="top">Top</option>
              <option value="middle">Middle</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>Border</label>
            <div class="checkbox-wrapper">
              <input 
                type="checkbox" 
                class="checkbox-input" 
                :checked="selectedShape ? (selectedShape.toolSettings?.showBorder ?? true) : toolStore.textShowBorder"
                @change="(e) => {
                  if (selectedShape) {
                    layersStore.updateShapeSettings(selectedShape.id, { ...selectedShape.toolSettings, showBorder: (e.target as HTMLInputElement).checked })
                    if (window.regenerateShape) window.regenerateShape(selectedShape.id)
                  } else {
                    toolStore.setTextShowBorder && toolStore.setTextShowBorder((e.target as HTMLInputElement).checked)
                  }
                }"
              />
              <span class="checkbox-label">{{ selectedShape ? 'Has border' : 'Show border' }}</span>
            </div>
          </div>
          
          <div class="setting-item">
            <label>Color</label>
            <div 
              class="color-preview" 
              :style="{ backgroundColor: selectedShape ? selectedShape.color : colorStore.selectedColor.hex }"
              @click="selectedShape ? openColorPaletteForShape() : colorStore.toggleColorSelector()"
              title="Click to change color"
            >
              {{ selectedShape ? selectedShape.color : colorStore.selectedColor.hex }}
            </div>
          </div>
          
          <!-- Shape info for selected shapes -->
          <div v-if="selectedShape" class="setting-item">
            <label>Size</label>
            <div class="info-text">{{ selectedShape.data.size }} cells</div>
          </div>
        </div>

      </div>

      <!-- No settings message -->
      <div v-else class="no-settings">
        <p>Select a tool or shape to view settings</p>
      </div>
    </div>
    </Transition>
  </div>
</template>

<style scoped>
.tool-settings-panel {
  position: fixed;
  right: 20px;
  top: 20px;
  bottom: 20px;
  width: 280px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  backdrop-filter: var(--backdrop-blur);
  z-index: 1000;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s ease;
}

.tool-settings-panel.collapsed {
  width: auto;
  bottom: auto;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.panel-header:hover {
  background: rgba(247, 247, 247, 0.95);
}

.tool-settings-panel.collapsed .panel-header {
  border-bottom: none;
}

.panel-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.collapse-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
}

.collapse-btn:hover {
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

/* Panel slide animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.3s ease;
}

.panel-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tool-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-item label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.character-selector-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.character-selector-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
}

.character-selector-btn .character-display {
  font-size: 20px;
  font-family: var(--mono-font-family);
  min-width: 24px;
  text-align: center;
}

.character-selector-btn i {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}

.text-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  transition: all 0.2s ease;
}

.text-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.text-area {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--mono-font-family);
  background: white;
  transition: all 0.2s ease;
  resize: vertical;
  min-height: 60px;
}

.text-area:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.checkbox-label {
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.select-input {
  padding: 6px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.range-input {
  width: 100%;
  cursor: pointer;
}

.color-preview {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-light);
  font-size: 12px;
  font-family: var(--mono-font-family);
  color: white;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-preview:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.info-text {
  font-size: 13px;
  color: var(--text-primary);
  padding: 6px 0;
}

.no-settings {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* Scrollbar styling */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Border preview styles */
.border-preview {
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-box {
  font-family: var(--mono-font-family);
  font-size: 16px;
  line-height: 1.2;
  margin: 0;
  color: var(--text-primary);
  white-space: pre;
}

/* Fill options styles */
.fill-preset-options {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.fill-custom-input {
  margin-top: 8px;
}

.fill-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 14px;
  font-family: var(--mono-font-family);
  background: white;
  text-align: center;
  transition: all 0.2s ease;
}

.fill-input:focus {
  outline: none;
  border-color: var(--border-active);
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.fill-preset-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-family: var(--mono-font-family);
  transition: all 0.2s ease;
  min-width: 45px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fill-preset-btn span {
  font-family: var(--mono-font-family);
  font-size: 18px;
  line-height: 1;
}

.fill-preset-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-active);
}

.fill-preset-btn.active {
  background: var(--bg-active);
  color: white;
  border-color: var(--bg-active);
}

.fill-preset-btn.active:hover {
  background: var(--bg-active-hover);
  border-color: var(--bg-active-hover);
}
</style>