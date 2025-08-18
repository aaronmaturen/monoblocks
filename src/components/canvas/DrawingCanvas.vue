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
import { useAutoRender } from '../../composables/rendering/useAutoRender'

// Import stores
import { useToolStore } from '../../stores/tools'
import { useHistoryStore } from '../../stores/history'
import { useColorStore } from '../../stores/colors'
import { useShapesStore } from '../../stores/shapes'
import { useToastStore } from '../../stores/toast'

// Import context menu component
import ContextMenu from '../ContextMenu.vue'

// Component refs
const canvasRef = ref<HTMLCanvasElement>()

// Context menu state
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuShapeId = ref<string | null>(null)

// Initialize stores
const toolStore = useToolStore()
const historyStore = useHistoryStore()
const colorStore = useColorStore()
const shapesStore = useShapesStore()
const toastStore = useToastStore()

// Initialize canvas state composable
const {
  camera,
  mouse,
  canvasRef: canvasStateRef,
  saveCameraState,
  loadCameraState,
  panCamera,
  zoomAt,
  resetView,
  screenToWorld,
  worldToScreen,
} = useCanvasState()

// Initialize coordinate system
const { worldToGrid, gridToWorld, gridKey, gridWidth, gridHeight } = useCoordinateSystem()

// Initialize drawing tools
const {
  rectangleState,
  diamondState,
  lineState,
  textState,
  currentStrokeData,
  drawRectangle,
  drawDiamond,
  drawLine,
  drawText,
  placeCharacter,
  eraseAtPosition,
  resetPencilTracking,
} = useDrawingTools()

// Canvas context
let ctx: CanvasRenderingContext2D

// Initialize rendering pipeline
let renderPipeline: ReturnType<typeof useRenderPipeline>

// Initialize auto-render system
const { requestRender, forceRender } = useAutoRender({
  debounceMs: 16, // ~60fps
  renderOnMount: true,
  renderFn: () => {
    if (!renderPipeline) {
      console.warn('[DrawingCanvas] Render called but renderPipeline not initialized')
      return
    }
    try {
      // Convert mouse screen position to world position for pencil preview
      const mouseWorld = screenToWorld(mouse.x, mouse.y)
      renderPipeline.render(
        rectangleState,
        diamondState,
        lineState,
        textState,
        mouseWorld.x,
        mouseWorld.y,
        currentStrokeData,
      )
    } catch (error) {
      console.error('[DrawingCanvas] Error during render:', error)
      toastStore.showToast('Render error occurred', 'error')
    }
  },
})

// Main render function (now delegates to auto-render)
const render = () => {
  forceRender()
}

// Initialize clipboard functionality
const clipboardCallbacks = {
  onRender: render,
  getCurrentMousePosition: () => ({ x: mouse.x, y: mouse.y }),
  getCameraPosition: () => ({ x: camera.x, y: camera.y }),
}
const { copyToClipboard, setupClipboardListeners } = useClipboard(clipboardCallbacks)

// Text tool now creates a rectangle with default "TEXT" content
// The actual creation is handled in useMouseEvents handleMouseUp

