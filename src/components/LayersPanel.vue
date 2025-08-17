<script setup lang="ts">
import { ref, computed } from 'vue'
import { useShapesStore } from '../stores/shapes'
import { useToolStore } from '../stores/tools'
import type { Shape, ShapeGroup } from '../stores/shapes'

const emit = defineEmits<{
  shapesChanged: []
}>()

const shapesStore = useShapesStore()
const toolStore = useToolStore()

// UI state
const editingGroupId = ref<string | null>(null)
const editingGroupName = ref('')
const expandedGroups = ref<Set<string>>(new Set())

// Drag and drop state
const draggedItem = ref<{ type: 'shape' | 'group', id: string } | null>(null)
const dropPosition = ref<{ type: 'shape' | 'group', id: string, position: 'before' | 'after' } | null>(null)

// Selection tracking
const lastSelectedShapeId = ref<string | null>(null)

// Check if we can group/ungroup
const canGroup = computed(() => {
  return shapesStore.selectedShapeIds.size >= 2
})

const canUngroup = computed(() => {
  if (shapesStore.selectedShapeIds.size !== 1) return false
  const selectedId = Array.from(shapesStore.selectedShapeIds)[0]
  const shape = shapesStore.getShape(selectedId)
  return shape?.groupId !== undefined
})

const selectedGroup = computed(() => {
  if (shapesStore.selectedShapeIds.size !== 1) return null
  const selectedId = Array.from(shapesStore.selectedShapeIds)[0]
  const shape = shapesStore.getShape(selectedId)
  if (!shape?.groupId) return null
  return shapesStore.groups.find((g) => g.id === shape.groupId)
})

// Group management
const startEditingGroup = (groupId: string, currentName: string) => {
  editingGroupId.value = groupId
  editingGroupName.value = currentName
}

const saveGroupName = (groupId: string) => {
  if (editingGroupName.value.trim()) {
    shapesStore.updateGroup(groupId, { name: editingGroupName.value.trim() })
  }
  editingGroupId.value = null
  editingGroupName.value = ''
}

const cancelEditingGroup = () => {
  editingGroupId.value = null
  editingGroupName.value = ''
}

const handleKeydown = (e: KeyboardEvent, groupId: string) => {
  if (e.key === 'Enter') {
    saveGroupName(groupId)
  } else if (e.key === 'Escape') {
    cancelEditingGroup()
  }
}

// Group actions
const createGroup = () => {
  if (canGroup.value) {
    const selectedIds = Array.from(shapesStore.selectedShapeIds)
    shapesStore.createGroup('New Group', selectedIds)
    emit('shapesChanged')
  }
}

const ungroupSelected = () => {
  if (selectedGroup.value) {
    shapesStore.removeGroup(selectedGroup.value.id)
    emit('shapesChanged')
  }
}

const toggleGroupExpanded = (groupId: string) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
    shapesStore.updateGroup(groupId, { expanded: false })
  } else {
    expandedGroups.value.add(groupId)
    shapesStore.updateGroup(groupId, { expanded: true })
  }
}

const isGroupExpanded = (groupId: string) => {
  return expandedGroups.value.has(groupId)
}

// Shape selection
const selectShape = (shapeId: string, event?: MouseEvent) => {
  const isMultiSelect = event && (event.metaKey || event.ctrlKey)
  const isRangeSelect = event && event.shiftKey

  if (isRangeSelect && lastSelectedShapeId.value) {
    // Range selection with shift-click
    selectShapeRange(lastSelectedShapeId.value, shapeId)
  } else {
    // Single or toggle selection
    if (isMultiSelect) {
      if (shapesStore.isShapeSelected(shapeId)) {
        shapesStore.deselectShape(shapeId)
      } else {
        shapesStore.selectShape(shapeId, true)
      }
    } else {
      shapesStore.selectShape(shapeId, false)
    }
    lastSelectedShapeId.value = shapeId
  }

  // Switch to select tool to show shape details
  toolStore.setTool('select')
  emit('shapesChanged')
}

