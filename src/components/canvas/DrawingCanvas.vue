<script setup lang="ts">
import { onMounted, ref, nextTick, watchEffect } from 'vue'

// Import all composables from Phases 1-3
import { useCanvasState } from '../../composables/canvas/useCanvasState'
import { useCoordinateSystem } from '../../composables/canvas/useCoordinateSystem'
import { useDrawingTools } from '../../composables/drawing/useDrawingTools'
import { useMouseEvents } from '../../composables/interaction/useMouseEvents'
import { useKeyboardShortcuts } from '../../composables/interaction/useKeyboardShortcuts'
import { useSelection } from '../../composables/interaction/useSelection'
import { useClipboard } from '../../composables/io/useClipboard'
import { useRenderPipeline } from '../../composables/rendering/useRenderPipeline'

// Import stores
import { useToolStore } from '../../stores/tools'
import { useHistoryStore } from '../../stores/history'
import { useColorStore } from '../../stores/colors'
import { useLayersStore } from '../../stores/layers'
import { useToastStore } from '../../stores/toast'

// Component refs and emit
const canvasRef = ref<HTMLCanvasElement>()
const emit = defineEmits<{
  showTextInput: [screenX: number, screenY: number]
}>()

// Initialize stores
const toolStore = useToolStore()
const historyStore = useHistoryStore()
const colorStore = useColorStore()
const layersStore = useLayersStore()
const toastStore = useToastStore()

// Initialize canvas state composable
const { camera, mouse, canvasRef: canvasStateRef, saveCameraState, loadCameraState, panCamera, zoomAt, resetView, screenToWorld, worldToScreen } = useCanvasState()

// Initialize coordinate system
const { worldToGrid, gridToWorld, gridKey, gridWidth, gridHeight } = useCoordinateSystem()

// Initialize drawing tools
const { 
  rectangleState, 
  lineState, 
  textState, 
  currentStrokeData,
  drawRectangle,
  drawLine,
  drawText,
  placeCharacter,
  eraseAtPosition
} = useDrawingTools()

// Canvas context
let ctx: CanvasRenderingContext2D

// Initialize rendering pipeline
let renderPipeline: ReturnType<typeof useRenderPipeline>

// Main render function
const render = () => {
  if (!renderPipeline) {
    console.warn('[DrawingCanvas] Render called but renderPipeline not initialized')
    return
  }
  try {
    renderPipeline.render(rectangleState, lineState, textState)
  } catch (error) {
    console.error('[DrawingCanvas] Error during render:', error)
    toastStore.showToast('Render error occurred', 'error')
  }
}

// Initialize clipboard functionality
const clipboardCallbacks = {
  onRender: render,
  getCurrentMousePosition: () => ({ x: mouse.x, y: mouse.y }),
  getCameraPosition: () => ({ x: camera.x, y: camera.y })
}
const { copyToClipboard, setupClipboardListeners } = useClipboard(clipboardCallbacks)

// Text handling functions
const handleTextConfirm = async (text: string, hAlign: string, vAlign: string, showBorder: boolean) => {
  if (textState.isDrawing) {
    const textData = drawText(textState.startX, textState.startY, textState.endX, textState.endY, text, hAlign, vAlign, showBorder)
    layersStore.addShape('text', textData, colorStore.selectedColor.hex, undefined, {
      content: text,
      horizontalAlign: hAlign,
      verticalAlign: vAlign,
      showBorder
    })
    textState.isDrawing = false
    layersStore.saveToStorage()
    render()
  }
}