// Shape regeneration function for tool changes
const regenerateShape = (shapeId: string) => {
  // Find the shape in the flat shapes array
  const targetShape = shapesStore.getShape(shapeId)

  if (!targetShape) return

  if (targetShape.type === 'rectangle') {
    // Find the bounds of the existing rectangle
    const keys = Array.from(targetShape.data.keys())
    if (keys.length === 0) return

    const coords = keys.map((key) => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })

    const minX = Math.min(...coords.map((c) => c.x))
    const maxX = Math.max(...coords.map((c) => c.x))
    const minY = Math.min(...coords.map((c) => c.y))
    const maxY = Math.max(...coords.map((c) => c.y))

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
      showShadow: targetShape.toolSettings?.showShadow,
    })

    // Update the shape data using the store
    shapesStore.updateShape(shapeId, { data: newData })
    // Auto-render will handle the re-render
  } else if (targetShape.type === 'line') {
    // Find the bounds of the existing line
    const keys = Array.from(targetShape.data.keys())
    if (keys.length === 0) return

    const coords = keys.map((key) => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })

    // Find the start and end points of the line
    // Lines are drawn from first to last point
    const minX = Math.min(...coords.map((c) => c.x))
    const maxX = Math.max(...coords.map((c) => c.x))
    const minY = Math.min(...coords.map((c) => c.y))
    const maxY = Math.max(...coords.map((c) => c.y))

    // Convert grid coordinates to world coordinates
    const startWorldX = minX * 10 + 5
    const startWorldY = minY * 20 + 10
    const endWorldX = maxX * 10 + 5
    const endWorldY = maxY * 20 + 10

    // Regenerate with shape's tool settings - pass settings directly
    const newData = drawLine(startWorldX, startWorldY, endWorldX, endWorldY, {
      lineStyle: targetShape.toolSettings?.lineStyle || 'single',
      lineStartStyle: targetShape.toolSettings?.lineStartStyle || 'none',
      lineEndStyle: targetShape.toolSettings?.lineEndStyle || 'arrow',
    })

    // Update the shape data using the store
    shapesStore.updateShape(shapeId, { data: newData })
    // Auto-render will handle the re-render
  } else if (targetShape.type === 'text' && targetShape.toolSettings?.content) {
    // Find the bounds of the existing text box
    const keys = Array.from(targetShape.data.keys())
    if (keys.length === 0) return

    const coords = keys.map((key) => {
      const [x, y] = (key as string).split(',').map(Number)
      return { x, y }
    })

    const minX = Math.min(...coords.map((c) => c.x))
    const maxX = Math.max(...coords.map((c) => c.x))
    const minY = Math.min(...coords.map((c) => c.y))
    const maxY = Math.max(...coords.map((c) => c.y))

    // Convert grid coordinates to world coordinates
    const startWorldX = minX * 10 + 5
    const startWorldY = minY * 20 + 10
    const endWorldX = maxX * 10 + 5
    const endWorldY = maxY * 20 + 10

    // Regenerate text with current settings
    const newData = drawText(
      startWorldX,
      startWorldY,
      endWorldX,
      endWorldY,
      targetShape.toolSettings.content,
      targetShape.toolSettings.horizontalAlign || 'left',
      targetShape.toolSettings.verticalAlign || 'top',
      targetShape.toolSettings.showBorder !== false,
    )

    // Update the shape data using the store
    shapesStore.updateShape(shapeId, { data: newData })
    // Auto-render will handle the re-render
  }
}

// Undo/Redo functionality - TODO: Implement with new store
const performUndo = () => {
  // TODO: Implement undo with new shapes store
  console.log('Undo not yet implemented with new shapes store')
}

const performRedo = () => {
  // TODO: Implement redo with new shapes store
  console.log('Redo not yet implemented with new shapes store')
}

