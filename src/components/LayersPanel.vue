<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLayersStore } from '../stores/layers'
import { useToolStore } from '../stores/tools'
import type { Shape } from '../stores/layers'

const emit = defineEmits<{
  shapesChanged: []
}>()

const layersStore = useLayersStore()
const toolStore = useToolStore()
const editingLayerId = ref<string | null>(null)
const editingLayerName = ref('')
const expandedLayers = ref<Set<string>>(new Set())

// Drag and drop state
const dragState = ref<{
  type: 'layer' | 'shape' | null
  layerId: string | null
  shapeId: string | null
  dragOverLayerId: string | null
  dragOverShapeId: string | null
  dragOverPosition: 'before' | 'after' | null
}>({
  type: null,
  layerId: null,
  shapeId: null,
  dragOverLayerId: null,
  dragOverShapeId: null,
  dragOverPosition: null
})

// Computed property for active layer
const activeLayer = computed(() => {
  const activeLayerId = layersStore.activeLayerId
  return layersStore.layers.find(layer => layer.id === activeLayerId)
})

const startEditingLayer = (layerId: string, currentName: string) => {
  editingLayerId.value = layerId
  editingLayerName.value = currentName
}

const saveLayerName = (layerId: string) => {
  if (editingLayerName.value.trim()) {
    layersStore.renameLayer(layerId, editingLayerName.value.trim())
  }
  editingLayerId.value = null
  editingLayerName.value = ''
}

const cancelEditingLayer = () => {
  editingLayerId.value = null
  editingLayerName.value = ''
}

const handleKeydown = (e: KeyboardEvent, layerId: string) => {
  if (e.key === 'Enter') {
    saveLayerName(layerId)
  } else if (e.key === 'Escape') {
    cancelEditingLayer()
  }
}

const addNewLayer = () => {
  const newLayer = layersStore.addLayer()
  layersStore.setActiveLayer(newLayer.id)
}

const toggleLayerExpanded = (layerId: string) => {
  if (expandedLayers.value.has(layerId)) {
    expandedLayers.value.delete(layerId)
  } else {
    expandedLayers.value.add(layerId)
  }
}

const isLayerExpanded = (layerId: string) => {
  return expandedLayers.value.has(layerId)
}

const formatShapeType = (type: string) => {
  switch (type) {
    case 'brush': return 'Brush'
    case 'rectangle': return 'Rectangle'
    case 'text': return 'Text'
    default: return type
  }
}

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const deleteShape = (layerId: string, shapeId: string) => {
  layersStore.deleteShape(layerId, shapeId)
  // Trigger a re-render by emitting an event to the parent
  emit('shapesChanged')
}

const getShapePreview = (shape: Shape) => {
  // Get first few characters from the shape for preview
  const characters = Array.from(shape.data.values()).filter(char => char && char !== 'ERASE')
  if (characters.length === 0) return 'Empty'
  if (characters.length === 1) return characters[0]
  return `${characters[0]}...`
}

const selectShape = (shapeId: string) => {
  layersStore.selectShape(shapeId)
  // Switch to select tool to show shape details in ToolSettingsPanel
  toolStore.setTool('select')
  emit('shapesChanged') // Trigger re-render to show selection
}

// Drag and drop handlers for layers
const handleLayerDragStart = (e: DragEvent, layerId: string) => {
  dragState.value.type = 'layer'
  dragState.value.layerId = layerId
  e.dataTransfer!.effectAllowed = 'move'
  // Add dragging class for visual feedback
  const target = e.target as HTMLElement
  target.classList.add('dragging')
}

const handleLayerDragEnd = (e: DragEvent) => {
  // Remove dragging class
  const target = e.target as HTMLElement
  target.classList.remove('dragging')
  // Reset drag state
  dragState.value = {
    type: null,
    layerId: null,
    shapeId: null,
    dragOverLayerId: null,
    dragOverShapeId: null,
    dragOverPosition: null
  }
}

const handleLayerDragOver = (e: DragEvent, layerId: string) => {
  e.preventDefault()
  if (dragState.value.type !== 'layer') return
  if (dragState.value.layerId === layerId) return
  
  dragState.value.dragOverLayerId = layerId
  
  // Determine if we're dragging before or after
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2
  dragState.value.dragOverPosition = e.clientY < midpoint ? 'before' : 'after'
}

const handleLayerDragLeave = () => {
  dragState.value.dragOverLayerId = null
  dragState.value.dragOverPosition = null
}