// Shape regeneration function for tool changes
const regenerateShape = (shapeId: string) => {
  // Find the shape in the flat shapes array
  const targetShape = layersStore.shapes.find(s => s.id === shapeId)
  
  if (!targetShape) return
  
  if (targetShape.type === 'rectangle') {
    // Find the bounds of the existing rectangle
    const keys = Array.from(targetShape.data.keys())
    if (keys.length === 0) return
    
    const coords = keys.map(key => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })
    
    const minX = Math.min(...coords.map(c => c.x))
    const maxX = Math.max(...coords.map(c => c.x))
    const minY = Math.min(...coords.map(c => c.y))
    const maxY = Math.max(...coords.map(c => c.y))
    
    // Convert grid coordinates to world coordinates
    const startWorldX = minX * 10 + 5
    const startWorldY = minY * 20 + 10
    const endWorldX = maxX * 10 + 5
    const endWorldY = maxY * 20 + 10
    
    // Regenerate with shape's tool settings - pass settings directly instead of modifying tool store
    const newData = drawRectangle(startWorldX, startWorldY, endWorldX, endWorldY, {
      borderStyle: targetShape.toolSettings?.borderStyle || 'single',
      fillChar: targetShape.toolSettings?.fillChar || '',
      shadow: targetShape.toolSettings?.shadow || false,
      text: targetShape.toolSettings?.text || '',
      textAlign: targetShape.toolSettings?.textAlign || 'center',
      textPosition: targetShape.toolSettings?.textPosition || 'middle',
      // Include the checkbox states
      showText: targetShape.toolSettings?.showText,
      showFill: targetShape.toolSettings?.showFill,
      showBorder: targetShape.toolSettings?.showBorder,
      showShadow: targetShape.toolSettings?.showShadow
    })
    targetShape.data = newData
    
    // Save and re-render
    layersStore.saveToStorage()
    render()
  } else if (targetShape.type === 'text' && targetShape.toolSettings?.content) {
    // Find the bounds of the existing text box
    const keys = Array.from(targetShape.data.keys())
    if (keys.length === 0) return
    
    const coords = keys.map(key => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })
    
    const minX = Math.min(...coords.map(c => c.x))
    const maxX = Math.max(...coords.map(c => c.x))
    const minY = Math.min(...coords.map(c => c.y))
    const maxY = Math.max(...coords.map(c => c.y))
    
    // Convert grid coordinates to world coordinates
    const startWorldX = minX * 10 + 5
    const startWorldY = minY * 20 + 10
    const endWorldX = maxX * 10 + 5
    const endWorldY = maxY * 20 + 10
    
    // Regenerate text with current settings
    const newData = drawText(
      startWorldX, startWorldY, endWorldX, endWorldY,
      targetShape.toolSettings.content,
      targetShape.toolSettings.horizontalAlign || 'left',
      targetShape.toolSettings.verticalAlign || 'top',
      targetShape.toolSettings.showBorder !== false
    )
    targetShape.data = newData
    
    // Save and re-render
    layersStore.saveToStorage()
    render()
  }
  
  render()
}

// Undo/Redo functionality
const performUndo = () => {
  const success = layersStore.performUndo()
  if (success) {
    render()
  }
}

const performRedo = () => {
  const success = layersStore.performRedo()
  if (success) {
    render()
  }
}

// Canvas reset function
const resetCanvas = () => {
  if (confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
    layersStore.resetToDefault()
    layersStore.saveToStorage()
    render()
    toastStore.showToast('Canvas cleared', 'info')
  }
}

// Export functionality
const exportToPNG = () => {
  if (!canvasRef.value) return
  
  // Create a temporary canvas for export
  const exportCanvas = document.createElement('canvas')
  const exportCtx = exportCanvas.getContext('2d')
  if (!exportCtx) return
  
  // Set canvas size to current viewport
  exportCanvas.width = canvasRef.value.width
  exportCanvas.height = canvasRef.value.height
  
  // Fill with white background
  exportCtx.fillStyle = '#ffffff'
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  
  // Copy the current canvas content
  exportCtx.drawImage(canvasRef.value, 0, 0)
  
  // Create download link
  const link = document.createElement('a')
  link.download = `ascii-art-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`
  link.href = exportCanvas.toDataURL('image/png')
  link.click()
  
  toastStore.showToast('Image exported successfully', 'success')
}

// Share functionality
const shareCanvas = async () => {
  if (!canvasRef.value) return
  
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvasRef.value!.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })
    
    const file = new File([blob], 'ascii-art.png', { type: 'image/png' })
    
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'ASCII Art',
        text: 'Check out my ASCII art!',
        files: [file]
      })
      toastStore.showToast('Shared successfully', 'success')
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
        toastStore.showToast('Image copied to clipboard', 'success')
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        toastStore.showToast('Share not supported on this device', 'error')
      }
    }
  } catch (error) {
    console.error('Failed to share:', error)
    toastStore.showToast('Failed to share', 'error')
  }
}

// Set the canvas ref for the canvas state composable
watchEffect(() => {
  if (canvasRef.value && canvasStateRef) {
    canvasStateRef.value = canvasRef.value
  }
})