// Canvas reset function
const resetCanvas = () => {
  console.log('[DrawingCanvas] resetCanvas called')
  if (confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
    console.log('[DrawingCanvas] User confirmed reset')
    shapesStore.clearAllShapes()

    // Reset camera to origin with default zoom
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
    saveCameraState()
    console.log('[DrawingCanvas] Camera reset to origin (0,0) with zoom 1')

    // Insert MONOBLOCKS logo as a shape
    const logoArt = [
      '███╗   ███╗ ██████╗ ███╗   ██╗ ██████╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗',
      '████╗ ████║██╔═══██╗████╗  ██║██╔═══██╗██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝',
      '██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║██║ ██║ ██║     ██║   ██║██║     █████╔╝ ',
      '██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║██║  ██║██║     ██║   ██║██║     ██╔═██╗ ',
      '██║ ╚═╝ ██║╚██████╔╝██║ ╚████║╚██████╔╝██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗',
      '╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝',
      '',
      '       M O N O S P A C E   C R E A T I V I T Y',
      '        Enterprise-grade Grid-based Workflows',
    ]

    // Create a Map for the logo data
    const logoData = new Map<string, string>()

    // Center the logo in world space (0,0 is the center)
    // Since grid coordinates can be negative, we center around (0,0)
    const logoWidth = logoArt[0].length
    const logoHeight = logoArt.length
    const startX = Math.floor(-logoWidth / 2)
    const startY = Math.floor(-logoHeight / 2)

    console.log('[DrawingCanvas] Logo dimensions:', logoWidth, 'x', logoHeight)
    console.log('[DrawingCanvas] Logo position (grid):', startX, startY)

    // Add each character to the map
    logoArt.forEach((line, y) => {
      for (let x = 0; x < line.length; x++) {
        const char = line[x]
        if (char && char !== ' ') {
          const gridX = startX + x
          const gridY = startY + y
          const key = `${gridX},${gridY}`
          logoData.set(key, char)
        }
      }
    })

    console.log('[DrawingCanvas] Logo data size:', logoData.size, 'characters')

    // Add the logo as a shape with a nice color
    const logoShape = shapesStore.addShape('text', logoData, '#4A90E2', 'MONOBLOCKS Logo', {
      content: 'MONOBLOCKS Logo',
      isLogo: true,
    })

    console.log('[DrawingCanvas] Logo shape added:', logoShape)
    console.log('[DrawingCanvas] Total shapes in store:', shapesStore.getAllShapes().length)

    toastStore.showToast('Canvas cleared - MONOBLOCKS logo added', 'info')

    // Force a render after a short delay to ensure everything is ready
    setTimeout(() => {
      console.log('[DrawingCanvas] Forcing render after logo addition')
      forceRender()
    }, 100)
  } else {
    console.log('[DrawingCanvas] User cancelled reset')
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
        files: [file],
      })
      toastStore.showToast('Shared successfully', 'success')
    } else {
      // Fallback to copying to clipboard
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
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

// Context menu handlers
const handleContextMenu = (x: number, y: number, shapeId: string | null) => {
  contextMenuPosition.value = { x, y }
  contextMenuShapeId.value = shapeId
  showContextMenu.value = true
}

const closeContextMenu = () => {
  showContextMenu.value = false
  contextMenuShapeId.value = null
  render() // Re-render after closing menu
}

// Setup mouse and keyboard events
const setupEventListeners = () => {
  if (!canvasRef.value || !ctx) return

  // Mouse event callbacks
  const mouseCallbacks = {
    onRender: render,
    screenToWorld,
    worldToScreen,
    onContextMenu: handleContextMenu,
  }

  // Initialize mouse events with drawing states
  const drawingStates = {
    rectangleState,
    diamondState,
    lineState,
    textState,
    currentStrokeData,
    placeCharacter,
    eraseAtPosition,
    drawRectangle,
    drawDiamond,
    drawLine,
    resetPencilTracking,
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
    drawText,
  )

  // Setup keyboard shortcuts
  const keyboardCallbacks = {
    onUndo: performUndo,
    onRedo: performRedo,
    onRender: render,
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
      gridKey,
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
                requestRender()
                toastStore.showToast('View recentered', 'success')
              },
            },
          ],
        )
      }
    }

    checkCameraPosition()

    // Setup event listeners
    const cleanupEvents = setupEventListeners()

    // Auto-render system handles rendering via events - no need for global functions

    // Auto-render system will handle initial render

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
})
</script>

<template>
  <canvas ref="canvasRef" class="drawing-canvas"></canvas>

  <!-- Context Menu -->
  <ContextMenu
    v-if="showContextMenu"
    :x="contextMenuPosition.x"
    :y="contextMenuPosition.y"
    :shape-id="contextMenuShapeId"
    @close="closeContextMenu"
  />
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
