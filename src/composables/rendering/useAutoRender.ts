import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { useShapesStore } from '@/stores/shapes'
import type { ShapeEventListener } from '@/stores/shapes'

export interface AutoRenderOptions {
  /**
   * Debounce delay in milliseconds to prevent excessive renders
   */
  debounceMs?: number
  
  /**
   * Whether to render immediately on mount
   */
  renderOnMount?: boolean
  
  /**
   * Custom render function. If not provided, will call window.renderCanvas
   */
  renderFn?: () => void
}

export function useAutoRender(options: AutoRenderOptions = {}) {
  const {
    debounceMs = 16, // ~60fps
    renderOnMount = true,
    renderFn
  } = options
  
  const shapesStore = useShapesStore()
  const isRendering = ref(false)
  const renderRequests = ref(0)
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let unsubscribe: (() => void) | null = null
  
  const defaultRenderFn = () => {
    // Use global render function if available
    if (typeof window !== 'undefined' && (window as any).renderCanvas) {
      (window as any).renderCanvas()
    }
  }
  
  const performRender = () => {
    if (isRendering.value) return
    
    isRendering.value = true
    renderRequests.value++
    
    try {
      const actualRenderFn = renderFn || defaultRenderFn
      actualRenderFn()
    } catch (error) {
      console.error('Error during auto-render:', error)
    } finally {
      isRendering.value = false
    }
  }
  
  const requestRender = () => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    // Schedule new render
    debounceTimer = setTimeout(performRender, debounceMs)
  }
  
  const handleShapeEvent: ShapeEventListener = (event) => {
    // Only render on events that affect visual output
    if (event.type === 'render:required' ||
        event.type === 'shape:added' ||
        event.type === 'shape:removed' ||
        event.type === 'shape:updated' ||
        event.type === 'shape:reordered' ||
        event.type === 'shape:selected' ||
        event.type === 'shape:cleared' ||
        event.type === 'group:updated') {
      requestRender()
    }
  }
  
  const forceRender = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    performRender()
  }
  
  onMounted(() => {
    // Subscribe to shape events
    unsubscribe = shapesStore.addEventListener(handleShapeEvent)
    
    // Initial render if requested
    if (renderOnMount) {
      requestRender()
    }
  })
  
  onUnmounted(() => {
    // Clean up event listener
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    
    // Clear any pending renders
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  })
  
  return {
    isRendering: readonly(isRendering),
    renderRequests: readonly(renderRequests),
    requestRender,
    forceRender,
  }
}