// Setup mouse and keyboard events
const setupEventListeners = () => {
  if (!canvasRef.value || !ctx) return
  
  // Mouse event callbacks
  const mouseCallbacks = {
    onRender: render,
    onShowTextInput: (screenX: number, screenY: number) => {
      emit('showTextInput', screenX, screenY)
    },
    screenToWorld,
    worldToScreen
  }
  
  // Initialize mouse events with drawing states
  const drawingStates = {
    rectangleState,
    lineState,
    textState,
    currentStrokeData,
    placeCharacter,
    eraseAtPosition,
    drawRectangle,
    drawLine
  }
  const mouseEvents = useMouseEvents(canvasRef.value, mouseCallbacks, drawingStates)
  
  // Watch for tool changes to update cursor
  const stopWatchingTool = watchEffect(() => {
    // Access the tool to trigger reactivity
    const currentTool = toolStore.currentTool
    if (canvasRef.value) {
      mouseEvents.updateCursor()
    }
  })
  
  // Setup mouse listeners
  const cleanupMouse = mouseEvents.setupMouseListeners(
    mouse, 
    camera, 
    panCamera, 
    zoomAt, 
    saveCameraState,
    drawLine,
    drawText
  )
  
  // Setup keyboard shortcuts
  const keyboardCallbacks = {
    onUndo: performUndo,
    onRedo: performRedo,
    onRender: render
  }
  
  const keyboardShortcuts = useKeyboardShortcuts(keyboardCallbacks)
  keyboardShortcuts.setupKeyboardListeners()
  const cleanupKeyboard = keyboardShortcuts.removeKeyboardListeners
  
  // Setup clipboard listeners
  const cleanupClipboard = setupClipboardListeners()
  
  // Return cleanup function
  return () => {
    cleanupMouse()
    cleanupKeyboard()
    cleanupClipboard()
    stopWatchingTool()
  }
}

// Component lifecycle
onMounted(async () => {
  await nextTick()
  
  if (!canvasRef.value) {
    console.error('[DrawingCanvas] Canvas ref not available')
    toastStore.showToast('Failed to initialize canvas', 'error')
    return
  }
  
  // Get canvas context
  const context = canvasRef.value.getContext('2d')
  if (!context) {
    console.error('[DrawingCanvas] Failed to get canvas context')
    toastStore.showToast('Failed to get canvas context', 'error')
    return
  }
  ctx = context
  
  try {
    // Initialize rendering pipeline
    renderPipeline = useRenderPipeline(canvasRef.value, ctx, camera, {
      screenToWorld,
      worldToScreen,
      worldToGrid,
      gridToWorld,
      gridKey
    })
    
    // Setup resize listener
    const cleanupResize = renderPipeline.setupResizeListener(render)
    
    // Load camera state
    if (!loadCameraState()) {
      resetView()
    }
    
    // Check if camera is in an extreme position and show toast
    const checkCameraPosition = () => {
      const distance = Math.sqrt(camera.x * camera.x + camera.y * camera.y)
      const isExtremeZoom = camera.zoom < 0.2 || camera.zoom > 8
      
      if (distance > 500 || isExtremeZoom) {
        
        // Show toast with recenter action
        toastStore.showToast(
          'Camera is far from center', 
          'warning',
          8000, // Show for 8 seconds
          [
            {
              label: 'Recenter',
              action: () => {
                resetView()
                render()
                toastStore.showToast('View recentered', 'success')
              }
            }
          ]
        )
      }
    }
    
    checkCameraPosition()
    
    // Setup event listeners
    const cleanupEvents = setupEventListeners()
    
    // Expose functions globally for stores and components
    window.renderCanvas = render
    window.regenerateShape = regenerateShape
    
    // Initial render
    render()
    
    // Cleanup on unmount
    return () => {
      cleanupResize()
      cleanupEvents?.()
    }
  } catch (error) {
    console.error('[DrawingCanvas] Error during initialization:', error)
    toastStore.showToast('Canvas initialization failed', 'error')
  }
})

// Expose functions for parent components
defineExpose({
  render,
  regenerateShape,
  resetView,
  resetCanvas,
  performUndo,
  performRedo,
  exportToPNG,
  shareCanvas,
  copyToClipboard,
  handleTextConfirm
})
</script>

<template>
  <canvas 
    ref="canvasRef" 
    class="drawing-canvas"
    @contextmenu.prevent
  ></canvas>
</template>

<style scoped>
.drawing-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  cursor: crosshair;
}
</style>