const handleLayerDrop = (e: DragEvent, targetLayerId: string) => {
  e.preventDefault()
  
  if (dragState.value.type !== 'layer' || !dragState.value.layerId) return
  if (dragState.value.layerId === targetLayerId) return
  
  const fromIndex = layersStore.layers.findIndex(l => l.id === dragState.value.layerId)
  let toIndex = layersStore.layers.findIndex(l => l.id === targetLayerId)
  
  if (fromIndex === -1 || toIndex === -1) return
  
  // Since we're displaying in reverse, adjust the position logic
  // 'before' in UI means 'after' in the actual array (higher index = more front)
  // 'after' in UI means 'before' in the actual array (lower index = more back)
  if (dragState.value.dragOverPosition === 'before') {
    // Moving to position after the target (higher index, more front)
    toIndex = toIndex + 1
  }
  
  // Adjust for the removal of the dragged item
  if (fromIndex < toIndex) {
    toIndex = toIndex - 1
  }
  
  layersStore.reorderLayers(fromIndex, toIndex)
  emit('shapesChanged')
}

// Drag and drop handlers for shapes
const handleShapeDragStart = (e: DragEvent, layerId: string, shapeId: string) => {
  e.stopPropagation() // Prevent layer drag
  dragState.value.type = 'shape'
  dragState.value.layerId = layerId
  dragState.value.shapeId = shapeId
  e.dataTransfer!.effectAllowed = 'move'
  // Add dragging class for visual feedback
  const target = e.target as HTMLElement
  target.classList.add('dragging')
}

const handleShapeDragEnd = (e: DragEvent) => {
  e.stopPropagation()
  // Remove dragging class
  const target = e.target as HTMLElement
  target.classList.remove('dragging')
  // Reset drag state
  dragState.value = {
    type: null,
    layerId: null,
    shapeId: null,
    dragOverLayerId: null,
    dragOverShapeId: null,
    dragOverPosition: null
  }
}

const handleShapeDragOver = (e: DragEvent, layerId: string, shapeId: string) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (dragState.value.type !== 'shape') return
  if (dragState.value.layerId !== layerId) return // Can only reorder within same layer
  if (dragState.value.shapeId === shapeId) return
  
  dragState.value.dragOverShapeId = shapeId
  
  // Determine if we're dragging before or after
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2
  dragState.value.dragOverPosition = e.clientY < midpoint ? 'before' : 'after'
}

const handleShapeDragLeave = (e: DragEvent) => {
  e.stopPropagation()
  dragState.value.dragOverShapeId = null
  dragState.value.dragOverPosition = null
}

const handleShapeDrop = (e: DragEvent, layerId: string, targetShapeId: string) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (dragState.value.type !== 'shape' || !dragState.value.shapeId) return
  if (dragState.value.layerId !== layerId) return // Can only reorder within same layer
  if (dragState.value.shapeId === targetShapeId) return
  
  const layer = layersStore.layers.find(l => l.id === layerId)
  if (!layer) return
  
  const fromIndex = layer.shapes.findIndex(s => s.id === dragState.value.shapeId)
  let toIndex = layer.shapes.findIndex(s => s.id === targetShapeId)
  
  if (fromIndex === -1 || toIndex === -1) return
  
  // Since we're displaying shapes in reverse too, adjust the position logic
  // 'before' in UI means 'after' in the actual array (higher index = more front)
  // 'after' in UI means 'before' in the actual array (lower index = more back)
  if (dragState.value.dragOverPosition === 'before') {
    // Moving to position after the target (higher index, more front)
    toIndex = toIndex + 1
  }
  
  // Adjust for the removal of the dragged item
  if (fromIndex < toIndex) {
    toIndex = toIndex - 1
  }
  
  layersStore.reorderShapes(layerId, fromIndex, toIndex)
  emit('shapesChanged')
}
</script>

