<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useShapesStore } from '../stores/shapes'
import { useToastStore } from '../stores/toast'
import { useCoordinateSystem } from '../composables/canvas/useCoordinateSystem'

interface MenuItem {
  label: string
  icon?: string
  action: () => void
  separator?: boolean
  disabled?: boolean
  shortcut?: string
}

const props = defineProps<{
  x: number
  y: number
  shapeId: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const shapesStore = useShapesStore()
const toastStore = useToastStore()
const { gridKey } = useCoordinateSystem()

// Clipboard storage
let clipboardData: { shapes: any[], offset: { x: number, y: number } } | null = null

// Copy selected shapes to clipboard
const copySelectedShapes = () => {
  const selectedShapes = shapesStore.getSelectedShapes()
  if (selectedShapes.length === 0) return
  
  // Find bounds of selected shapes
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  
  for (const shape of selectedShapes) {
    for (const [key] of shape.data) {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  
  // Store shapes with relative positions
  clipboardData = {
    shapes: selectedShapes.map(shape => ({
      type: shape.type,
      data: new Map(shape.data),
      color: shape.color,
      toolSettings: shape.toolSettings,
      toolColors: shape.toolColors,
    })),
    offset: { x: minX, y: minY }
  }
  
  toastStore.showToast(`Copied ${selectedShapes.length} shape${selectedShapes.length > 1 ? 's' : ''}`, 'success')
}

// Paste shapes from clipboard
const pasteShapes = () => {
  if (!clipboardData) {
    toastStore.showToast('Nothing to paste', 'warning')
    return
  }
  
  // Clear selection first
  shapesStore.clearSelection()
  
  // Paste each shape with a small offset
  const pasteOffset = 2 // Offset by 2 grid cells
  
  for (const shapeData of clipboardData.shapes) {
    const newData = new Map<string, string>()
    
    // Apply offset to all positions
    for (const [key, char] of shapeData.data) {
      const [x, y] = key.split(',').map(Number)
      const newX = x - clipboardData.offset.x + pasteOffset
      const newY = y - clipboardData.offset.y + pasteOffset
      newData.set(gridKey(newX, newY), char)
    }
    
    // Add the new shape
    const newShape = shapesStore.addShape(
      shapeData.type,
      newData,
      shapeData.color,
      `Copy of ${shapeData.type}`,
      shapeData.toolSettings,
      shapeData.toolColors
    )
    
    // Select the new shape
    shapesStore.selectShape(newShape.id, true)
  }
  
  toastStore.showToast(`Pasted ${clipboardData.shapes.length} shape${clipboardData.shapes.length > 1 ? 's' : ''}`, 'success')
}

// Cut selected shapes (copy then delete)
const cutSelectedShapes = () => {
  const selectedShapes = shapesStore.getSelectedShapes()
  if (selectedShapes.length === 0) return
  
  // Copy to clipboard first
  copySelectedShapes()
  
  // Delete selected shapes
  for (const shape of selectedShapes) {
    shapesStore.removeShape(shape.id)
  }
  
  toastStore.showToast(`Cut ${selectedShapes.length} shape${selectedShapes.length > 1 ? 's' : ''}`, 'success')
}

const menuRef = ref<HTMLElement>()

// Get the selected shape
const selectedShape = computed(() => {
  if (!props.shapeId) return null
  return shapesStore.getShape(props.shapeId)
})

// Menu items based on context
const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = []

  if (selectedShape.value) {
    // Shape-specific actions
    items.push({
      label: 'Cut',
      icon: 'fa-cut',
      shortcut: '⌘X',
      action: () => {
        cutSelectedShapes()
        emit('close')
      },
    })

    items.push({
      label: 'Copy',
      icon: 'fa-copy',
      shortcut: '⌘C',
      action: () => {
        copySelectedShapes()
        emit('close')
      },
    })

    items.push({
      label: 'Paste',
      icon: 'fa-paste',
      shortcut: '⌘V',
      action: () => {
        pasteShapes()
        emit('close')
      },
    })

    items.push({ separator: true } as MenuItem)

    items.push({
      label: 'Delete',
      icon: 'fa-trash',
      shortcut: 'Delete',
      action: () => {
        shapesStore.removeShape(props.shapeId!)
        emit('close')
      },
    })

    items.push({
      label: 'Duplicate',
      icon: 'fa-clone',
      shortcut: '⌘D',
      action: () => {
        if (selectedShape.value) {
          shapesStore.duplicateShape(props.shapeId!)
        }
        emit('close')
      },
    })

    items.push({ separator: true } as MenuItem)

    items.push({
      label: 'Bring to Front',
      icon: 'fa-bring-front',
      action: () => {
        shapesStore.bringToFront(props.shapeId!)
        emit('close')
      },
    })

    items.push({
      label: 'Send to Back',
      icon: 'fa-send-back',
      action: () => {
        shapesStore.sendToBack(props.shapeId!)
        emit('close')
      },
    })

    items.push({ separator: true } as MenuItem)

    // Toggle visibility
    items.push({
      label: selectedShape.value.visible ? 'Hide' : 'Show',
      icon: selectedShape.value.visible ? 'fa-eye-slash' : 'fa-eye',
      action: () => {
        shapesStore.updateShape(props.shapeId!, {
          visible: !selectedShape.value!.visible,
        })
        emit('close')
      },
    })

    // Lock/Unlock
    items.push({
      label: selectedShape.value.locked ? 'Unlock' : 'Lock',
      icon: selectedShape.value.locked ? 'fa-lock-open' : 'fa-lock',
      action: () => {
        shapesStore.updateShape(props.shapeId!, {
          locked: !selectedShape.value!.locked,
        })
        emit('close')
      },
    })
  } else {
    // Canvas context menu (no shape selected)
    items.push({
      label: 'Paste',
      icon: 'fa-paste',
      shortcut: '⌘V',
      action: () => {
        pasteShapes()
        emit('close')
      },
    })

    items.push({ separator: true } as MenuItem)

    items.push({
      label: 'Select All',
      icon: 'fa-object-group',
      shortcut: '⌘A',
      action: () => {
        shapesStore.selectAll()
        emit('close')
      },
    })
  }

  return items
})

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close')
  }
}