const selectShapeRange = (fromId: string, toId: string) => {
  // Find all shapes in display order (by z-order)
  const allShapes = shapesStore.getAllShapes()
    .sort((a, b) => a.zOrder - b.zOrder)
    .map(s => s.id)

  // Find indices
  const fromIndex = allShapes.findIndex((id) => id === fromId)
  const toIndex = allShapes.findIndex((id) => id === toId)

  if (fromIndex === -1 || toIndex === -1) return

  // Clear current selection and select range
  shapesStore.clearSelection()

  const startIndex = Math.min(fromIndex, toIndex)
  const endIndex = Math.max(fromIndex, toIndex)

  for (let i = startIndex; i <= endIndex; i++) {
    shapesStore.selectShape(allShapes[i], true)
  }

  lastSelectedShapeId.value = toId
}

// Toggle shape visibility
const toggleShapeVisibility = (shapeId: string) => {
  const shape = shapesStore.getShape(shapeId)
  if (shape) {
    shapesStore.updateShape(shapeId, { visible: !shape.visible })
    emit('shapesChanged')
  }
}

// Shape actions
const deleteShape = (shapeId: string) => {
  shapesStore.removeShape(shapeId)
  emit('shapesChanged')
}

const deleteGroup = (groupId: string) => {
  shapesStore.removeGroup(groupId)
  emit('shapesChanged')
}

// Drag and drop functions
const handleDragStart = (e: DragEvent, type: 'shape' | 'group', id: string) => {
  draggedItem.value = { type, id }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }))
  }
}

const handleDragOver = (e: DragEvent, type: 'shape' | 'group', id: string) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
  
  // Determine if we're in the top or bottom half
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseY = e.clientY
  const itemCenter = rect.top + rect.height / 2
  const position = mouseY < itemCenter ? 'before' : 'after'
  
  dropPosition.value = { type, id, position }
}

const handleDragLeave = (e: DragEvent) => {
  // Only clear if we're leaving the entire drop zone
  if (!e.relatedTarget || !(e.relatedTarget as Element).closest('.shape-item, .group-container')) {
    dropPosition.value = null
  }
}

const handleDrop = (e: DragEvent, targetType: 'shape' | 'group', targetId: string) => {
  e.preventDefault()
  
  if (!draggedItem.value || !dropPosition.value) return
  
  const { type: sourceType, id: sourceId } = draggedItem.value
  const { position } = dropPosition.value
  
  // Don't drop on self
  if (sourceType === targetType && sourceId === targetId) {
    draggedItem.value = null
    dropPosition.value = null
    return
  }
  
  // Handle reordering logic
  if (sourceType === 'shape' && targetType === 'shape') {
    const sourceShape = shapesStore.getShape(sourceId)
    const targetShape = shapesStore.getShape(targetId)
    
    if (sourceShape && targetShape && sourceShape.id !== targetShape.id) {
      // Get all shapes sorted by zOrder DESCENDING (matching the display order)
      const allShapes = shapesStore.getAllShapes().sort((a, b) => b.zOrder - a.zOrder)
      
      // Find positions in the displayed order
      const sourceIndex = allShapes.findIndex(s => s.id === sourceId)
      const targetIndex = allShapes.findIndex(s => s.id === targetId)
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Remove source from array
        const [movedShape] = allShapes.splice(sourceIndex, 1)
        
        // Calculate new insert position after removal
        let insertIndex = targetIndex
        
        if (position === 'before') {
          // Insert before target (higher in the list, higher zOrder)
          // If source was before target (higher in list), target has shifted up by 1
          insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
        } else {
          // position === 'after'
          // Insert after target (lower in the list, lower zOrder)
          // If source was before target (higher in list), target has shifted up by 1
          insertIndex = sourceIndex < targetIndex ? targetIndex : targetIndex + 1
        }
        
        // Insert at new position
        allShapes.splice(insertIndex, 0, movedShape)
        
        // Update zOrder for all shapes - highest zOrder for first item
        allShapes.forEach((shape, index) => {
          const newZOrder = allShapes.length - index
          if (shape.zOrder !== newZOrder) {
            shapesStore.updateShape(shape.id, { zOrder: newZOrder })
          }
        })
      }
    }
  }
  
  emit('shapesChanged')
  
  draggedItem.value = null
  dropPosition.value = null
}

// Utility functions
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const formatShapeType = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1)
}


// Initialize expanded groups from store
shapesStore.groups.forEach((group) => {
  if (group.expanded) {
    expandedGroups.value.add(group.id)
  }
})
</script>