<template>
  <div class="layers-panel">
    <div class="panel-header">
      <span class="panel-title">Layers</span>
      <button @click="addNewLayer" class="add-layer-button" title="Add new layer">
        <i class="fa-thumbprint fa-light fa-plus"></i>
      </button>
    </div>
    
    <div class="layers-list">
      <div 
        v-for="(layer, layerIndex) in [...layersStore.layers].reverse()" 
        :key="layer.id"
        class="layer-container"
      >
        <div 
          :class="['layer-item', { 
            active: layersStore.activeLayerId === layer.id,
            'drag-over-before': dragState.dragOverLayerId === layer.id && dragState.dragOverPosition === 'before',
            'drag-over-after': dragState.dragOverLayerId === layer.id && dragState.dragOverPosition === 'after'
          }]"
          @click="layersStore.setActiveLayer(layer.id)"
          draggable="true"
          @dragstart="handleLayerDragStart($event, layer.id)"
          @dragend="handleLayerDragEnd"
          @dragover="handleLayerDragOver($event, layer.id)"
          @dragleave="handleLayerDragLeave"
          @drop="handleLayerDrop($event, layer.id)"
        >
          <div class="layer-controls">
            <button 
              class="drag-handle"
              title="Drag to reorder"
            >
              <i class="fa-thumbprint fa-light fa-grip-vertical"></i>
            </button>
            <button 
              @click.stop="layersStore.toggleLayerVisibility(layer.id)"
              :class="['visibility-button', { invisible: !layer.visible }]"
              :title="layer.visible ? 'Hide layer' : 'Show layer'"
            >
              <i v-if="layer.visible" class="fa-thumbprint fa-light fa-eye"></i>
              <i v-else class="fa-thumbprint fa-light fa-eye-slash"></i>
            </button>
            
            <button 
              v-if="layer.shapes.length > 0"
              @click.stop="toggleLayerExpanded(layer.id)"
              class="expand-button"
              :title="isLayerExpanded(layer.id) ? 'Collapse layer' : 'Expand layer'"
            >
              <span v-if="isLayerExpanded(layer.id)">▼</span>
              <span v-else>▶</span>
            </button>
          </div>
          
          <div class="layer-content">
            <div v-if="editingLayerId === layer.id" class="layer-name-edit">
              <input 
                v-model="editingLayerName"
                @keydown="handleKeydown($event, layer.id)"
                @blur="saveLayerName(layer.id)"
                class="layer-name-input"
                ref="layerNameInput"
              />
            </div>
            <div v-else class="layer-info">
              <div 
                class="layer-name" 
                @dblclick="startEditingLayer(layer.id, layer.name)"
                :title="'Double-click to rename'"
              >
                {{ layer.name }}
              </div>
              <div class="layer-stats">
                {{ layer.shapes.length }} shape{{ layer.shapes.length !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>
          
          <div class="layer-actions">
            <button 
              v-if="layerIndex > 0"
              @click.stop="layersStore.moveLayerUp(layer.id); emit('shapesChanged')"
              class="order-button"
              title="Move up (to front)"
            >
              <i class="fa-thumbprint fa-light fa-arrow-up"></i>
            </button>
            <button 
              v-if="layerIndex < layersStore.layers.length - 1"
              @click.stop="layersStore.moveLayerDown(layer.id); emit('shapesChanged')"
              class="order-button"
              title="Move down (to back)"
            >
              <i class="fa-thumbprint fa-light fa-arrow-down"></i>
            </button>
            <button 
              v-if="layersStore.layers.length > 1"
              @click.stop="layersStore.deleteLayer(layer.id)"
              class="delete-button"
              title="Delete layer"
            >
              <i class="fa-thumbprint fa-light fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- Expanded shapes list -->
        <div v-if="isLayerExpanded(layer.id)" class="shapes-list">
          <div 
            v-for="(shape, shapeIndex) in [...layer.shapes].reverse()" 
            :key="shape.id"
            :class="['shape-item', { 
              selected: layersStore.selectedShapeId === shape.id,
              'drag-over-before': dragState.dragOverShapeId === shape.id && dragState.dragOverPosition === 'before',
              'drag-over-after': dragState.dragOverShapeId === shape.id && dragState.dragOverPosition === 'after'
            }]"
            @click="selectShape(shape.id)"
            draggable="true"
            @dragstart="handleShapeDragStart($event, layer.id, shape.id)"
            @dragend="handleShapeDragEnd"
            @dragover="handleShapeDragOver($event, layer.id, shape.id)"
            @dragleave="handleShapeDragLeave"
            @drop="handleShapeDrop($event, layer.id, shape.id)"
          >
            <button 
              class="shape-drag-handle"
              title="Drag to reorder"
            >
              <i class="fa-thumbprint fa-light fa-grip-vertical"></i>
            </button>
            <div class="shape-preview" :style="{ color: shape.color }">
              {{ getShapePreview(shape) }}
            </div>
            <div class="shape-info">
              <div class="shape-name">{{ shape.name }}</div>
              <div class="shape-details">
                <span class="shape-type">{{ formatShapeType(shape.type) }}</span>
                <span class="shape-time">{{ formatTimestamp(shape.timestamp) }}</span>
              </div>
            </div>
            <div class="shape-actions">
              <button 
                v-if="shapeIndex > 0"
                @click.stop="layersStore.moveShapeUp(layer.id, shape.id); emit('shapesChanged')"
                class="shape-order-button"
                title="Move up (to front)"
              >
                <i class="fa-thumbprint fa-light fa-arrow-up"></i>
              </button>
              <button 
                v-if="shapeIndex < layer.shapes.length - 1"
                @click.stop="layersStore.moveShapeDown(layer.id, shape.id); emit('shapesChanged')"
                class="shape-order-button"
                title="Move down (to back)"
              >
                <i class="fa-thumbprint fa-light fa-arrow-down"></i>
              </button>
              <button 
                @click.stop="deleteShape(layer.id, shape.id)"
                class="delete-shape-button"
                title="Delete shape"
              >
                <i class="fa-thumbprint fa-light fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="panel-footer">
      <div class="active-layer-info">
        <span class="active-label">Active:</span>
        <span class="active-layer-name">{{ activeLayer?.name || 'None' }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layers-panel {
  position: fixed;
  left: 20px;
  top: 20px;
  width: 240px;
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  backdrop-filter: var(--backdrop-blur);
  z-index: 1000;
  pointer-events: auto;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: 12px 12px 0 0;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.add-layer-button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: var(--bg-active);
  color: var(--text-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s ease;
}

.add-layer-button:hover {
  background: var(--bg-active-hover);
  transform: scale(1.05);
}

.layers-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 50vh;
}

.layer-container {
  margin-bottom: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.layer-item:hover {
  background: var(--bg-hover);
}

.layer-item.active {
  background: var(--layer-bg-selected);
  border-color: var(--border-active);
}

.layer-controls {
  display: flex;
  align-items: center;
  margin-right: 8px;
}

.drag-handle,
.shape-drag-handle {
  width: 16px;
  height: 20px;
  border: none;
  background: none;
  cursor: grab;
  color: #999;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
  margin-right: 4px;
}

.drag-handle:hover,
.shape-drag-handle:hover {
  color: #666;
}

.dragging {
  opacity: 0.5;
  cursor: grabbing !important;
}

.drag-over-before {
  border-top: 2px solid #007acc !important;
}

.drag-over-after {
  border-bottom: 2px solid #007acc !important;
}

.visibility-button {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
  transition: all 0.2s ease;
}

.visibility-button:hover {
  background: #e0e0e0;
  color: #333;
}

.visibility-button.invisible {
  color: #ccc;
}

.expand-button {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
  transition: all 0.2s ease;
  margin-left: 2px;
}

.expand-button:hover {
  background: #e0e0e0;
  color: #333;
}

.layer-content {
  flex: 1;
  min-width: 0;
}

.layer-name {
  font-weight: 500;
  font-size: 13px;
  color: #333;
  margin-bottom: 2px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-name:hover {
  color: #007acc;
}

.layer-stats {
  font-size: 11px;
  color: #666;
}

.layer-name-edit {
  width: 100%;
}

.layer-name-input {
  width: 100%;
  padding: 2px 6px;
  border: 1px solid #007acc;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  background: white;
  outline: none;
}

.layer-actions {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.order-button,
.delete-button {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 12px;
  transition: all 0.2s ease;
  margin-left: 2px;
}

.order-button:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.delete-button:hover {
  background: #ffe6e6;
  color: #d32f2f;
}

.panel-footer {
  padding: 8px 16px;
  border-top: 1px solid #e1e1e1;
  background: rgba(247, 247, 247, 0.8);
  border-radius: 0 0 12px 12px;
}

.active-layer-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.active-label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
}

.active-layer-name {
  font-size: 11px;
  color: #007acc;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

/* Scrollbar styling */
.layers-list::-webkit-scrollbar {
  width: 6px;
}

.layers-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.layers-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.layers-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Shapes list styles */
.shapes-list {
  margin-left: 16px;
  margin-top: 4px;
  padding-left: 12px;
  border-left: 2px solid #e1e1e1;
}

.shape-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 2px;
  border-radius: 6px;
  background: var(--shape-bg);
  transition: all 0.2s ease;
  font-size: 12px;
}

.shape-item:hover {
  background: var(--shape-bg-hover);
  cursor: pointer;
}

.shape-item.selected {
  background: var(--shape-bg-selected);
  border: 1px solid var(--border-active);
}

.shape-item.selected:hover {
  background: var(--shape-bg-selected-hover);
}

.shape-preview {
  width: 20px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono-font-family);
  font-weight: bold;
  font-size: 10px;
  margin-right: 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 3px;
  border: 1px solid #ddd;
}

.shape-info {
  flex: 1;
  min-width: 0;
}

.shape-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}

.shape-details {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: #666;
}

.shape-type {
  background: #e3f2fd;
  color: #1976d2;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
}

.shape-time {
  color: #999;
}

.shape-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.shape-order-button,
.delete-shape-button {
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 10px;
  transition: all 0.2s ease;
}

.shape-order-button:hover {
  background: #e3f2fd;
  color: #1976d2;
}

.delete-shape-button:hover {
  background: #ffe6e6;
  color: #d32f2f;
}
</style>