// Close menu on escape key
const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  // Add event listeners
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)

  // Position menu to avoid going off-screen
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Adjust horizontal position if menu would go off right edge
    if (rect.right > windowWidth) {
      menuRef.value.style.left = `${props.x - rect.width}px`
    }

    // Adjust vertical position if menu would go off bottom edge
    if (rect.bottom > windowHeight) {
      menuRef.value.style.top = `${props.y - rect.height}px`
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="{
      left: `${x}px`,
      top: `${y}px`,
    }"
  >
    <template v-for="(item, index) in menuItems" :key="index">
      <div v-if="item.separator" class="menu-separator" />
      <button
        v-else
        class="menu-item"
        :class="{ disabled: item.disabled }"
        :disabled="item.disabled"
        @click="item.action"
      >
        <i v-if="item.icon" :class="`fa-duotone fa-solid ${item.icon} menu-icon`"></i>
        <span class="menu-label">{{ item.label }}</span>
        <span v-if="item.shortcut" class="menu-shortcut">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  background: white;
  border-radius: 8px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  padding: 4px;
  font-size: 13px;
  user-select: none;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-primary);
  text-align: left;
  gap: 12px;
}

.menu-item:hover:not(.disabled) {
  background: var(--bg-hover, #f5f5f5);
}

.menu-item:active:not(.disabled) {
  background: var(--bg-active, #e8e8e8);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-icon {
  width: 16px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.menu-label {
  flex: 1;
}

.menu-shortcut {
  margin-left: auto;
  color: var(--text-muted, #999);
  font-size: 11px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.menu-separator {
  height: 1px;
  background: var(--border-light, #e0e0e0);
  margin: 4px 8px;
}
</style>