<template>
  <div class="layers-panel">
    <div class="panel-header">
      <h3><i class="fa-duotone fa-solid fa-layer-group"></i> Shapes</h3>
      <div class="header-actions">
        <button
          v-if="canGroup"
          @click="createGroup"
          class="action-button group-button"
          title="Group selected shapes"
        >
          <i class="fa-sharp fa-duotone fa-object-group"></i>
        </button>
        <button
          v-if="canUngroup"
          @click="ungroupSelected"
          class="action-button ungroup-button"
          title="Ungroup selected"
        >
          <i class="fa-sharp fa-duotone fa-object-ungroup"></i>
        </button>
      </div>
    </div>

    <div class="shapes-list">
      <!-- Ungrouped shapes -->
      <div v-if="shapesStore.getUngroupedShapes().length > 0" class="ungrouped-section">
        <div
          v-for="shape in shapesStore.getUngroupedShapes().sort((a, b) => b.zOrder - a.zOrder)"
          :key="shape.id"
          :class="[
            'shape-item',
            {
              selected: shapesStore.isShapeSelected(shape.id),
              'drop-before': dropPosition?.type === 'shape' && dropPosition?.id === shape.id && dropPosition?.position === 'before',
              'drop-after': dropPosition?.type === 'shape' && dropPosition?.id === shape.id && dropPosition?.position === 'after',
            },
          ]"
          draggable="true"
          @click="selectShape(shape.id, $event)"
          @dragstart="handleDragStart($event, 'shape', shape.id)"
          @dragover="handleDragOver($event, 'shape', shape.id)"
          @dragleave="handleDragLeave($event)"
          @drop="handleDrop($event, 'shape', shape.id)"
        >
          <div class="shape-info">
            <div class="shape-name">{{ shape.name }}</div>
            <div class="shape-details">
              <span class="shape-type">{{ formatShapeType(shape.type) }}</span>
              <span class="shape-time">{{ formatTimestamp(shape.timestamp) }}</span>
            </div>
          </div>
          <div class="shape-actions">
            <button
              @click.stop="toggleShapeVisibility(shape.id)"
              class="visibility-button"
              :class="{ hidden: !shape.visible }"
            >
              <i
                :class="
                  shape.visible ? 'fa-duotone fa-solid fa-eye' : 'fa-duotone fa-solid fa-eye-slash'
                "
              ></i>
            </button>
            <button @click.stop="deleteShape(shape.id)" class="delete-button">
              <i class="fa-duotone fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Groups -->
      <div
        v-for="group in [...shapesStore.groups].sort((a: any, b: any) => b.order - a.order)"
        :key="group.id"
        :class="[
          'group-container',
          {
            'drop-before': dropPosition?.type === 'group' && dropPosition?.id === group.id && dropPosition?.position === 'before',
            'drop-after': dropPosition?.type === 'group' && dropPosition?.id === group.id && dropPosition?.position === 'after',
          },
        ]"
      >
        <div 
          class="group-header"
          draggable="true"
          @dragstart="handleDragStart($event, 'group', group.id)"
          @dragover="handleDragOver($event, 'group', group.id)"
          @dragleave="handleDragLeave($event)"
          @drop="handleDrop($event, 'group', group.id)"
        >
          <button @click="toggleGroupExpanded(group.id)" class="expand-button">
            <i
              :class="
                isGroupExpanded(group.id)
                  ? 'fa-duotone fa-solid fa-chevron-down'
                  : 'fa-duotone fa-solid fa-chevron-right'
              "
            ></i>
          </button>

          <div
            v-if="editingGroupId !== group.id"
            class="group-name"
            @dblclick="startEditingGroup(group.id, group.name)"
          >
            {{ group.name }}
          </div>
          <input
            v-else
            v-model="editingGroupName"
            @blur="saveGroupName(group.id)"
            @keydown="handleKeydown($event, group.id)"
            class="group-name-input"
            :placeholder="group.name"
            autofocus
          />

          <div class="group-count">{{ shapesStore.getShapesInGroup(group.id).length }} shapes</div>

          <div class="group-actions">
            <button
              @click.stop="shapesStore.updateGroup(group.id, { visible: !group.visible })"
              class="visibility-button"
              :class="{ hidden: !group.visible }"
            >
              <i
                :class="
                  group.visible ? 'fa-duotone fa-solid fa-eye' : 'fa-duotone fa-solid fa-eye-slash'
                "
              ></i>
            </button>
            <button @click.stop="deleteGroup(group.id)" class="delete-button">
              <i class="fa-duotone fa-solid fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- Shapes in group -->
        <div v-if="isGroupExpanded(group.id)" class="group-shapes">
          <div
            v-for="shape in shapesStore
              .getShapesInGroup(group.id)
              .sort((a, b) => b.zOrder - a.zOrder)"
            :key="shape.id"
            :class="[
              'shape-item',
              'grouped',
              {
                selected: shapesStore.isShapeSelected(shape.id),
                'drop-before': dropPosition?.type === 'shape' && dropPosition?.id === shape.id && dropPosition?.position === 'before',
                'drop-after': dropPosition?.type === 'shape' && dropPosition?.id === shape.id && dropPosition?.position === 'after',
              },
            ]"
            draggable="true"
            @click="selectShape(shape.id, $event)"
            @dragstart="handleDragStart($event, 'shape', shape.id)"
            @dragover="handleDragOver($event, 'shape', shape.id)"
            @dragleave="handleDragLeave($event)"
            @drop="handleDrop($event, 'shape', shape.id)"
          >
            <div class="shape-info">
              <div class="shape-name">{{ shape.name }}</div>
              <div class="shape-details">
                <span class="shape-type">{{ formatShapeType(shape.type) }}</span>
                <span class="shape-time">{{ formatTimestamp(shape.timestamp) }}</span>
              </div>
            </div>
            <div class="shape-actions">
              <button @click.stop="deleteShape(shape.id)" class="delete-button">
                <i class="fa-duotone fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layers-panel {
  position: fixed;
  left: 20px;
  top: 80px;
  width: 280px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.panel-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 6px 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.action-button:hover {
  background: rgba(79, 195, 247, 0.1);
  border-color: #4fc3f7;
}

