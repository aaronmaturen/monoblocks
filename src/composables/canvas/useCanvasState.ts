import { ref, reactive } from 'vue'
import { useShapesStore } from '@/stores/shapes'

export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface Mouse {
  x: number
  y: number
  isDragging: boolean
  lastX: number
  lastY: number
}

export function useCanvasState() {
  const shapesStore = useShapesStore()
  
  // Canvas ref
  const canvasRef = ref<HTMLCanvasElement>()

  // Camera/viewport state
  const camera = reactive<Camera>({
    x: 0,      // camera position in world space
    y: 0,
    zoom: 1,   // zoom level (1 = 100%, 0.5 = 50%, 2 = 200%)
  })

  // Mouse/interaction state
  const mouse = reactive<Mouse>({
    x: 0,
    y: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  })

  // Camera persistence functions
  const saveCameraState = () => {
    try {
      const cameraState = {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom
      }
      localStorage.setItem('monoblocks-professional-camera', JSON.stringify(cameraState))
    } catch (error) {
      console.warn('Failed to save camera state:', error)
    }
  }

  const loadCameraState = () => {
    try {
      const stored = localStorage.getItem('monoblocks-professional-camera')
      if (stored) {
        const state = JSON.parse(stored)
        camera.x = state.x || 0
        camera.y = state.y || 0
        camera.zoom = state.zoom || 1
        return true
      }
    } catch (error) {
      console.warn('Failed to load camera state:', error)
    }
    return false
  }

  // Reset camera view
  const resetView = () => {
    camera.x = 0
    camera.y = 0
    camera.zoom = 1
    saveCameraState()
    // Trigger a render via the event system
    shapesStore.emit({ type: 'render:required' })
  }

  // Pan functions
  const panCamera = (deltaX: number, deltaY: number) => {
    camera.x -= deltaX / camera.zoom
    camera.y -= deltaY / camera.zoom
    saveCameraState()
  }

  // Zoom functions
  const zoomAt = (worldX: number, worldY: number, zoomFactor: number) => {
    const oldZoom = camera.zoom
    camera.zoom *= zoomFactor
    
    // Clamp zoom to reasonable range
    camera.zoom = Math.max(0.1, Math.min(10, camera.zoom))
    
    // Adjust camera position to zoom around the specified world point
    const actualZoomFactor = camera.zoom / oldZoom
    camera.x = worldX + (camera.x - worldX) / actualZoomFactor
    camera.y = worldY + (camera.y - worldY) / actualZoomFactor
    
    saveCameraState()
  }

  // Viewport calculations
  const getViewportBounds = () => {
    if (!canvasRef.value) return null
    
    const canvas = canvasRef.value
    const topLeft = screenToWorld(0, 0)
    const bottomRight = screenToWorld(canvas.width, canvas.height)
    
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    }
  }

  // Convert screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!canvasRef.value) return { x: 0, y: 0 }
    
    const canvas = canvasRef.value
    return {
      x: (screenX - canvas.width / 2) / camera.zoom + camera.x,
      y: (screenY - canvas.height / 2) / camera.zoom + camera.y
    }
  }

  // Convert world coordinates to screen coordinates
  const worldToScreen = (worldX: number, worldY: number) => {
    if (!canvasRef.value) return { x: 0, y: 0 }
    
    const canvas = canvasRef.value
    return {
      x: (worldX - camera.x) * camera.zoom + canvas.width / 2,
      y: (worldY - camera.y) * camera.zoom + canvas.height / 2
    }
  }

  return {
    // Refs
    canvasRef,
    
    // State
    camera,
    mouse,
    
    // Functions
    saveCameraState,
    loadCameraState,
    resetView,
    panCamera,
    zoomAt,
    getViewportBounds,
    screenToWorld,
    worldToScreen,
  }
}