.shapes-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.ungrouped-section {
  margin-bottom: 12px;
}

.group-container {
  margin-bottom: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  padding: 10px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
}

.group-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.expand-button {
  padding: 4px;
  margin-right: 8px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 10px;
  color: #666;
  transition: transform 0.2s ease;
}

.group-name {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
  color: #333;
}

.group-name-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #4fc3f7;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}

.group-count {
  margin-right: 12px;
  font-size: 11px;
  color: #999;
}

.group-actions {
  display: flex;
  gap: 4px;
}

.group-shapes {
  padding: 8px;
  background: rgba(0, 0, 0, 0.01);
}

.shape-item {
  display: flex;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.shape-item.grouped {
  margin-left: 24px;
}

.shape-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.shape-item.selected {
  background: rgba(79, 195, 247, 0.1);
  border: 1px solid rgba(79, 195, 247, 0.3);
}

.shape-item.primary-selected {
  background: rgba(79, 195, 247, 0.15);
  border: 1px solid #4fc3f7;
  box-shadow: inset 0 0 0 1px rgba(79, 195, 247, 0.2);
}

.shape-item.selected:hover {
  background: rgba(79, 195, 247, 0.2);
}

.shape-item.primary-selected:hover {
  background: rgba(79, 195, 247, 0.25);
}

.shape-info {
  flex: 1;
  min-width: 0;
}

.shape-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shape-details {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.shape-type {
  font-size: 11px;
  color: #666;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.shape-time {
  font-size: 11px;
  color: #999;
}

.shape-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.shape-item:hover .shape-actions,
.group-header:hover .group-actions {
  opacity: 1;
}

.visibility-button,
.delete-button {
  padding: 4px 6px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s ease;
}

.visibility-button:hover {
  color: #4fc3f7;
}

.visibility-button.hidden {
  color: #ccc;
}

.delete-button:hover {
  color: #f44336;
}

/* Drag and drop styles */
.shape-item[draggable="true"],
.group-header[draggable="true"] {
  cursor: grab;
}

.shape-item[draggable="true"]:active,
.group-header[draggable="true"]:active {
  cursor: grabbing;
}

/* Drop insertion lines */
.shape-item.drop-before::before,
.shape-item.drop-after::after,
.group-container.drop-before::before,
.group-container.drop-after::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #4fc3f7;
  z-index: 10;
  box-shadow: 0 0 4px rgba(79, 195, 247, 0.5);
}

.shape-item.drop-before::before,
.group-container.drop-before::before {
  top: -1px;
}

.shape-item.drop-after::after,
.group-container.drop-after::after {
  bottom: -1px;
}

.shape-item,
.group-container {
  position: relative;
}
</style>
